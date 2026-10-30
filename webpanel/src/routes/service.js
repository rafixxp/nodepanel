export function registerServiceRoutes(app) {
  // Service management is served from /api/system (registerSystemRoutes);
  // this file is kept as a thin alias for consistency.
  app.get("/api/service/list", async (req, reply) => {
    try {
      const list = await app.services.system.serviceList();
      reply.send({ ok: true, services: list });
    } catch (err) {
      reply.status(500).send({ ok: false, error: err.message });
    }
  });
}
