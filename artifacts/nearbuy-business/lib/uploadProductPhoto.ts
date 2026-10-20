import { Platform } from "react-native";
import { File } from "expo-file-system";
import { fetch as expoFetch } from "expo/fetch";
import { requestProductPhotoUpload, completeProductPhotoUpload, type RequestProductPhotoUploadBodyContentType } from "@workspace/api-client-react";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function uploadProductPhoto(shopId: string, uri: string): Promise<string> {
  // Blob/data URIs on web; file/content URIs on native. Never send these to the API.
  let body: Blob | File;
  if (Platform.OS === "web") {
    const response = await fetch(uri);
    if (!response.ok) throw new Error("Selected photo is no longer accessible");
    body = await response.blob();
  } else {
    const file = new File(uri);
    if (!file.exists) throw new Error("Selected photo is no longer on this device");
    body = file;
  }
  const contentType = body.type || "image/jpeg";
  if (!ALLOWED_TYPES.includes(contentType) || body.size < 1 || body.size > MAX_BYTES) {
    throw new Error("Select a JPEG, PNG, WebP or GIF image smaller than 10 MB");
  }
  const requestOptions = { method: "POST", timeoutMs: 30_000 };
  const { uploadId, uploadURL } = await requestProductPhotoUpload(
    shopId, { contentType: contentType as RequestProductPhotoUploadBodyContentType, size: body.size }, requestOptions,
  );
  // No API client here: bearer tokens must never be forwarded to the signed URL.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 90_000);
  try {
    const response = await (Platform.OS === "web" ? fetch : expoFetch)(uploadURL, {
      method: "PUT", headers: { "Content-Type": contentType }, body,
      signal: controller.signal,
    });
    if (!response.ok) throw new Error("Photo upload failed");
  } finally {
    clearTimeout(timer);
  }
  const completionOptions = { method: "POST", timeoutMs: 30_000 };
  const { photoPath } = await completeProductPhotoUpload(shopId, uploadId, completionOptions);
  // Use the same API origin as _layout, not the Expo bundle/Metro origin.
  const origin = process.env.EXPO_PUBLIC_DOMAIN
    ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
    : Platform.OS === "web" ? window.location.origin : null;
  if (!origin) throw new Error("API origin is not configured");
  return new URL(photoPath, origin).href;
}
