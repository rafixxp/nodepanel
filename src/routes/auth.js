export function registerAuthRoutes(app) {
  // Demo auth store (in-memory). Replace with a real DB + bcrypt in production.
  app.post("/api/auth/register", async (req, reply) => {
    const { username, password } = req.body || {};
    if (!username || !password) return reply.badRequest("username and password required");
    try {
      const token = await app.utils.auth.registerUser(username, password);
      reply.header("x-auth-token", token).send({ ok: true, token });
    } catch (err) {
      reply.status(400).send({ ok: false, error: err.message });
    }
  });

  app.post("/api/auth/login", async (req, reply) => {
    const { username, password } = req.body || {};
    if (!username || !password) return reply.badRequest("username and password required");
    try {
      const token = await app.utils.auth.loginUser(username, password);
      reply.header("x-auth-token", token).send({ ok: true, token });
    } catch (err) {
      reply.status(401).send({ ok: false, error: err.message });
    }
  });

  app.post("/api/auth/logout", async (req, reply) => {
    const user = req.user?.sub;
    if (user) app.utils.auth.logoutUser(user);
    reply.send({ ok: true });
  });

  app.get("/api/auth/me", async (req, reply) => {
    const user = req.user;
    reply.send({ ok: true, user });
  });
}
