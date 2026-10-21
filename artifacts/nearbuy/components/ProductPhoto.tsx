import React from "react";
import { type ImageProps } from "react-native";
import { ZoomablePhoto } from "@/components/ZoomablePhoto";
import { fetchShopDetail } from "@/lib/api/shops";

/** Search/map responses contain only a thumbnail; resolve the actual product gallery on tap. */
export function ProductPhoto({ shopId, productId, ...props }: ImageProps & { shopId: string; productId: string }) {
  return <ZoomablePhoto {...props} loadPhotos={async signal => {
    const detail = await fetchShopDetail(shopId, { signal });
    const product = detail.products.find(item => item.id === productId);
    if (!product) throw new Error("Product no longer available");
    return product.photos;
  }} />;
}
