import { useTranslation } from "react-i18next";
import { getPrivacyDoc, type LegalLang } from "@workspace/legal-content";
import { LegalDocView } from "@/components/LegalDocView";

export default function PrivacyPage() {
  const { i18n } = useTranslation();
  const lang: LegalLang = i18n.language?.startsWith("en") ? "en" : "fr";
  return <LegalDocView doc={getPrivacyDoc(lang)} testIdPrefix="privacy" />;
}
