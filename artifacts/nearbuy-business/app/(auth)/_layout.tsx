import { Stack, Redirect } from "expo-router";
import { useAuth } from "@clerk/expo";

export default function AuthLayout() {
  const { isSignedIn, isLoaded } = useAuth();
  if (!isLoaded) return null;
  if (isSignedIn) return <Redirect href="/(home)" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
