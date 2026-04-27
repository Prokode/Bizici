import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, shopsTable, productsTable } from "@workspace/db";
import {
  CreateProductBody,
  UpdateProductBody,
  AnalyzeProductPhotoBody,
} from "@workspace/api-zod";
import { requireOwnerId } from "../lib/owner";
import { openai } from "../lib/openai";

const router: IRouter = Router();
router.use(requireOwnerId);

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function serializeProduct(p: typeof productsTable.$inferSelect) {
  return {
    id: p.id,
    shopId: p.shopId ?? "",
    name: p.name,
    category: p.category,
    price: p.price !== null ? Number(p.price) : null,
    tags: p.tags ?? [],
    imageUrl: p.imageUrl,
    stockStatus: (p.stockStatus ?? "in_stock") as "in_stock" | "out_of_stock",
    lastVerifiedAt: (p.lastVerifiedAt ?? new Date()).toISOString(),
  };
}

async function getOwnerShopId(ownerId: string): Promise<string | null> {
  const rows = await db
    .select({ id: shopsTable.id })
    .from(shopsTable)
    .where(eq(shopsTable.ownerId, ownerId))
    .limit(1);
  return rows[0]?.id ?? null;
}

router.get("/products", async (req, res) => {
  const shopId = await getOwnerShopId(req.ownerId);
  if (!shopId) {
    res.json([]);
    return;
  }
  const rows = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.shopId, shopId))
    .orderBy(desc(productsTable.lastVerifiedAt));
  res.json(rows.map(serializeProduct));
});

router.post("/products", async (req, res) => {
  const body = CreateProductBody.parse(req.body);
  const shopId = await getOwnerShopId(req.ownerId);
  if (!shopId) {
    res.status(400).json({ error: "Shop must be set up first" });
    return;
  }
  const [created] = await db
    .insert(productsTable)
    .values({
      shopId,
      name: body.name,
      category: body.category ?? null,
      price: body.price !== undefined && body.price !== null ? String(body.price) : null,
      tags: body.tags ?? [],
      imageUrl: body.imageUrl ?? null,
      stockStatus: body.stockStatus ?? "in_stock",
    })
    .returning();
  res.json(serializeProduct(created!));
});

router.patch("/products/:id", async (req, res) => {
  const id = req.params.id;
  if (!UUID_RE.test(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const body = UpdateProductBody.parse(req.body);
  const shopId = await getOwnerShopId(req.ownerId);
  if (!shopId) {
    res.status(404).json({ error: "Shop not found" });
    return;
  }

  const updateData: Partial<typeof productsTable.$inferInsert> = {
    lastVerifiedAt: new Date(),
  };
  if (body.name !== undefined) updateData.name = body.name;
  if (body.category !== undefined) updateData.category = body.category;
  if (body.price !== undefined) {
    updateData.price = body.price !== null ? String(body.price) : null;
  }
  if (body.tags !== undefined) updateData.tags = body.tags;
  if (body.imageUrl !== undefined) updateData.imageUrl = body.imageUrl;
  if (body.stockStatus !== undefined) updateData.stockStatus = body.stockStatus;

  const [updated] = await db
    .update(productsTable)
    .set(updateData)
    .where(and(eq(productsTable.id, id), eq(productsTable.shopId, shopId)))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  res.json(serializeProduct(updated));
});

router.delete("/products/:id", async (req, res) => {
  const id = req.params.id;
  if (!UUID_RE.test(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const shopId = await getOwnerShopId(req.ownerId);
  if (!shopId) {
    res.status(404).json({ error: "Shop not found" });
    return;
  }
  await db
    .delete(productsTable)
    .where(and(eq(productsTable.id, id), eq(productsTable.shopId, shopId)));
  res.json({ success: true });
});

router.post("/products/analyze-photo", async (req, res) => {
  const body = AnalyzeProductPhotoBody.parse(req.body);
  const cleaned = body.imageBase64.replace(/^data:image\/\w+;base64,/, "");

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 500,
    messages: [
      {
        role: "system",
        content:
          'You are an inventory assistant for a small market shop. Given a product photo, identify the product and respond ONLY with raw JSON (no prose, no markdown, no code fences) with these fields: name (short product name, max 40 chars), category (one of: Grocery, Produce, Beverage, Snacks, Apparel, Electronics, Hardware, Beauty, Household, Crafts, Other), price (estimated retail price as a number in USD, no currency symbol), tags (array of 3-6 short lowercase searchable keywords customers might use to find this product, e.g. ["water", "bottle", "drink", "cold"]).',
      },
      {
        role: "user",
        content: [
          { type: "text", text: "Identify this product." },
          {
            type: "image_url",
            image_url: { url: `data:image/jpeg;base64,${cleaned}` },
          },
        ],
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content?.trim() ?? "";
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;

  const name =
    typeof parsed?.name === "string" && parsed.name.length > 0
      ? parsed.name.slice(0, 60)
      : "Unknown product";
  const category =
    typeof parsed?.category === "string" && parsed.category.length > 0
      ? parsed.category
      : "Other";
  const price =
    typeof parsed?.price === "number" && Number.isFinite(parsed.price)
      ? Math.max(0, parsed.price)
      : 0;
  const tags = Array.isArray(parsed?.tags)
    ? parsed.tags
        .filter((t: unknown): t is string => typeof t === "string")
        .map((t: string) => t.toLowerCase().trim())
        .filter((t: string) => t.length > 0)
        .slice(0, 8)
    : [];

  res.json({ name, category, price, tags });
});

export default router;
