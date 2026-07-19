import { Router, type IRouter } from "express";
import { citiesController } from "../controllers/cities";

const router: IRouter = Router();

/**
 * Public, unauthenticated — like /countries, the city picker is shown on
 * pre-auth sign-up screens. `resolve` is validated + normalized + idempotent
 * so it cannot store raw free text.
 */
router.get("/cities", citiesController.list);
router.post("/cities/resolve", citiesController.resolve);

export default router;
