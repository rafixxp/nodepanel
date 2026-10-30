import { fileManagerService, DEFAULT_ROOT } from "../services/filemanager.js";

export function registerFileManagerRoutes(app) {
  app.get("/api/file/tree", async (req, reply) => {
    const root = req.query.root || DEFAULT_ROOT;
    const rel = req.query.rel || "";
    try {
      const list = await fileManagerService.listFiles(root, rel);
      reply.send({ ok: true, root, rel, files: list });
    } catch (err) {
      reply.status(500).send({ ok: false, error: err.message });
    }
  });

  app.get("/api/file/read", async (req, reply) => {
    const { root, rel } = req.query;
    try {
      const file = await fileManagerService.readFile(root, rel);
      reply.send({ ok: true, file });
    } catch (err) {
      reply.status(404).send({ ok: false, error: err.message });
    }
  });

  app.put("/api/file/write", async (req, reply) => {
    const { root, rel, content } = req.body || {};
    try {
      const result = await fileManagerService.writeFile(root, rel, content);
      reply.send({ ok: true, ...result });
    } catch (err) {
      reply.status(400).send({ ok: false, error: err.message });
    }
  });

  app.delete("/api/file/delete", async (req, reply) => {
    const { root, rel } = req.query;
    try {
      const result = await fileManagerService.deleteEntry(root, rel);
      reply.send({ ok: true, ...result });
    } catch (err) {
      reply.status(400).send({ ok: false, error: err.message });
    }
  });

  app.post("/api/file/folder", async (req, reply) => {
    const { root, rel, name } = req.body || {};
    try {
      const result = await fileManagerService.createFolder(root, rel, name);
      reply.send({ ok: true, ...result });
    } catch (err) {
      reply.status(400).send({ ok: false, error: err.message });
    }
  });

  app.post("/api/file/upload", async (req, reply) => {
    const { root, rel, file } = req.body || {};
    if (!file || !file.data) return reply.badRequest("file required");
    try {
      const result = await fileManagerService.upload(root, rel, file);
      reply.send({ ok: true, ...result });
    } catch (err) {
      reply.status(400).send({ ok: false, error: err.message });
    }
  });
}
