import app, { appReady } from "./app";
import { logger } from "./lib/logger";
import { requiresMongoReadiness } from "./lib/readiness";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const host = process.env["API_HOST"]?.trim();
const requireMongoReadiness = requiresMongoReadiness(
  process.env["REQUIRE_DB_READY"],
);

async function startServer(): Promise<void> {
  if (requireMongoReadiness) {
    await appReady;
  } else {
    void appReady.catch((err) => {
      logger.error({ err }, "MongoDB connection failed");
    });
  }

  const onListening = () => {
    logger.info({ port, host: host || "all interfaces" }, "Server listening");
  };
  const server = host
    ? app.listen(port, host, onListening)
    : app.listen(port, onListening);

  server.on("error", (err) => {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  });
}

startServer().catch((err) => {
  logger.error({ err }, "API startup failed");
  process.exit(1);
});
