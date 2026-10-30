import { websiteService } from "../services/website.js";

export function registerWebsiteRoutes(app) {
  app.get("/api/website/origins", async (req, reply) => {
    try {
      const list = await websiteService.listOrigins();
      reply.send({ ok: true, origins: list });
    } catch (err) {
      reply.status(500).send({ ok: false, error: err.message });
    }
  });

  app.get("/api/website/sites", async (req, reply) => {
    const { root } = req.query;
    try {
      const sites = await websiteService.listSites(root || "/var/www/html");
      reply.send({ ok: true, root, sites });
    } catch (err) {
      reply.status(500).send({ ok: false, error: err.message });
    }
  });

  app.post("/api/website/create", async (req, reply) => {
    const { domain, service, docRoot } = req.body || {};
    if (!domain) return reply.badRequest("domain required");
    try {
      const { file, content } = await websiteService.generateConfig(service, domain, false, docRoot);
      reply.send({ ok: true, domain, service, configFile: file, content });
    } catch (err) {
      reply.status(500).send({ ok: false, error: err.message });
    }
  });

  app.post("/api/website/ssl", async (req, reply) => {
    const { domain, email, service } = req.body || {};
    if (!domain) return reply.badRequest("domain required");
    try {
      const { ok, output } = await websiteService.installCertbot(domain, email || "admin@" + domain);
      reply.send({ ok: true, domain, output });
    } catch (err) {
      reply.status(500).send({ ok: false, error: err.message });
    }
  });

  app.get("/api/website/prereqs/:service", async (req, reply) => {
    const { service } = req.params;
    try {
      const checks = await websiteService.checkPrereqs(service);
      reply.send({ ok: true, service, ...checks });
    } catch (err) {
      reply.status(500).send({ ok: false, error: err.message });
    }
  });
}
