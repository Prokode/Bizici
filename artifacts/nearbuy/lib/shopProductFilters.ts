import type { PublicProduct } from "@/lib/api/shops";
export type ProductFilters = { name: string; category: string; color: string; size: string };
export const emptyProductFilters: ProductFilters = { name: "", category: "", color: "", size: "" };
const normalize = (value: string) => value.trim().toLocaleLowerCase();
export function filterShopProducts(products: PublicProduct[], filters: ProductFilters): PublicProduct[] {
  return products.filter(product =>
    (!filters.name || normalize(`${product.name} ${product.brand ?? ""}`).includes(normalize(filters.name))) &&
    (!filters.category || product.categories?.some(category => category.id === filters.category)) &&
    (!filters.color || product.colors?.some(color => normalize(color) === normalize(filters.color))) &&
    (!filters.size || product.sizes?.some(size => normalize(size) === normalize(filters.size))));
}
