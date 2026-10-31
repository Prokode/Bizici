import type { RequestHandler } from "express";
import { Types } from "mongoose";
import { AppNotification, ShopFavorite, User, Shop, Category, Country, Product, Service } from "@workspace/db";
import { sendPushToUsers } from "./push";
import { logger } from "./logger";

type Kind = "product" | "service";
type Action = "created" | "updated" | "deleted";
type Notice = {
  eventKey: string; type: "chat_message" | "catalog_change"; title: string; body: string;
  shopId: string; conversationId?: string; itemId?: string; itemKind?: Kind; action?: Action;
};

/** Store first, then send one push per newly inserted recipient (all their devices). */
export async function notifyUsers(userIds: string[], notice: Notice): Promise<void> {
  const ids = [...new Set(userIds)].filter((id) => Types.ObjectId.isValid(id));
  for (let start = 0; start < ids.length; start += 500) {
    const rows = ids.slice(start, start + 500).map((userId) => ({ ...notice, userId }));
    let inserted: Array<{ userId: unknown }> = [];
    try {
      inserted = await AppNotification.insertMany(rows, { ordered: false });
    } catch (error) {
      const failure = error as { code?: number; insertedDocs?: Array<{ userId: unknown }> };
      // An event can match favorites and interests or be replayed. Its unique
      // account/event index prevents both inbox and push duplicates.
      inserted = failure.insertedDocs ?? [];
      if (failure.code !== 11000) logger.error({ err: error }, "Notification persistence failed");
    }
    if (inserted.length) {
      void sendPushToUsers(inserted.map((row) => String(row.userId)), {
        title: notice.title, body: notice.body,
        threadId: notice.conversationId ?? notice.shopId,
        data: {
          type: notice.type, shopId: notice.shopId,
          ...(notice.conversationId ? { conversationId: notice.conversationId } : {}),
          ...(notice.itemId ? { itemId: notice.itemId, itemKind: notice.itemKind, action: notice.action } : {}),
        },
      });
    }
  }
}

const exposedFields: Record<Kind, string[]> = {
  product: ["name", "brand", "description", "price", "quantity", "stockStatus", "colors", "photos", "sizes",
    "tags", "weight", "dimension", "variations", "categories", "applyDiscount"],
  service: ["title", "description", "categories", "pricingType", "price", "durationMinutes", "pricingOptions",
    "photos", "tags", "isActive", "serviceLocation"],
};
const comparable = (value: unknown): string => JSON.stringify(value, (key, item) => key === "_id" ? undefined : item);
export function catalogHasChanged(kind: Kind, before: any, after: any): boolean {
  return !before || exposedFields[kind].some((key) => comparable(before[key]) !== comparable(after[key]));
}

/** Parent-category interests also match publications in their child categories. */
async function categoryAncestors(ids: unknown[]): Promise<string[]> {
  const seen = new Set<string>(ids.map((id: any) => String(id?._id ?? id)));
  let frontier = [...seen];
  for (let depth = 0; depth < 20 && frontier.length; depth++) {
    const categories = await Category.find({ _id: { $in: frontier } }).select("parent").lean();
    frontier = [];
    for (const category of categories) {
      if (category.parent && !seen.has(String(category.parent))) {
        const parent = String(category.parent);
        seen.add(parent); frontier.push(parent);
      }
    }
  }
  return [...seen];
}

export async function notifyCatalogChange(input: {
  kind: Kind; action: Action; shopId: string; itemId: string; actorId: string; before?: any;
}): Promise<void> {
  try {
    const { kind, action, shopId, itemId, actorId, before } = input;
    const [shop, item] = await Promise.all([
      Shop.findById(shopId).select("name sellerId countryCode").lean(),
      kind === "product" ? Product.findById(itemId).lean() : Service.findById(itemId).lean(),
    ]);
    if (!shop || !item) return;
    if (action === "updated" && !catalogHasChanged(kind, before, item)) return;
    const active = "isActive" in item ? item.isActive : true;
    if (kind === "service" && active === false &&
      (action === "created" || before?.isActive === false)) return;
    const audience = new Set<string>();
    const favorites = await ShopFavorite.find({ shopId }).select("userId").lean();
    favorites.forEach((favorite) => audience.add(String(favorite.userId)));
    // Country comes from the saved account location, never the phone locale,
    // IP, or an assumed country when either side has no configured country.
    const firstPublished = action === "created" || (kind === "service" &&
      action === "updated" && before?.isActive === false && active !== false);
    if (firstPublished && shop.countryCode) {
      const country = await Country.findOne({ cca2: shop.countryCode.toUpperCase() }).select("_id").lean();
      if (country) {
        const categories = await categoryAncestors(item.categories ?? []);
        const interested = await User.find({
          country: country._id, interestCategoryIds: { $in: categories },
        }).select("_id").lean();
        interested.forEach((user) => audience.add(String(user._id)));
      }
    }
    audience.delete(actorId);
    audience.delete(String(shop.sellerId));
    const label = String("name" in item ? item.name : item.title);
    const verb = action === "created" ? "a ajouté" : action === "deleted" ? "a supprimé" : "a mis à jour";
    const eventVersion = action === "updated" ? new Date(item.updatedAt).toISOString() : action;
    await notifyUsers([...audience], {
      eventKey: `catalog:${kind}:${itemId}:${action}:${eventVersion}`,
      type: "catalog_change", shopId, itemId, itemKind: kind, action,
      title: shop.name, body: `${shop.name} ${verb} ${kind === "product" ? "le produit" : "le service"} « ${label} ».`,
    });
  } catch (error) {
    logger.error({ err: error }, "Catalog notification failed");
  }
}

/** Observe only successful, shop-authorized writes; never notify for failed saves. */
export function observeCatalogWrite(kind: Kind, action: Action): RequestHandler {
  return async (req, res, next) => {
    const shopId = String(req.params.shopId);
    const itemId = String(req.params.id ?? "");
    let before: unknown;
    if (action !== "created" && Types.ObjectId.isValid(itemId)) {
      try {
        before = kind === "product"
          ? await Product.findOne({ _id: itemId, shop: shopId, deletedAt: null }).lean()
          : await Service.findOne({ _id: itemId, shop: shopId, deletedAt: null }).lean();
      } catch (error) {
        req.log.error({ err: error }, "Unable to observe catalog write");
      }
    }
    const json = res.json.bind(res);
    res.json = (body: any) => {
      if (res.statusCode >= 200 && res.statusCode < 300 &&
        (action === "deleted" ? body?.success === true : !!body?.id)) {
        const savedId = action === "created" ? String(body.id) : itemId;
        res.once("finish", () => {
          void notifyCatalogChange({ kind, action, shopId, itemId: savedId, actorId: String(req.userId), before });
        });
      }
      return json(body);
    };
    next();
  };
}
