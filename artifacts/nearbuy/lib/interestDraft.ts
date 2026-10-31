import AsyncStorage from "@react-native-async-storage/async-storage";

export const INTEREST_DRAFT_KEY = "nearbuy.consumer.interests.draft.v1";
export const INTEREST_DRAFT_DONE_KEY = "nearbuy.consumer.interests.draft.done.v1";
export const INTEREST_DRAFT_OWNER_KEY = "nearbuy.consumer.interests.draft.owner.v1";

export async function saveInterestDraft(categoryIds: string[]) {
  await AsyncStorage.setItem(INTEREST_DRAFT_KEY, JSON.stringify([...new Set(categoryIds)]));
}

export async function readInterestDraft(): Promise<string[] | null> {
  try {
    const raw = await AsyncStorage.getItem(INTEREST_DRAFT_KEY);
    const value: unknown = raw ? JSON.parse(raw) : null;
    return Array.isArray(value) && value.every((item) => typeof item === "string") ? value : null;
  } catch {
    return null;
  }
}
