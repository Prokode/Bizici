import * as ImagePicker from "expo-image-picker";
import { requestShopBrandPhotoUpload, setShopBrandPhoto, type Shop } from "@workspace/api-client-react";

const MAX_BYTES = 5 * 1024 * 1024;

/** Upload bytes directly to App Storage, then save only the verified public photo reference. */
export async function chooseAndUploadShopBrandPhoto(shopId: string): Promise<Shop | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
    base64: true,
  });
  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  if (asset.fileSize && asset.fileSize > MAX_BYTES) throw new Error("Photo too large");
  let bytes: Uint8Array<ArrayBuffer>;
  if (asset.base64) {
    const binary = atob(asset.base64);
    bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  } else {
    const local = await fetch(asset.uri);
    if (!local.ok) throw new Error("Cannot read selected photo");
    bytes = new Uint8Array(await local.arrayBuffer());
  }
  if (!bytes.length || bytes.length > MAX_BYTES) throw new Error("Photo too large");
  // Use file signatures, not the picker filename or a guessed extension.
  const contentType = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff ? "image/jpeg"
    : bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71 ? "image/png"
    : String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP" ? "image/webp"
    : null;
  if (!contentType) throw new Error("Unsupported photo type");
  const { uploadUrl, photoId } = await requestShopBrandPhotoUpload(shopId, { contentType, size: bytes.length });
  // Loading settings must not initialize the native binary-upload module.
  const { fetch: uploadFetch } = await import("expo/fetch");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90_000);
  try {
    const response = await uploadFetch(uploadUrl, {
      method: "PUT", headers: { "Content-Type": contentType }, body: bytes.buffer, signal: controller.signal,
    });
    if (!response.ok) throw new Error("Photo upload failed");
  } finally {
    clearTimeout(timeout);
  }
  // Never publish a local URI or display success until the server verifies the completed object.
  return setShopBrandPhoto(shopId, { photoId });
}

export function removeShopBrandPhoto(shopId: string): Promise<Shop> {
  return setShopBrandPhoto(shopId, { photoId: null });
}
