import { Category } from "./models/Category";

const DEFAULT_CATEGORIES: Array<{ name: string; slug: string; icon: string }> = [
  { name: "Vêtements", slug: "vetements", icon: "shirt" },
  { name: "Alimentation", slug: "alimentation", icon: "shopping-basket" },
  { name: "Électronique", slug: "electronique", icon: "smartphone" },
  { name: "Maison & Déco", slug: "maison-deco", icon: "home" },
  { name: "Beauté & Soins", slug: "beaute-soins", icon: "sparkles" },
  { name: "Bijoux & Accessoires", slug: "bijoux-accessoires", icon: "gem" },
  { name: "Chaussures", slug: "chaussures", icon: "footprints" },
  { name: "Autre", slug: "autre", icon: "more-horizontal" },
];

export async function seedDefaultCategories(): Promise<void> {
  const count = await Category.estimatedDocumentCount();
  if (count > 0) return;
  await Category.insertMany(DEFAULT_CATEGORIES);
}
