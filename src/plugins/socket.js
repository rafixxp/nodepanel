import { Server } from "socket.io";
import { systemService } from "../services/system/index.js";

let io;

/** 
 * Resolve the Fastify instance from either the server plugin argument
 * or the app passed to initSocket. This keeps the plugin testable. */
function getApp(app) {
  if (app && typeof app.listen === "function" && !app.getLogger) return app;
  return app;
}

/** 
 * Fastify's fast-json-stringify / logger access is easiest through the
 * app object. We build a small logger shim if needed. */
export function initSocket(app) {
  // app must expose config, log, and services. The app/index.js wires this.
  const cfg = app?.config || {};
  const log = app?.log || console;

  // Default origin to env when app.config is not yet populated.
  const corsOrigin = cfg.corsOrigin || process.env.CORS_ORIGIN || "http://localhost:5173";
  const jwtSecret = cfg.jwtSecret || process.env.JWT_SECRET || "webpanel-dev-secret-change-me";

  const sock = new Server(
    app.server ?? app,
    {
      path: "/socket.io",
      cors: {
        origin: corsOrigin,
        methods: ["GET", "POST"],
      },
      authenticate: async (packet, next) => {
        // JWT is passed via the `auth.token` field on the connect handshake.
        const token = packet.auth?.token;
        if (!token) return next(new Error("unauthorized"));
        try {
          const jwt = await import("jsonwebtoken");
          const decoded = jwt.verify(token, jwtSecret);
          next(null, { userId: decoded.sub, role: decoded.role });
        } catch (err) {
          next(new Error("unauthorized"));
        }
      },
    }
  );
  io = sock;

  sock.on("connection", (socket) => {
    log.info(`socket connected: ${socket.id}`);

    // ---- Session list ----
    socket.on("session:list", async (cb) => {
      try {
        const sessions = await systemService.sessionList();
        cb({ ok: true, sessions });
      } catch (err) {
        cb({ ok: false, error: err.message });
      }
    });

    // ---- Live process stream via /proc polling ----
    socket.on("process:stream", async (opts, cb) => {
      try {
        const interval = opts?.interval || 1500;
        let running = true;

        const tick = async () => {
          if (!running) return;
          const list = await systemService.processList();
          socket.emit("process:update", { timestamp: Date.now(), processes: list.slice(0, 200) });
          // re-send the latest snapshot a few times for reconnect catch-up
          setTimeout(() => { if (running) tick(); }, interval * 3);
        };

        tick();
        socket.on("disconnect", () => { running = false; });
        cb({ ok: true, message: "stream started", interval });
      } catch (err) {
        cb({ ok: false, error: err.message });
      }
    });

    // ---- System info ----
    socket.on("system:info", async (cb) => {
      try {
        const info = await systemService.systemInfo();
        cb({ ok: true, ...info });
      } catch (err) {
        cb({ ok: false, error: err.message });
      }
    });
  });

  return io;
}

