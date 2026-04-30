import { Category } from "./models/Category";

const DEFAULT_PRODUCT_CATEGORIES: Array<{
  name: string;
  slug: string;
  icon: string;
}> = [
  { name: "Vêtements", slug: "vetements", icon: "shirt" },
  { name: "Alimentation", slug: "alimentation", icon: "shopping-basket" },
  { name: "Électronique", slug: "electronique", icon: "smartphone" },
  { name: "Maison & Déco", slug: "maison-deco", icon: "home" },
  { name: "Beauté & Soins", slug: "beaute-soins", icon: "sparkles" },
  { name: "Bijoux & Accessoires", slug: "bijoux-accessoires", icon: "gem" },
  { name: "Chaussures", slug: "chaussures", icon: "footprints" },
  { name: "Autre", slug: "autre", icon: "more-horizontal" },
];

const DEFAULT_SERVICE_CATEGORIES: Array<{
  name: string;
  slug: string;
  icon: string;
}> = [
  { name: "Coiffure", slug: "coiffure", icon: "scissors" },
  { name: "Jardinage", slug: "jardinage", icon: "leaf" },
  { name: "Cours particuliers", slug: "cours-particuliers", icon: "book-open" },
  { name: "Retouches & couture", slug: "retouches-couture", icon: "edit-3" },
  { name: "Plomberie", slug: "plomberie", icon: "droplet" },
  { name: "Électricité", slug: "electricite", icon: "zap" },
  { name: "Ménage", slug: "menage", icon: "wind" },
  { name: "Garde d'enfants", slug: "garde-enfants", icon: "smile" },
  { name: "Bricolage", slug: "bricolage", icon: "tool" },
  { name: "Peinture", slug: "peinture", icon: "feather" },
];

export async function seedDefaultCategories(): Promise<void> {
  // Backfill: any pre-existing category without an explicit `kind` is a
  // product category. We set this once before inserting fresh defaults so
  // future queries that filter by kind return consistent data.
  await Category.updateMany(
    { kind: { $exists: false } },
    { $set: { kind: "product" } },
  );

  const productCount = await Category.countDocuments({ kind: "product" });
  if (productCount === 0) {
    await Category.insertMany(
      DEFAULT_PRODUCT_CATEGORIES.map((c) => ({ ...c, kind: "product" })),
    );
  }

  const serviceCount = await Category.countDocuments({ kind: "service" });
  if (serviceCount === 0) {
    await Category.insertMany(
      DEFAULT_SERVICE_CATEGORIES.map((c) => ({ ...c, kind: "service" })),
    );
  }
}
