import { Schema, model, models, type Model, type InferSchemaType } from "mongoose";

const FavoriteSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  shopId: { type: Schema.Types.ObjectId, ref: "Shop", required: true },
}, { timestamps: true });
FavoriteSchema.index({ userId: 1, shopId: 1 }, { unique: true });
FavoriteSchema.index({ shopId: 1, userId: 1 });

const NotificationSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  eventKey: { type: String, required: true },
  type: { type: String, enum: ["chat_message", "catalog_change"], required: true },
  title: { type: String, required: true },
  body: { type: String, required: true },
  shopId: { type: Schema.Types.ObjectId, ref: "Shop", required: true },
  conversationId: { type: Schema.Types.ObjectId, ref: "Conversation", default: null },
  itemId: { type: Schema.Types.ObjectId, default: null },
  itemKind: { type: String, enum: ["product", "service", null], default: null },
  action: { type: String, enum: ["created", "updated", "deleted", null], default: null },
  readAt: { type: Date, default: null },
}, { timestamps: true });
NotificationSchema.index({ userId: 1, eventKey: 1 }, { unique: true });
NotificationSchema.index({ userId: 1, _id: -1 });
NotificationSchema.index({ userId: 1, readAt: 1 });
NotificationSchema.index({ userId: 1, conversationId: 1, readAt: 1 });

type FavoriteDoc = InferSchemaType<typeof FavoriteSchema>;
type NotificationDoc = InferSchemaType<typeof NotificationSchema>;
export const ShopFavorite: Model<FavoriteDoc> =
  (models.ShopFavorite as Model<FavoriteDoc>) || model("ShopFavorite", FavoriteSchema);
export const AppNotification: Model<NotificationDoc> =
  (models.AppNotification as Model<NotificationDoc>) || model("AppNotification", NotificationSchema);
