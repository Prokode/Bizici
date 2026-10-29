import { useCallback, useRef, useState } from "react";
import { Alert } from "react-native";
import { useAuth } from "@clerk/expo";
import { router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { getCatalogLikes, setCatalogLike, type CatalogLikeState } from "@workspace/api-client-react";

export type CatalogKind = "product" | "service";
const emptyLike = { likeCount: 0, likedByMe: false };

export function useCatalogLikes(shopId: string, returnTo: string) {
  const { userId, isLoaded, isSignedIn } = useAuth();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const queryKey = ["catalog-likes", shopId, userId ?? "anonymous"];
  const pending = useRef(new Set<string>());
  const [, render] = useState(0);
  const query = useQuery({
    queryKey,
    queryFn: ({ signal }) => getCatalogLikes(shopId, { signal }),
    enabled: !!shopId && !!isLoaded,
    staleTime: 0,
    refetchOnMount: "always",
    refetchInterval: 30_000,
  });
  const getLike = (kind: CatalogKind, id: string) =>
    query.data?.items.find(item => item.kind === kind && item.id === id) ?? emptyLike;

  const toggle = useCallback((kind: CatalogKind, id: string) => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      router.push(`/(auth)/sign-in?next=${encodeURIComponent(returnTo)}` as never);
      return;
    }
    if (!query.data || query.isError) {
      void query.refetch();
      return;
    }
    const key = `${kind}:${id}`;
    if (pending.current.has(key)) return;
    const liked = !(query.data.items.find(item => item.kind === kind && item.id === id)?.likedByMe ?? false);
    pending.current.add(key);
    render(value => value + 1);
    void (async () => {
      try {
        const saved = await setCatalogLike(kind, id, { liked });
        // Stop an older background response from replacing the accepted vote.
        await queryClient.cancelQueries({ queryKey, exact: true });
        queryClient.setQueryData<{ items: CatalogLikeState[] }>(queryKey, current => ({
          items: [...(current?.items ?? []).filter(item => !(item.id === id && item.kind === kind)), saved],
        }));
        // Refresh every mounted representation, including the provider route.
        void queryClient.invalidateQueries({ queryKey: ["catalog-likes", shopId] });
      } catch {
        Alert.alert(t("common.error"), t("catalog.likesError"));
      } finally {
        pending.current.delete(key);
        render(value => value + 1);
      }
    })();
  }, [isLoaded, isSignedIn, query.data, query.isError, query.refetch, queryClient, shopId, userId, returnTo, t]);

  return {
    getLike, toggle,
    isPending: (kind: CatalogKind, id: string) => pending.current.has(`${kind}:${id}`),
    isLoading: !isLoaded || query.isLoading,
    isError: query.isError,
    refetch: () => { void query.refetch(); },
  };
}
