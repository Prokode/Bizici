export type CatalogItem = {
  id: string;
  createdAt?: string | null;
};

export type CatalogLikeValue = {
  likeCount: number;
  likedByMe: boolean;
};

/** Newest first; a stable id tie-break keeps catalog order deterministic. */
export function sortCatalogNewest<T extends CatalogItem>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => {
    const timeA = a.createdAt ? Date.parse(a.createdAt) : 0;
    const timeB = b.createdAt ? Date.parse(b.createdAt) : 0;
    const safeA = Number.isFinite(timeA) ? timeA : 0;
    const safeB = Number.isFinite(timeB) ? timeB : 0;
    return safeB - safeA || a.id.localeCompare(b.id);
  });
}

export function sortCatalogMostLiked<T extends CatalogItem>(
  items: readonly T[],
  getLike: (item: T) => CatalogLikeValue,
): T[] {
  return items
    .filter((item) => getLike(item).likeCount > 0)
    .sort((a, b) => getLike(b).likeCount - getLike(a).likeCount || a.id.localeCompare(b.id));
}

export function filterCatalogCategory<T extends { categories?: readonly { id: string }[] }>(
  items: readonly T[],
  categoryId: string,
): T[] {
  if (!categoryId) return [...items];
  return items.filter((item) => item.categories?.some((category) => category.id === categoryId));
}
