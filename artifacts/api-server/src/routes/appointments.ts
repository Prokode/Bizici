import { Router, type IRouter, type Request, type Response } from "express";
import { Types } from "mongoose";
import {
  Appointment,
  AppointmentReview,
  Conversation,
  Service,
  Shop,
  ShopMember,
  User,
} from "@workspace/db";

import { requireAuth, getShopAccess } from "../lib/auth";
import {
  bumpConversationOnAppointmentEvent,
  ensureConversation,
  recomputeProviderAppointmentRating,
  recomputeUserTrustRating,
} from "../lib/appointments";
import {
  serializeAppointment,
  serializeAppointmentReview,
  serializeUserPublic,
} from "../lib/serialize";

const router: IRouter = Router();

// ─── helpers ────────────────────────────────────────────────────────────────

function objectId(raw: unknown): Types.ObjectId | null {
  if (typeof raw !== "string" || !Types.ObjectId.isValid(raw)) return null;
  return new Types.ObjectId(raw);
}

type AppointmentRole = "customer" | "seller";

/**
 * Determine the caller's role for a given appointment.
 *  - "customer" if they are the customerUserId
 *  - "seller"   if they are a member of the shop (seller or sub_seller)
 *  - null       otherwise (unauthorized)
 *
 * Sub-sellers can act on appointments just like the owner — they're already
 * trusted to handle customer interactions in the chat layer.
 */
async function resolveAppointmentRole(
  userId: string,
  appt: { customerUserId: Types.ObjectId; shopId: Types.ObjectId },
): Promise<AppointmentRole | null> {
  const userOid = new Types.ObjectId(userId);
  if (appt.customerUserId.equals(userOid)) return "customer";
  const access = await getShopAccess(userId, String(appt.shopId));
  return access ? "seller" : null;
}

router.use("/me/appointments", requireAuth);

// ─── POST /me/appointments ──────────────────────────────────────────────────
//
// Customer proposes a new rendez-vous. Per project rules, only the customer
// initiates — sellers can only accept/decline.
router.post("/me/appointments", async (req: Request, res: Response) => {
  const body = req.body ?? {};
  const shopOid = objectId(body.shopId);
  if (!shopOid) {
    res.status(400).json({ error: "shopId must be a valid ObjectId" });
    return;
  }

  const shop = await Shop.findById(shopOid)
    .select({ sellerId: 1, kind: 1, serviceProvider: 1 })
    .lean();
  if (!shop) {
    res.status(404).json({ error: "Shop not found" });
    return;
  }
  if (shop.kind === "products") {
    res
      .status(400)
      .json({ error: "This shop does not offer services" });
    return;
  }
  const shopDefaultLoc =
    (shop.serviceProvider?.serviceLocation as
      | "at_shop"
      | "at_customer"
      | "both"
      | undefined) ?? "at_shop";

  // Refuse self-booking — a shop member proposing an appointment to their own
  // shop would generate nonsensical reviews and corrupt aggregates.
  const callerAccess = await getShopAccess(req.userId, String(shopOid));
  if (callerAccess) {
    res
      .status(403)
      .json({ error: "Sellers cannot book appointments at their own shop" });
    return;
  }

  // Optional service id — must belong to this shop if provided.
  let serviceOid: Types.ObjectId | null = null;
  let serviceOverrideLoc:
    | "at_shop"
    | "at_customer"
    | "both"
    | "inherit"
    | null = null;
  if (body.serviceId !== undefined && body.serviceId !== null) {
    serviceOid = objectId(body.serviceId);
    if (!serviceOid) {
      res.status(400).json({ error: "Invalid serviceId" });
      return;
    }
    const svc = await Service.findOne({
      _id: serviceOid,
      shop: shopOid,
      deletedAt: null,
    })
      .select({ _id: 1, serviceLocation: 1 })
      .lean();
    if (!svc) {
      res
        .status(404)
        .json({ error: "Service not found in this shop" });
      return;
    }
    serviceOverrideLoc =
      (svc.serviceLocation as Exclude<typeof serviceOverrideLoc, null>) ??
      "inherit";
  }

  if (typeof body.scheduledAt !== "string") {
    res.status(400).json({ error: "scheduledAt is required (ISO datetime)" });
    return;
  }
  const scheduledAt = new Date(body.scheduledAt);
  if (Number.isNaN(scheduledAt.getTime())) {
    res.status(400).json({ error: "scheduledAt must be a valid ISO datetime" });
    return;
  }
  // Allow up to 5 minutes of clock skew so a "right now" booking from the
  // client clock doesn't get rejected by the server clock.
  if (scheduledAt.getTime() < Date.now() - 5 * 60 * 1000) {
    res.status(400).json({ error: "scheduledAt must be in the future" });
    return;
  }

  let durationMinutes: number | null = null;
  if (body.durationMinutes !== undefined && body.durationMinutes !== null) {
    const d = Number(body.durationMinutes);
    if (!Number.isFinite(d) || d < 1 || d > 24 * 60) {
      res.status(400).json({ error: "durationMinutes must be 1..1440" });
      return;
    }
    durationMinutes = Math.round(d);
  }

  let notes: string | null = null;
  if (body.notes !== undefined && body.notes !== null) {
    if (typeof body.notes !== "string") {
      res.status(400).json({ error: "notes must be a string" });
      return;
    }
    const trimmed = body.notes.trim();
    if (trimmed.length > 1000) {
      res.status(400).json({ error: "notes must be <= 1000 chars" });
      return;
    }
    notes = trimmed.length === 0 ? null : trimmed;
  }

  // Resolve effective execution mode at booking time. We snapshot a single
  // concrete value (at_shop OR at_customer) on the appointment so post-hoc
  // provider edits never rewrite history.
  const effectiveLoc =
    serviceOverrideLoc && serviceOverrideLoc !== "inherit"
      ? serviceOverrideLoc
      : shopDefaultLoc;
  let serviceLocation: "at_shop" | "at_customer";
  if (body.serviceLocation === "at_shop" || body.serviceLocation === "at_customer") {
    // Customer's explicit choice — must be supported by the provider.
    if (
      effectiveLoc !== "both" &&
      effectiveLoc !== body.serviceLocation
    ) {
      res
        .status(400)
        .json({ error: "Selected serviceLocation not offered by provider" });
      return;
    }
    serviceLocation = body.serviceLocation;
  } else if (effectiveLoc === "both") {
    res.status(400).json({
      error:
        "serviceLocation is required (provider offers both at_shop and at_customer)",
    });
    return;
  } else {
    serviceLocation = effectiveLoc;
  }

  let customerAddress: string | null = null;
  if (body.customerAddress !== undefined && body.customerAddress !== null) {
    if (typeof body.customerAddress !== "string") {
      res.status(400).json({ error: "customerAddress must be a string" });
      return;
    }
    const trimmed = body.customerAddress.trim();
    if (trimmed.length > 500) {
      res.status(400).json({ error: "customerAddress must be <= 500 chars" });
      return;
    }
    customerAddress = trimmed.length === 0 ? null : trimmed;
  }
  if (serviceLocation === "at_customer" && !customerAddress) {
    res.status(400).json({
      error: "customerAddress is required when the service is at_customer",
    });
    return;
  }

  const customerOid = new Types.ObjectId(req.userId);
  const conversationId = await ensureConversation(shopOid, customerOid);

  const created = await Appointment.create({
    shopId: shopOid,
    customerUserId: customerOid,
    sellerUserId: shop.sellerId,
    serviceId: serviceOid,
    conversationId,
    scheduledAt,
    durationMinutes,
    notes,
    serviceLocation,
    customerAddress,
    status: "proposed",
  });

  await bumpConversationOnAppointmentEvent(
    conversationId,
    "customer",
    "Rendez-vous proposé",
  );

  res.status(201).json(serializeAppointment(created.toObject()));
});

// ─── GET /me/appointments ───────────────────────────────────────────────────
//
// List all appointments where the caller is either the customer or a member
// of the shop. Sorted by scheduledAt desc so upcoming/recent ones come first.
router.get("/me/appointments", async (req: Request, res: Response) => {
  const userOid = new Types.ObjectId(req.userId);

  const memberShops = await ShopMember.find({ userId: userOid })
    .select({ shopId: 1, _id: 0 })
    .lean();
  const shopOids = memberShops.map(
    (m: { shopId: Types.ObjectId }) => m.shopId,
  );

  const filter: Record<string, unknown> = {
    $or: [
      { customerUserId: userOid },
      ...(shopOids.length > 0 ? [{ shopId: { $in: shopOids } }] : []),
    ],
  };

  // Optional status filter.
  if (typeof req.query.status === "string") {
    filter.status = req.query.status;
  }
  // Optional conversation filter for the chat screen.
  const convFilter = objectId(req.query.conversationId as string | undefined);
  if (convFilter) {
    filter.conversationId = convFilter;
  }

  const appts = await Appointment.find(filter)
    .sort({ scheduledAt: -1 })
    .limit(200)
    .lean();

  res.json({
    appointments: appts.map(serializeAppointment),
  });
});

// ─── GET /me/appointments/:id ───────────────────────────────────────────────
router.get("/me/appointments/:id", async (req: Request, res: Response) => {
  const id = objectId(req.params.id);
  if (!id) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const appt = await Appointment.findById(id).lean();
  if (!appt) {
    res.status(404).json({ error: "Appointment not found" });
    return;
  }
  const role = await resolveAppointmentRole(req.userId, appt);
  if (!role) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  // Counter-party identity for the UI ("vous · Salon Anaïs").
  const [shop, customer] = await Promise.all([
    Shop.findById(appt.shopId).select({ name: 1 }).lean(),
    User.findById(appt.customerUserId)
      .select({ name: 1, trustRating: 1, trustReviewsCount: 1 })
      .lean(),
  ]);

  res.json({
    appointment: serializeAppointment(appt),
    role,
    shop: shop ? { id: String(shop._id), name: shop.name } : null,
    customer: serializeUserPublic(customer),
  });
});

// ─── POST /me/appointments/:id/accept ───────────────────────────────────────
router.post(
  "/me/appointments/:id/accept",
  async (req: Request, res: Response) => {
    const id = objectId(req.params.id);
    if (!id) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const appt = await Appointment.findById(id);
    if (!appt) {
      res.status(404).json({ error: "Appointment not found" });
      return;
    }
    const role = await resolveAppointmentRole(req.userId, appt);
    if (role !== "seller") {
      res
        .status(403)
        .json({ error: "Only the shop can accept this appointment" });
      return;
    }
    if (appt.status !== "proposed") {
      res
        .status(409)
        .json({ error: `Cannot accept an appointment in status '${appt.status}'` });
      return;
    }
    appt.status = "confirmed";
    appt.acceptedAt = new Date();
    await appt.save();

    await bumpConversationOnAppointmentEvent(
      appt.conversationId,
      "seller",
      "Rendez-vous confirmé",
    );
    res.json(serializeAppointment(appt.toObject()));
  },
);

// ─── POST /me/appointments/:id/decline ──────────────────────────────────────
router.post(
  "/me/appointments/:id/decline",
  async (req: Request, res: Response) => {
    const id = objectId(req.params.id);
    if (!id) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const appt = await Appointment.findById(id);
    if (!appt) {
      res.status(404).json({ error: "Appointment not found" });
      return;
    }
    const role = await resolveAppointmentRole(req.userId, appt);
    if (role !== "seller") {
      res
        .status(403)
        .json({ error: "Only the shop can decline this appointment" });
      return;
    }
    if (appt.status !== "proposed") {
      res
        .status(409)
        .json({ error: `Cannot decline an appointment in status '${appt.status}'` });
      return;
    }

    let reason: string | null = null;
    if (req.body?.reason !== undefined && req.body?.reason !== null) {
      if (typeof req.body.reason !== "string") {
        res.status(400).json({ error: "reason must be a string" });
        return;
      }
      const trimmed = req.body.reason.trim();
      if (trimmed.length > 500) {
        res.status(400).json({ error: "reason must be <= 500 chars" });
        return;
      }
      reason = trimmed.length === 0 ? null : trimmed;
    }

    appt.status = "declined";
    appt.declinedAt = new Date();
    appt.declineReason = reason;
    await appt.save();

    await bumpConversationOnAppointmentEvent(
      appt.conversationId,
      "seller",
      "Rendez-vous refusé",
    );
    res.json(serializeAppointment(appt.toObject()));
  },
);

// ─── POST /me/appointments/:id/complete ─────────────────────────────────────
//
// Per project rule: only the CLIENT can mark an appointment as completed.
router.post(
  "/me/appointments/:id/complete",
  async (req: Request, res: Response) => {
    const id = objectId(req.params.id);
    if (!id) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const appt = await Appointment.findById(id);
    if (!appt) {
      res.status(404).json({ error: "Appointment not found" });
      return;
    }
    const role = await resolveAppointmentRole(req.userId, appt);
    if (role !== "customer") {
      res
        .status(403)
        .json({ error: "Only the client can end the appointment" });
      return;
    }
    if (appt.status !== "confirmed") {
      res
        .status(409)
        .json({ error: `Cannot complete an appointment in status '${appt.status}'` });
      return;
    }
    appt.status = "completed";
    appt.completedAt = new Date();
    await appt.save();

    await bumpConversationOnAppointmentEvent(
      appt.conversationId,
      "customer",
      "Rendez-vous terminé — à noter",
    );
    res.json(serializeAppointment(appt.toObject()));
  },
);

// ─── POST /me/appointments/:id/cancel ───────────────────────────────────────
//
// Either party can cancel before completion. After completion, no cancel.
router.post(
  "/me/appointments/:id/cancel",
  async (req: Request, res: Response) => {
    const id = objectId(req.params.id);
    if (!id) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const appt = await Appointment.findById(id);
    if (!appt) {
      res.status(404).json({ error: "Appointment not found" });
      return;
    }
    const role = await resolveAppointmentRole(req.userId, appt);
    if (!role) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    if (appt.status === "completed") {
      res
        .status(409)
        .json({ error: "Cannot cancel a completed appointment" });
      return;
    }
    if (appt.status === "cancelled" || appt.status === "declined") {
      res
        .status(409)
        .json({ error: `Appointment already ${appt.status}` });
      return;
    }

    let reason: string | null = null;
    if (req.body?.reason !== undefined && req.body?.reason !== null) {
      if (typeof req.body.reason !== "string") {
        res.status(400).json({ error: "reason must be a string" });
        return;
      }
      const trimmed = req.body.reason.trim();
      if (trimmed.length > 500) {
        res.status(400).json({ error: "reason must be <= 500 chars" });
        return;
      }
      reason = trimmed.length === 0 ? null : trimmed;
    }

    appt.status = "cancelled";
    appt.cancelledAt = new Date();
    appt.cancelledBy = role;
    appt.cancelReason = reason;
    await appt.save();

    await bumpConversationOnAppointmentEvent(
      appt.conversationId,
      role,
      role === "customer"
        ? "Rendez-vous annulé par le client"
        : "Rendez-vous annulé par le prestataire",
    );
    res.json(serializeAppointment(appt.toObject()));
  },
);

// ─── GET /me/appointments/:id/reviews ───────────────────────────────────────
//
// Returns all reviews tied to an appointment (0, 1 or 2). Both parties can
// see both reviews — there's no "blind" review window for now since the UI
// surfaces reviews only after the appointment is completed.
router.get(
  "/me/appointments/:id/reviews",
  async (req: Request, res: Response) => {
    const id = objectId(req.params.id);
    if (!id) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const appt = await Appointment.findById(id).lean();
    if (!appt) {
      res.status(404).json({ error: "Appointment not found" });
      return;
    }
    const role = await resolveAppointmentRole(req.userId, appt);
    if (!role) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const reviews = await AppointmentReview.find({ appointmentId: id })
      .sort({ createdAt: 1 })
      .lean();
    res.json({
      reviews: reviews.map(serializeAppointmentReview),
    });
  },
);

// ─── POST /me/appointments/:id/reviews ──────────────────────────────────────
//
// Submit (or upsert) the review for the caller's side. Direction is derived
// from the caller's role on the appointment — there's no way to spoof it.
router.post(
  "/me/appointments/:id/reviews",
  async (req: Request, res: Response) => {
    const id = objectId(req.params.id);
    if (!id) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const appt = await Appointment.findById(id);
    if (!appt) {
      res.status(404).json({ error: "Appointment not found" });
      return;
    }
    const role = await resolveAppointmentRole(req.userId, appt);
    if (!role) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    if (appt.status !== "completed") {
      res
        .status(409)
        .json({ error: "Reviews are only available after completion" });
      return;
    }

    const ratingNum = Number(req.body?.rating);
    if (
      !Number.isFinite(ratingNum) ||
      !Number.isInteger(ratingNum) ||
      ratingNum < 1 ||
      ratingNum > 5
    ) {
      res
        .status(400)
        .json({ error: "rating must be an integer between 1 and 5" });
      return;
    }

    let comment: string | null = null;
    if (req.body?.comment !== undefined && req.body?.comment !== null) {
      if (typeof req.body.comment !== "string") {
        res.status(400).json({ error: "comment must be a string" });
        return;
      }
      const trimmed = req.body.comment.trim();
      if (trimmed.length > 1000) {
        res.status(400).json({ error: "comment must be <= 1000 chars" });
        return;
      }
      comment = trimmed.length === 0 ? null : trimmed;
    }

    const direction =
      role === "customer" ? "client_to_provider" : "provider_to_client";
    const fromUserId = new Types.ObjectId(req.userId);
    const toUserId =
      role === "customer" ? appt.sellerUserId : appt.customerUserId;

    const review = await AppointmentReview.findOneAndUpdate(
      { appointmentId: appt._id, direction },
      {
        $set: {
          rating: ratingNum,
          comment,
        },
        $setOnInsert: {
          appointmentId: appt._id,
          fromUserId,
          toUserId,
          shopId: appt.shopId,
          direction,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    // Best-effort aggregate refresh — never fail the user write because of
    // an aggregate hiccup.
    try {
      if (direction === "client_to_provider") {
        await recomputeProviderAppointmentRating(appt.shopId);
      } else {
        await recomputeUserTrustRating(appt.customerUserId);
      }
    } catch (err) {
      req.log.error(
        { err, appointmentId: String(appt._id) },
        "Failed to recompute appointment rating aggregate",
      );
    }

    res.status(200).json(serializeAppointmentReview(review!.toObject()));
  },
);

export default router;
