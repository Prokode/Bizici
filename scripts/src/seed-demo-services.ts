/**
 * One-shot demo seeder. Inserts a single service shop with a provider profile
 * and a coiffure service, located in central Paris. Idempotent — safe to run
 * multiple times. Run via
 * `pnpm --filter @workspace/scripts run seed:demo-services`.
 *
 * NOTE: We talk to the raw MongoDB collections (not via @workspace/db) because
 * lib/db relies on `import { models } from "mongoose"` which the pure-ESM tsx
 * loader can't resolve at runtime. Documents still match the production
 * Mongoose schemas — see lib/db/src/models/{Shop,Service,User,Category}.ts.
 */
import mongoose from "mongoose";

const DEMO_SELLER_EMAIL = "demo.coiffeuse@nearbuy.test";
const DEMO_SHOP_NAME = "Salon Anaïs";
// Châtelet, Paris.
const DEMO_LNG = 2.3471;
const DEMO_LAT = 48.8589;

async function main(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");
  await mongoose.connect(uri, { dbName: "nearbuy" });
  console.log("Connected to MongoDB");
  const db = mongoose.connection.db!;

  const users = db.collection("users");
  const shops = db.collection("shops");
  const services = db.collection("services");
  const categories = db.collection("categories");

  // 1) Demo seller user (idempotent on email).
  let seller = await users.findOne({ email: DEMO_SELLER_EMAIL });
  if (!seller) {
    const ins = await users.insertOne({
      email: DEMO_SELLER_EMAIL,
      name: "Anaïs Demo",
      clerkId: "demo_clerk_id_anais",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    seller = await users.findOne({ _id: ins.insertedId });
    console.log(`Created demo seller ${ins.insertedId}`);
  } else {
    console.log(`Reusing demo seller ${seller._id}`);
  }
  if (!seller) throw new Error("seller insert failed");

  // 2) Demo service shop (idempotent on sellerId+name).
  let shop = await shops.findOne({
    sellerId: seller._id,
    name: DEMO_SHOP_NAME,
  });
  if (!shop) {
    const ins = await shops.insertOne({
      sellerId: seller._id,
      name: DEMO_SHOP_NAME,
      marketName: null,
      stallInfo: null,
      kind: "services",
      location: { type: "Point", coordinates: [DEMO_LNG, DEMO_LAT] },
      isOpen: true,
      serviceProvider: {
        firstName: "Anaïs",
        lastName: "M.",
        age: 32,
        hideAge: false,
        bio: "Coiffeuse passionnée, spécialisée dans les colorations végétales et coupes modernes. Plus de 10 ans d'expérience à votre service.",
        photoUrl: null,
        yearsExperience: 10,
        certifications: [
          "CAP Coiffure",
          "BP Coiffure",
          "Coloriste certifiée L'Oréal",
        ],
        serviceRadiusKm: 8,
        portfolioPhotos: [],
        isVerified: true,
      },
      ratingAvg: 4.7,
      ratingCount: 23,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    shop = await shops.findOne({ _id: ins.insertedId });
    console.log(`Created demo shop ${ins.insertedId}`);
  } else {
    console.log(`Reusing demo shop ${shop._id}`);
  }
  if (!shop) throw new Error("shop insert failed");

  // 3) Find the coiffure category.
  const coiffure = await categories.findOne({
    kind: "service",
    slug: "coiffure",
  });
  if (!coiffure) {
    throw new Error(
      "'coiffure' service category missing — boot the api-server to seed defaults first",
    );
  }

  // 4) A handful of services on the shop (idempotent on title).
  const seedServices = [
    {
      title: "Coupe + brushing femme",
      description:
        "Coupe personnalisée selon votre morphologie, suivie d'un brushing professionnel.",
      pricingType: "fixed" as const,
      price: 45,
      durationMinutes: 60,
      tags: ["coupe", "femme", "brushing"],
    },
    {
      title: "Coloration végétale",
      description:
        "Coloration 100% végétale, sans ammoniaque, respectueuse du cuir chevelu.",
      pricingType: "hourly" as const,
      price: 55,
      durationMinutes: 90,
      tags: ["couleur", "végétal"],
    },
    {
      title: "Conseil mariage / événement",
      description:
        "Préparation complète pour vos événements (essai + jour J).",
      pricingType: "quote" as const,
      price: null,
      durationMinutes: null,
      tags: ["mariage", "événement"],
    },
  ];

  for (const s of seedServices) {
    const exists = await services.findOne({ shop: shop._id, title: s.title });
    if (exists) {
      console.log(`  · Service "${s.title}" already exists`);
      continue;
    }
    await services.insertOne({
      shop: shop._id,
      seller: seller._id,
      title: s.title,
      slug: null,
      description: s.description,
      categories: [coiffure._id],
      pricingType: s.pricingType,
      price: s.price,
      durationMinutes: s.durationMinutes,
      photos: [],
      tags: s.tags,
      isActive: true,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log(`  · Created service "${s.title}"`);
  }

  console.log("Done.");
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
