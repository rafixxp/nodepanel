import fastify from "fastify";
import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const config = {
  port: Number(process.env.PORT ?? 8080),
  host: process.env.HOST ?? "0.0.0.0",
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
  jwtSecret: process.env.JWT_SECRET ?? "webpanel-dev-secret-change-me",
  logger: { level: process.env.LOG_LEVEL ?? "info", transport: { target: "pino-pretty", options: { colorize: true } } },
};

const app = fastify({
  logger: config.logger,
});

// ---- plugins ----
await app.register(cors, {
  origin: config.corsOrigin,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
});

// ---- middleware / helpers ----
app.decorate("config", config);
app.decorate("services", {
  system: (await import("../services/system/index.js")).systemService,
  fileManager: (await import("../services/filemanager.js")).fileManagerService,
  website: (await import("../services/website.js")).websiteService,
});
app.decorate("utils", { auth: (await import("../utils/auth.js")) });

// ---- Serve the SPA frontend (built output) ----
const distRoot = path.resolve(process.cwd(), "client/dist");
try {
  await app.register(fastifyStatic, { root: distRoot, prefix: "/" });
} catch {
  app.log.warn("SPA dist not found — serving without frontend assets");
}

// ---- routes ----
import { registerHealthRoutes } from "../routes/health.js";
import { registerAuthRoutes } from "../routes/auth.js";
import { registerSystemRoutes } from "../routes/system.js";
import { registerServiceRoutes } from "../routes/service.js";
import { registerFileManagerRoutes } from "../routes/filemanager.js";
import { registerWebsiteRoutes } from "../routes/website.js";
import { registerTerminalRoutes } from "../routes/terminal.js";

registerHealthRoutes(app);
registerAuthRoutes(app);
registerSystemRoutes(app);
registerServiceRoutes(app);
registerFileManagerRoutes(app);
registerWebsiteRoutes(app);
registerTerminalRoutes(app);

// ---- health ----
app.get("/health", async () => ({ ok: true, version: "1.0.0", timestamp: new Date().toISOString() }));

// ---- socket.io ----
import { initSocket } from "../plugins/socket.js";
initSocket(app);

// Attach config + services to the app object so routes/plugins can access
// them after the socket plugin is registered.
app.config = config;
app.services = {
  system: (await import("../services/system/index.js")).systemService,
  fileManager: (await import("../services/filemanager.js")).fileManagerService,
  website: (await import("../services/website.js")).websiteService,
};

const start = async () => {
  try {
    await app.listen({ port: config.port, host: config.host });
    app.log.info(`WebPanel listening on http://${config.host}:${config.port}`);
    app.log.info(`SPA frontend served from ${distRoot}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();

export default app;

