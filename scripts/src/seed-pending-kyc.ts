/**
 * Seeds a pending KYC submission for end-to-end testing of the admin
 * Validations queue. Idempotent — safe to re-run.
 *
 * Run: pnpm --filter @workspace/scripts run seed:pending-kyc
 */
import mongoose from "mongoose";

const TEST_SELLER_EMAIL = "kyc.test.seller@nearbuy.test";
const TEST_SHOP_NAME = "Boutique Test KYC";
// 1x1 transparent PNG
const TINY_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkAAIAAAoAAv/lxKUAAAAASUVORK5CYII=" +
  // pad to >100 chars to satisfy length check
  "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

async function main(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");
  await mongoose.connect(uri, { dbName: "nearbuy" });
  console.log("Connected to MongoDB");
  const db = mongoose.connection.db!;

  const users = db.collection("users");
  const shops = db.collection("shops");
  const kycDocs = db.collection("kycdocuments");

  // Seller (idempotent on email).
  let seller = await users.findOne({ email: TEST_SELLER_EMAIL });
  if (!seller) {
    const ins = await users.insertOne({
      email: TEST_SELLER_EMAIL,
      name: "Test Seller KYC",
      clerkUserId: `test_clerk_kyc_${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    seller = await users.findOne({ _id: ins.insertedId });
    console.log(`Created test seller ${ins.insertedId}`);
  } else {
    console.log(`Reusing test seller ${seller._id}`);
  }
  if (!seller) throw new Error("seller insert failed");

  // Shop (idempotent on sellerId+name).
  let shop = await shops.findOne({ sellerId: seller._id, name: TEST_SHOP_NAME });
  const submittedAt = new Date();
  if (!shop) {
    const ins = await shops.insertOne({
      sellerId: seller._id,
      name: TEST_SHOP_NAME,
      marketName: "Marché Bastille",
      stallInfo: "Stand 7",
      kind: "products",
      members: [{ userId: seller._id, role: "seller" }],
      location: { type: "Point", coordinates: [2.3522, 48.8566] },
      kyc: {
        status: "pending",
        submittedAt,
        reviewedAt: null,
        reviewedBy: null,
        rejectionReason: null,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    shop = await shops.findOne({ _id: ins.insertedId });
    console.log(`Created test shop ${ins.insertedId}`);
  } else {
    await shops.updateOne(
      { _id: shop._id },
      {
        $set: {
          "kyc.status": "pending",
          "kyc.submittedAt": submittedAt,
          "kyc.reviewedAt": null,
          "kyc.reviewedBy": null,
          "kyc.rejectionReason": null,
        },
      },
    );
    console.log(`Reused test shop ${shop._id} (reset to pending)`);
  }
  if (!shop) throw new Error("shop insert failed");

  // KycDocument (idempotent on shopId).
  await kycDocs.findOneAndUpdate(
    { shopId: shop._id },
    {
      $set: {
        shopId: shop._id,
        sellerId: seller._id,
        documentType: "id_card",
        frontImageBase64: TINY_PNG_BASE64,
        backImageBase64: TINY_PNG_BASE64,
        submittedAt,
        status: "pending",
        reviewedAt: null,
        reviewedBy: null,
        rejectionReason: null,
      },
    },
    { upsert: true },
  );
  console.log(`KYC document upserted for shop ${shop._id}`);

  console.log(`\nSEED OK — shopId=${shop._id} sellerId=${seller._id}`);
  await mongoose.disconnect();
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
