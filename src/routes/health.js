export function registerHealthRoutes(app) {
  app.get("/api/system", async () => app.services.system.systemInfo());
  app.get("/api/disk", async () => app.services.system.diskUsage());
  app.get("/api/net", async () => app.services.system.networkInterfaces());
  app.get("/api/health", async () => ({ ok: true, service: "webpanel", version: "1.0.0" }));
}

