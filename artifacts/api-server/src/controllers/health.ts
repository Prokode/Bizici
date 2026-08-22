import type { Request, Response } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { mongoose } from "@workspace/db";
import { isMongoReady, requiresMongoReadiness } from "../lib/readiness";

export const healthController = {
  check: (_req: Request, res: Response) => {
    const requireMongoReadiness = requiresMongoReadiness(
      process.env.REQUIRE_DB_READY,
    );
    if (
      requireMongoReadiness &&
      !isMongoReady(mongoose.connection.readyState)
    ) {
      res.status(503).json({ status: "unavailable" });
      return;
    }

    const data = HealthCheckResponse.parse({ status: "ok" });
    res.json(data);
  },
};
