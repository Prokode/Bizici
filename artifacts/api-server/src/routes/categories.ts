import { Router, type IRouter } from "express";
import { Category } from "@workspace/db";
import { requireAuth } from "../lib/auth";
import { serializeCategory } from "../lib/serialize";

const router: IRouter = Router();
router.use(requireAuth);

router.get("/categories", async (_req, res) => {
  const cats = await Category.find({}).sort({ name: 1 }).lean();
  res.json(cats.map(serializeCategory));
});

export default router;
