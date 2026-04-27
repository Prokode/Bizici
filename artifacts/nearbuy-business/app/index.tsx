import { useEffect, useState } from "react";
import { Redirect } from "expo-router";
import { useAuth } from "@clerk/expo";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { ONBOARDING_SEEN_KEY } from "./onboarding";

export default function Index() {
  const { isSignedIn, isLoaded } = useAuth();
  const [onboardingSeen, setOnboardingSeen] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_SEEN_KEY)
      .then((v) => setOnboardingSeen(v === "1"))
      .catch(() => setOnboardingSeen(true));
  }, []);

  if (!isLoaded || onboardingSeen === null) return null;
  if (!onboardingSeen && !isSignedIn) return <Redirect href="/onboarding" />;
  return isSignedIn ? (
    <Redirect href="/(home)" />
  ) : (
    <Redirect href="/(auth)/sign-in" />
  );
}
