import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
} from "./middlewares/clerkProxyMiddleware";
import router from "./routes";
import { logger } from "./lib/logger";
import { connectMongo, seedDefaultCategories, seedDemoShops } from "@workspace/db";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

app.use(cors({ credentials: true, origin: true }));
// Default JSON / urlencoded body parser limit (Express's built-in default
// of 100kb is fine for every endpoint EXCEPT the visual-search route, which
// installs its own 10MB-limited parser locally so the wider attack surface
// is unaffected.
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(clerkMiddleware());

app.use("/api", router);

connectMongo()
  .then(async () => {
    logger.info("MongoDB connected");
    try {
      await seedDefaultCategories();
      logger.info("Default categories ensured");
    } catch (err) {
      logger.error({ err }, "Failed to seed categories");
    }
    try {
      const { inserted } = await seedDemoShops();
      if (inserted > 0) {
        logger.info({ inserted }, "Demo shops seeded");
      }
    } catch (err) {
      logger.error({ err }, "Failed to seed demo shops");
    }
  })
  .catch((err) => {
    logger.error({ err }, "MongoDB connection failed");
  });

export default app;
