import { useEffect, useState } from "react";
import { Redirect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { ONBOARDING_SEEN_KEY } from "./onboarding";

export default function Index() {
  const [seen, setSeen] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_SEEN_KEY)
      .then((v) => setSeen(v === "1"))
      .catch(() => setSeen(true));
  }, []);

  if (seen === null) return null;
  return seen ? <Redirect href="/(tabs)" /> : <Redirect href="/onboarding" />;
}
