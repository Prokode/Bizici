export function isRemotePhoto(uri: string): boolean {
  try { return ["http:", "https:"].includes(new URL(uri).protocol); }
  catch { return false; }
}

/**
 * Resolve all photos before any product write. Cache successes so a failed
 * second upload or product save can be retried without uploading duplicates.
 */
export async function prepareProductPhotos(
  photos: readonly string[],
  upload: (uri: string) => Promise<string>,
  uploaded: Map<string, string>,
): Promise<string[]> {
  const result: string[] = [];
  for (const uri of photos) {
    if (isRemotePhoto(uri)) { result.push(uri); continue; }
    let remote = uploaded.get(uri);
    if (!remote) {
      remote = await upload(uri);
      if (!isRemotePhoto(remote)) throw new Error("Upload did not return a public image URL");
      uploaded.set(uri, remote);
    }
    result.push(remote);
  }
  return result;
}
