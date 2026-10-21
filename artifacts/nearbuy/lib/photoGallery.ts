/** Keep the product's order and open the exact thumbnail the user selected. */
export function galleryPhotos(photos: string[] | undefined, uri: string): string[] {
  const valid = (Array.isArray(photos) ? photos : []).filter(photo => typeof photo === "string" && !!photo.trim());
  return Array.from(new Set(valid.includes(uri) ? valid : [uri, ...valid]));
}

export function gallerySwipeDirection(x: number, y: number, zoom: number, canPrevious: boolean, canNext: boolean): number {
  "worklet";
  if (zoom > 1.01 || Math.abs(x) <= 60 || Math.abs(x) <= Math.abs(y) * 1.2) return 0;
  const direction = x < 0 ? 1 : -1;
  return (direction > 0 ? canNext : canPrevious) ? direction : 0;
}
