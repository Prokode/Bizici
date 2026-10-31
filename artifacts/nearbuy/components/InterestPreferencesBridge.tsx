import React, { useEffect } from "react";
import { useAuth } from "@clerk/expo";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetMyInterestsQueryKey,
  setMyInterests,
  useGetMyInterests,
} from "@workspace/api-client-react";
import { INTEREST_DRAFT_DONE_KEY, INTEREST_DRAFT_KEY, INTEREST_DRAFT_OWNER_KEY, readInterestDraft } from "@/lib/interestDraft";
import AsyncStorage from "@react-native-async-storage/async-storage";

export function InterestPreferencesBridge() {
  const { isLoaded, isSignedIn, userId, getToken } = useAuth();
  const queryClient = useQueryClient();
  const interests = useGetMyInterests({ query: { enabled: !!isLoaded && !!isSignedIn && !!userId, queryKey: [...getGetMyInterestsQueryKey(), userId ?? "signed-out"] } });
  useEffect(() => {
    if (!isLoaded || !isSignedIn || !userId || !interests.data) return;
    if (interests.data.configured) {
      void AsyncStorage.multiRemove([INTEREST_DRAFT_KEY, INTEREST_DRAFT_DONE_KEY, INTEREST_DRAFT_OWNER_KEY]);
      return;
    }
    let cancelled = false;
    void (async () => {
      const done = await AsyncStorage.getItem(INTEREST_DRAFT_DONE_KEY);
      const draft = await readInterestDraft();
      if (cancelled || done !== "1" || draft === null) return;
      const owner = await AsyncStorage.getItem(INTEREST_DRAFT_OWNER_KEY);
      if (cancelled) return;
      if (owner && owner !== userId) {
        await AsyncStorage.multiRemove([INTEREST_DRAFT_KEY, INTEREST_DRAFT_DONE_KEY, INTEREST_DRAFT_OWNER_KEY]);
        return;
      }
      await AsyncStorage.setItem(INTEREST_DRAFT_OWNER_KEY, userId);
      if (cancelled) return;
      try {
        const token = await getToken();
        if (cancelled || !token) return;
        const result = await setMyInterests(
          { categoryIds: draft },
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (cancelled) return;
        queryClient.setQueryData([...getGetMyInterestsQueryKey(), userId], result);
        await AsyncStorage.removeItem(INTEREST_DRAFT_KEY);
        await AsyncStorage.multiRemove([INTEREST_DRAFT_DONE_KEY, INTEREST_DRAFT_OWNER_KEY]);
      } catch {
        // Keep the local draft so a later visit can retry without disrupting browsing.
      }
    })();
    return () => { cancelled = true; };
  }, [getToken, interests.data, isLoaded, isSignedIn, queryClient, userId]);
  return null;
}
