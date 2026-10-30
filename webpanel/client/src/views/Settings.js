import { el, p, icon, badge, h3, emptyState } from "../utils/dom.js";

export function SettingsView({ token, api, nav }) {
  const [theme, setTheme] = ["light", setTheme];
  const [msg, setMsg] = ["", setMsg];

  // On mount, read current theme
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("data-theme", localStorage.getItem("webpanel_theme") || "light");
  }

  function toggleTheme() {
    const t = theme === "light" ? "dark" : "light";
    localStorage.setItem("webpanel_theme", t);
    document.documentElement.setAttribute("data-theme", t);
    setTheme(t);
  }

  return el("div", null,
    el("div", { class: "grid grid-cols-2 gap-2" },
      el("div", { class: "card" },
        el("div", { class: "card-title" }, h3("Appearance")),
        el("div", { class: "field" },
          el("label", null, "Color theme"),
          el("div", { class: "flex gap-2" },
            el("button", { class: "btn btn-sm", style: "flex:1", onclick: () => { setTheme("light"); toggleTheme(); } }, "☀️ Light"),
            el("button", { class: "btn btn-sm", style: "flex:1", onclick: () => { setTheme("dark"); toggleTheme(); } }, "🌙 Dark"),
          )
        ),
        p("Applies to the whole panel. Persisted in your browser.", "text-sm")
      ),

      el("div", { class: "card" },
        el("div", { class: "card-title" }, h3("Account")),
        el("div", { class: "field" },
          el("label", null, "Demo credentials"),
          el("pre", { class: "text-xs bg-bg-elev-2 p-2 rounded", "style": "font-family:var(--font-mono)" }, "admin / test123")
        ),
        p("Register a user via the API: POST /api/auth/register", "text-sm")
      ),
    ),

    el("div", { class: "card" },
      el("div", { class: "card-title" }, h3("API endpoints")),
      p("Base URL: <code>http://<hostname>:8080</code>", "text-sm"),
      p("REST endpoints under <code>/api/...</code>. Events stream over <code>/socket.io</code>.", "text-sm")
    ),

    el("div", { class: "card" },
      el("div", { class: "card-title" }, h3("About")),
      p("WebPanel — self-hosted Linux system management. Built with Fastify, Socket.IO, and a Vite/SPA frontend.", "text-sm")
    ),

    msg && el("div", { class: "badge badge-ok mt-2" }, msg)
  );
}
