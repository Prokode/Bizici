import { useEffect, useRef, useState } from "react";
import { useReverification, useSession, useUser } from "@clerk/expo";
import type { SessionVerificationLevel } from "@clerk/expo/types";
import { useTranslation } from "react-i18next";
import {
  attemptVerification, passwordError, passwordValidation, prepareVerification,
  verificationChoices, type VerificationChoice, type SessionVerificationResource,
} from "@/lib/passwordSecurity";

type Challenge = { complete: () => void; cancel: () => void; level?: SessionVerificationLevel };
type Verification = {
  phase: "choose" | "code";
  factors: { id: string; label: string }[];
  selectedLabel?: string;
  inputIsPassword: boolean;
  canResend: boolean;
  retryAfter: number;
};

export function useAddPassword() {
  const { user, isLoaded, isSignedIn } = useUser();
  const { session } = useSession();
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [verification, setVerification] = useState<Verification | null>(null);
  const challenge = useRef<Challenge | null>(null);
  const choices = useRef<VerificationChoice[]>([]);
  const selected = useRef<VerificationChoice | null>(null);
  const submitting = useRef(false);
  const cancelled = useRef(false);
  const networking = useRef(false);
  const active = useRef(true);
  const epoch = useRef(0);
  const resendAt = useRef(0);

  // Cancel pending SDK continuations on navigation/sign-out; never persist credentials.
  useEffect(() => {
    active.current = true;
    setError(null);
    setSuccess(false);
    setVerification(null);
    return () => {
      active.current = false;
      cancelled.current = true;
      epoch.current++;
      challenge.current?.cancel();
      challenge.current = null;
      selected.current = null;
      choices.current = [];
    };
  }, [user?.id]);

  useEffect(() => {
    if (!verification?.canResend) return;
    const timer = setInterval(() => {
      setVerification(current => current ? {
        ...current, retryAfter: Math.max(0, Math.ceil((resendAt.current - Date.now()) / 1000)),
      } : null);
    }, 1000);
    return () => clearInterval(timer);
  }, [verification?.canResend]);

  const label = (choice: VerificationChoice) => {
    const factor = choice.factor;
    switch (factor.strategy) {
      case "email_code": return t("security.verifyEmail", { target: factor.safeIdentifier });
      case "phone_code": return t("security.verifyPhone", { target: factor.safeIdentifier });
      case "password": return t("security.verifyPassword");
      case "totp": return t("security.verifyTotp");
      case "backup_code": return t("security.verifyBackup");
    }
  };

  const acceptResource = (resource: SessionVerificationResource) => {
    if (resource.status === "complete") {
      const pending = challenge.current;
      challenge.current = null;
      selected.current = null;
      choices.current = [];
      setVerification(null);
      // Only the server's complete status authorizes the SDK to retry.
      pending?.complete();
      return;
    }
    choices.current = verificationChoices(resource);
    selected.current = null;
    setVerification({
      phase: "choose",
      factors: choices.current.map(choice => ({ id: choice.id, label: label(choice) })),
      inputIsPassword: false, canResend: false, retryAfter: 0,
    });
    if (!choices.current.length) setError(t("security.verificationUnavailable"));
  };

  const updatePassword = useReverification(
    async (newPassword: string) => {
      if (!user || !session) throw new Error("Session unavailable");
      // This is an add-only flow. Never overwrite a password set in another session.
      const current = await user.reload();
      if (current.passwordEnabled) throw new Error("Password already exists");
      return current.updatePassword({ newPassword, signOutOfOtherSessions: false });
    },
    {
      onNeedsReverification: async (pending) => {
        if (!active.current || !session) { pending.cancel(); return; }
        challenge.current = pending;
        const requestEpoch = ++epoch.current;
        networking.current = true;
        setBusy(true);
        try {
          const resource = await session.startVerification({ level: pending.level ?? "first_factor" });
          if (active.current && requestEpoch === epoch.current) acceptResource(resource);
        } catch {
          if (active.current && requestEpoch === epoch.current) {
            setError(t("security.verificationUnavailable"));
            setVerification({ phase: "choose", factors: [], inputIsPassword: false, canResend: false, retryAfter: 0 });
          }
        } finally {
          networking.current = false;
          if (active.current) setBusy(!challenge.current && submitting.current);
        }
      },
    },
  );

  const submit = async (password: string, confirmation: string) => {
    if (submitting.current || networking.current) return;
    setError(null);
    const invalid = passwordValidation(password, confirmation);
    if (invalid) { setError(t(`security.${invalid}`)); return; }
    if (!user || !session) { setError(t("security.sessionExpired")); return; }
    if (user.passwordEnabled) { setError(t("security.alreadySet")); return; }
    if (!user.primaryEmailAddress) { setError(t("security.noEmail")); return; }
    submitting.current = true;
    cancelled.current = false;
    setBusy(true);
    try {
      const result = await updatePassword(password);
      if (!active.current || cancelled.current || !result) return;
      if (!result.passwordEnabled) throw new Error("Password was not saved");
      setSuccess(true);
      setError(null);
    } catch (failure) {
      // A cancelled verification is not a failed password update.
      if (active.current && !cancelled.current) {
        setError(t(`security.${passwordError(failure)}`));
      }
    } finally {
      submitting.current = false;
      if (active.current) setBusy(false);
    }
  };

  const cancelVerification = () => {
    cancelled.current = true;
    epoch.current++;
    const pending = challenge.current;
    challenge.current = null;
    choices.current = [];
    selected.current = null;
    setVerification(null);
    setError(null);
    pending?.cancel();
  };

  const chooseFactor = async (id: string) => {
    if (!session || networking.current || !challenge.current) return;
    const choice = choices.current.find(item => item.id === id);
    if (!choice) return;
    const requestEpoch = epoch.current;
    networking.current = true;
    setBusy(true);
    setError(null);
    try {
      await prepareVerification(session, choice);
      if (!active.current || requestEpoch !== epoch.current) return;
      selected.current = choice;
      const canResend = ["email_code", "phone_code"].includes(choice.factor.strategy);
      resendAt.current = canResend ? Date.now() + 30_000 : 0;
      setVerification({
        phase: "code", factors: [], selectedLabel: label(choice),
        inputIsPassword: choice.factor.strategy === "password",
        canResend, retryAfter: canResend ? 30 : 0,
      });
    } catch {
      if (active.current && requestEpoch === epoch.current) setError(t("security.verificationFailed"));
    } finally {
      networking.current = false;
      if (active.current) setBusy(!challenge.current && submitting.current);
    }
  };

  const verify = async (value: string) => {
    const choice = selected.current;
    if (!session || !choice || !challenge.current || networking.current) return;
    if (!value.trim()) { setError(t("security.invalidCode")); return; }
    const requestEpoch = epoch.current;
    networking.current = true;
    setBusy(true);
    setError(null);
    try {
      const resource = await attemptVerification(session, choice, value);
      if (active.current && requestEpoch === epoch.current) acceptResource(resource);
    } catch {
      if (active.current && requestEpoch === epoch.current) setError(t("security.invalidCode"));
    } finally {
      networking.current = false;
      if (active.current) setBusy(!challenge.current && submitting.current);
    }
  };

  const resend = async () => {
    if (Date.now() < resendAt.current || !verification?.canResend || !selected.current) return;
    await chooseFactor(selected.current.id);
  };

  return {
    isLoaded, isSignedIn: !!isSignedIn,
    email: user?.primaryEmailAddress?.emailAddress,
    hasPassword: !!user?.passwordEnabled, busy, error, success, verification,
    submit, chooseFactor, verify, resend, cancelVerification,
  };
}
