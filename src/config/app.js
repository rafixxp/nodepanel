import "dotenv/config";

const config = {
  port: Number(process.env.PORT ?? 8080),
  host: process.env.HOST ?? "0.0.0.0",
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
  jwtSecret: process.env.JWT_SECRET ?? "webpanel-dev-secret-change-me",
  sessionSecret: process.env.SESSION_SECRET ?? "webpanel-session-secret",
  socket: {
    cors: { origin: process.env.CORS_ORIGIN ?? "http://localhost:5173", methods: ["GET", "POST"] },
  },
  hostProbe: {
    user: process.env.SYSTEM_USER ?? "root",
    host: process.env.SYSTEM_HOST ?? "127.0.0.1",
    port: Number(process.env.SYSTEM_SSH_PORT ?? 22),
    keyPath: process.env.SYSTEM_SSH_KEY,
  },
};

export { config };
