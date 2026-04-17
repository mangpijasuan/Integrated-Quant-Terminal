import { createServer } from "node:http";

import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";

const app = createApp();
const server = createServer(app);

server.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, "Server started");
});

const shutdown = (signal: string): void => {
  logger.info({ signal }, "Shutting down server");
  server.close((error?: Error) => {
    if (error) {
      logger.error({ err: error }, "Failed to close server cleanly");
      process.exit(1);
    }

    logger.info("Server closed");
    process.exit(0);
  });
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
