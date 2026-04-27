import { Redirect } from "expo-router";
import { useAuth } from "@clerk/expo";

export default function Index() {
  const { isSignedIn, isLoaded } = useAuth();
  if (!isLoaded) return null;
  return isSignedIn ? <Redirect href="/(home)" /> : <Redirect href="/(auth)/sign-in" />;
}
