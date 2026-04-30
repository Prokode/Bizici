import { Router, type IRouter } from "express";
import { Category } from "@workspace/db";
import { requireAuth } from "../lib/auth";
import { serializeCategory } from "../lib/serialize";

const router: IRouter = Router();
router.use(requireAuth);

router.get("/categories", async (req, res) => {
  const rawKind = typeof req.query.kind === "string" ? req.query.kind : null;
  const filter: Record<string, unknown> = {};
  if (rawKind === "product" || rawKind === "service") {
    filter.kind = rawKind;
  }
  const cats = await Category.find(filter).sort({ name: 1 }).lean();
  res.json(cats.map(serializeCategory));
});

export default router;
