import { Types } from "mongoose";
import { User } from "./models/User";
import { Shop } from "./models/Shop";
import { Product } from "./models/Product";
import { Category } from "./models/Category";

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

/**
 * Seeds a small set of demo shops + products around Paris so the customer
 * (NearBuy) app has something to render on the map during development.
 *
 * Idempotent: bails out if any Shop already exists. Safe to call on every boot.
 */

const PARIS = { lat: 48.8566, lng: 2.3522 };

const DEMO_SHOPS: Array<{
  name: string;
  marketName: string;
  stallInfo: string;
  offsetLat: number;
  offsetLng: number;
  products: Array<{
    name: string;
    brand?: string;
    price: number; // cents
    quantity: number;
    photo?: string;
    categorySlug?: string;
  }>;
}> = [
  {
    name: "Chez Madame Aïcha",
    marketName: "Marché des Enfants Rouges",
    stallInfo: "Allée centrale, stand 12",
    offsetLat: 0.006,
    offsetLng: 0.002,
    products: [
      {
        name: "Tomates anciennes du jardin",
        brand: "Locale",
        price: 480,
        quantity: 25,
        categorySlug: "alimentation",
      },
      {
        name: "Bouquet de basilic frais",
        price: 250,
        quantity: 12,
        categorySlug: "alimentation",
      },
      {
        name: "Olives Kalamata",
        price: 690,
        quantity: 8,
        categorySlug: "alimentation",
      },
    ],
  },
  {
    name: "L'Atelier Denim",
    marketName: "Rue du Faubourg Saint-Antoine",
    stallInfo: "Boutique 47",
    offsetLat: 0.008,
    offsetLng: -0.012,
    products: [
      {
        name: "Jean slim brut indigo",
        brand: "Atelier Denim",
        price: 8900,
        quantity: 6,
        categorySlug: "vetements",
      },
      {
        name: "Veste en jean délavé",
        brand: "Atelier Denim",
        price: 11900,
        quantity: 3,
        categorySlug: "vetements",
      },
      {
        name: "Chemise oxford bleue",
        brand: "Maison B.",
        price: 6500,
        quantity: 9,
        categorySlug: "vetements",
      },
    ],
  },
  {
    name: "Tech Corner",
    marketName: "Quartier République",
    stallInfo: "12 rue du Temple",
    offsetLat: -0.004,
    offsetLng: -0.008,
    products: [
      {
        name: "Câble USB-C tressé 2m",
        brand: "Anker",
        price: 1490,
        quantity: 30,
        categorySlug: "electronique",
      },
      {
        name: "Écouteurs Bluetooth ANC",
        brand: "Sony WF",
        price: 12900,
        quantity: 4,
        categorySlug: "electronique",
      },
      {
        name: "Ampoules LED E27 (pack de 4)",
        price: 990,
        quantity: 18,
        categorySlug: "electronique",
      },
    ],
  },
  {
    name: "Boulangerie du Coin",
    marketName: "Rue Mouffetard",
    stallInfo: "Au coin de la rue",
    offsetLat: -0.012,
    offsetLng: 0.004,
    products: [
      {
        name: "Baguette tradition",
        price: 130,
        quantity: 40,
        categorySlug: "alimentation",
      },
      {
        name: "Croissant pur beurre",
        price: 150,
        quantity: 24,
        categorySlug: "alimentation",
      },
      {
        name: "Pain au chocolat",
        price: 170,
        quantity: 18,
        categorySlug: "alimentation",
      },
    ],
  },
  {
    name: "Bijoux Nadia",
    marketName: "Marché Saint-Germain",
    stallInfo: "Stand B-08",
    offsetLat: 0.001,
    offsetLng: 0.014,
    products: [
      {
        name: "Bracelet argent perles",
        price: 4500,
        quantity: 5,
        categorySlug: "bijoux-accessoires",
      },
      {
        name: "Boucles d'oreilles dorées",
        price: 2900,
        quantity: 11,
        categorySlug: "bijoux-accessoires",
      },
    ],
  },
  {
    name: "Beauté Rose",
    marketName: "Belleville",
    stallInfo: "23 rue de Belleville",
    offsetLat: 0.014,
    offsetLng: 0.018,
    products: [
      {
        name: "Crème hydratante visage 50ml",
        brand: "Cocoon",
        price: 1890,
        quantity: 14,
        categorySlug: "beaute-soins",
      },
      {
        name: "Shampoing solide",
        brand: "Lamazuna",
        price: 990,
        quantity: 22,
        categorySlug: "beaute-soins",
      },
      {
        name: "Rouge à lèvres mat",
        price: 1290,
        quantity: 8,
        categorySlug: "beaute-soins",
      },
    ],
  },
];

export async function seedDemoShops(): Promise<{ inserted: number }> {
  // Use a synthetic seller user shared across all demo shops.
  let seller = await User.findOne({ clerkUserId: "demo-seller" }).lean();
  if (!seller) {
    const created = await User.create({
      clerkUserId: "demo-seller",
      email: "demo@nearbuy.local",
      name: "Vendeur démo",
    });
    seller = created.toObject();
  }
  const sellerId = seller._id as Types.ObjectId;

  // If the demo seller already owns the expected number of shops, do nothing.
  const existingDemoShops = await Shop.countDocuments({ sellerId });
  if (existingDemoShops >= DEMO_SHOPS.length) {
    return { inserted: 0 };
  }
  // Otherwise wipe partial demo data so we can re-seed cleanly.
  if (existingDemoShops > 0) {
    const oldShops = await Shop.find({ sellerId }).select("_id").lean();
    const oldShopIds = oldShops.map((s) => s._id);
    await Product.deleteMany({ shop: { $in: oldShopIds } });
    await Shop.deleteMany({ _id: { $in: oldShopIds } });
  }
  // Bail out if some other (non-demo) seller already populated the DB,
  // so we never collide with real production data.
  const otherShops = await Shop.countDocuments({ sellerId: { $ne: sellerId } });
  if (otherShops > 0) return { inserted: 0 };

  // Build a slug → id map for categories so we can attach products properly.
  const categories = await Category.find().lean();
  const categoryBySlug = new Map(
    categories.map((c) => [c.slug, c._id as Types.ObjectId]),
  );

  let inserted = 0;
  for (const def of DEMO_SHOPS) {
    const shop = await Shop.create({
      sellerId,
      name: def.name,
      marketName: def.marketName,
      stallInfo: def.stallInfo,
      location: {
        type: "Point",
        coordinates: [
          PARIS.lng + def.offsetLng,
          PARIS.lat + def.offsetLat,
        ],
      },
      isOpen: true,
    });

    const productDocs = def.products.map((p) => {
      const categoryId = p.categorySlug
        ? categoryBySlug.get(p.categorySlug)
        : undefined;
      return {
        shop: shop._id,
        seller: sellerId,
        name: p.name,
        slug: slugify(p.name),
        brand: p.brand ?? null,
        price: p.price,
        quantity: p.quantity,
        photos: p.photo ? [p.photo] : [],
        categories: categoryId ? [categoryId] : [],
        stockStatus: p.quantity > 0 ? ("in_stock" as const) : ("out_of_stock" as const),
        lastVerifiedAt: new Date(),
      };
    });
    // Use insertMany to bypass the model's pre-save hook (which has a
    // version-incompat issue with our Mongoose runtime); slugs are computed
    // explicitly above.
    await Product.insertMany(productDocs);
    inserted += 1;
  }

  return { inserted };
}
