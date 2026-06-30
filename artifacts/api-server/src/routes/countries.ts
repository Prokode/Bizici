import { Router, type IRouter } from "express";
import { countriesController } from "../controllers/countries";

const router: IRouter = Router();

/**
 * Public, unauthenticated. The country/phone pickers are shown on pre-auth
 * sign-up screens, so this must NOT require a session.
 */
router.get("/countries", countriesController.list);

export default router;
