import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

export function registerTerminalRoutes(app) {
  app.post("/api/terminal/run", async (req, reply) => {
    const { command, shell } = req.body || {};
    if (!command) return reply.badRequest("command required");
    try {
      const { stdout, stderr } = await execAsync(command, { shell: shell || "/bin/bash", timeout: 15000 });
      reply.send({ ok: true, stdout, stderr });
    } catch (err) {
      reply.send({ ok: true, stdout: "", stderr: err.message });
    }
  });

  app.get("/api/terminal/session", async (req, reply) => {
    reply.send({ ok: true, sessionId: "local-" + Date.now() });
  });
}
