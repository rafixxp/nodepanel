import { config } from "./config/app.js";
import app from "./app/index.js";

console.log("WebPanel config: port=%d host=%s", config.port, config.host);
console.log("Starting server...");

try {
  await app.ready();
  await app.listen({ port: config.port, host: config.host });
  app.log.info(`WebPanel listening on http://${config.host}:${config.port}`);
} catch (error) {
  console.error("Failed to start WebPanel:", error);
  process.exit(1);
}
