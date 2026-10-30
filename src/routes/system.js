export function registerSystemRoutes(app) {
  app.get("/api/system/info", async (req, reply) => {
    try {
      const info = await app.services.system.systemInfo();
      reply.send({ ok: true, ...info });
    } catch (err) {
      reply.status(500).send({ ok: false, error: err.message });
    }
  });

  app.get("/api/system/processes", async (req, reply) => {
    try {
      const list = await app.services.system.processList();
      reply.send({ ok: true, processes: list });
    } catch (err) {
      reply.status(500).send({ ok: false, error: err.message });
    }
  });

  // SSE convenience endpoint; the real-time stream lives in the Socket.IO plugin.
  app.get("/api/system/processes/stream", async (req, reply) => {
    reply
      .type("text/event-stream")
      .header("Cache-Control", "no-cache")
      .header("Connection", "keep-alive");
    const timer = setInterval(async () => {
      try {
        const list = await app.services.system.processList();
        reply.send(
          `event: process-update\ndata: ${JSON.stringify({ timestamp: Date.now(), processes: list.slice(0, 200) })}\n\n`
        );
      } catch {
        /* ignore */
      }
    }, 1500);
    req.raw.on("close", () => clearInterval(timer));
  });

  app.get("/api/system/services", async (req, reply) => {
    try {
      const list = await app.services.system.serviceList();
      reply.send({ ok: true, services: list });
    } catch (err) {
      reply.status(500).send({ ok: false, error: err.message });
    }
  });

  app.get("/api/system/services/:name", async (req, reply) => {
    try {
      const { name } = req.params;
      const status = await app.services.system.serviceStatus(name);
      reply.send({ ok: true, status });
    } catch (err) {
      reply.status(500).send({ ok: false, error: err.message });
    }
  });

  app.post("/api/system/services/:name/restart", async (req, reply) => {
    try {
      const { name } = req.params;
      const result = await app.services.system.serviceRestart(name);
      reply.send({ ok: true, ...result });
    } catch (err) {
      reply.status(500).send({ ok: false, error: err.message });
    }
  });

  app.post("/api/system/services/:name/enable", async (req, reply) => {
    try {
      const { name } = req.params;
      const result = await app.services.system.serviceEnable(name);
      reply.send({ ok: true, ...result });
    } catch (err) {
      reply.status(500).send({ ok: false, error: err.message });
    }
  });

  app.get("/api/system/sessions", async (req, reply) => {
    try {
      const sessions = await app.services.system.sessionList();
      reply.send({ ok: true, sessions });
    } catch (err) {
      reply.status(500).send({ ok: false, error: err.message });
    }
  });
}
