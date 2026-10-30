// WebPanel — SPA (framework-free)
import { LoginView } from "./views/Login.js";
import { DashboardView } from "./views/Dashboard.js";
import { SystemsView } from "./views/Systems.js";
import { FilesView } from "./views/Files.js";
import { WebsitesView } from "./views/Websites.js";
import { TerminalsView } from "./views/Terminals.js";
import { SettingsView } from "./views/Settings.js";
import { el, icon, getTheme, setTheme } from "./utils/dom.js";

const STORAGE = { theme: "webpanel_theme", token: "webpanel_token" };

const views = {
  login: LoginView, dashboard: DashboardView, systems: SystemsView,
  files: FilesView, websites: WebsitesView, terminals: TerminalsView, settings: SettingsView,
};

const LABELS = { login: "Sign in", dashboard: "Dashboard", systems: "Systems", files: "File Manager", websites: "Websites", terminals: "Web Terminal", settings: "Settings" };

const api = {
  async get(path) {
    const r = await fetch(path, { headers: { "x-auth-token": getToken() } });
    if (r.status === 401) { logout(); return { ok: false, status: r.status, data: null }; }
    return { ok: r.ok, status: r.status, data: await r.json() };
  },
  async post(path, body) {
    const r = await fetch(path, {
      method: "POST", headers: { "Content-Type": "application/json", "x-auth-token": getToken() },
      body: body ? JSON.stringify(body) : null,
    });
    if (r.status === 401) { logout(); return { ok: false, status: r.status, data: null }; }
    return { ok: r.ok, status: r.status, data: await r.json() };
  },
};

function getToken() { return localStorage.getItem(STORAGE.token); }
function setToken(t) { t ? localStorage.setItem(STORAGE.token, t) : localStorage.removeItem(STORAGE.token); }
function logout() { setToken(null); window.location.hash = "#login"; }

function App() {
  let state = {
    token: getToken(),
    theme: getTheme(),
    view: window.location.hash.replace("#", "") || "login",
  };

  window.addEventListener("hashchange", () => {
    state.view = window.location.hash.replace("#", "") || "login";
    if (state.view === "login" && state.token) setToken(state.token);
    if (state.view !== "login") state.token = getToken();
    render();
  });

  function nav(view) { window.location.hash = `#${view}`; }

  function toggleTheme() {
    const t = state.theme === "light" ? "dark" : "light";
    setTheme(t);
    state.theme = t;
    document.documentElement.setAttribute("data-theme", t);
    render();
  }

  async function render() {
    const View = views[state.view] || views.login;
    const content = el("div", null, View({ token: state.token, api, nav, state }));

    const app = el("div", { id: "app", class: "app-shell" },
      el("div", { class: `sidebar${state.view === "login" ? "" : " collapsed"}` },
        el("div", { class: "sidebar-header" },
          el("div", { class: "sidebar-brand" },
            el("svg", { width: 30, height: 30, viewBox: "0 0 32 32", fill: "none", stroke: "currentColor", strokeWidth: 2 },
              `<rect x="4" y="4" width="24" height="24" rx="7"/><path d="M8 18 L16 10 L24 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>`
            ),
            el("span", null, "WebPanel")
          ),
          el("button", { class: "btn btn-ghost btn-sm", style: "padding:0.4rem 0.6rem", onclick: toggleTheme },
            getTheme() === "light" ? "Dark" : "Light"
          )
        ),
        el("nav", { class: "sidebar-nav" },
          Object.entries(views).map(([id]) => {
            const visible = ["login", "dashboard", "systems", "files", "websites", "terminals", "settings"].includes(id);
            return visible ? `
              <button class="sidebar-item${state.view === id ? " active" : ""}" data-nav="${id}" onclick="app.nav('${id}')">
                <span class="sidebar-icon">${icon[id] || icon.dashboard}</span>
                <span class="sidebar-label">${LABELS[id]}</span>
              </button>
            ` : "";
          }).join(""),
          el("div", { class: "sidebar-footer" },
            el("button", { class: "btn btn-ghost btn-sm", style: "padding:0.4rem 0.6rem", onclick: () => state.view !== "login" && (state.view = "login") }, "Close")
          )
        )
      ),
      el("div", { class: "main" },
        el("div", { class: "header" },
          el("div", { class: "header-left" },
            el("h1", { class: "header-title" }, LABELS[state.view] || state.view),
            el("span", { class: "header-subtitle" }, state.view === "dashboard" ? "Overview of your system" : LABELS[state.view])
          ),
          el("div", { class: "header-actions" },
            getTheme() === "light" ? "Dark" : "Light",
            state.token ? el("button", { class: "btn btn-ghost btn-sm", onclick: logout }, icon.logout, "Sign out") :
              el("button", { class: "btn btn-primary btn-sm", onclick: () => nav("login") }, "Sign in")
          )
        ),
        el("div", { class: "content" }, content)
      )
    );

    document.getElementById("app").replaceWith(app);
  }

  setTimeout(() => {
    document.querySelectorAll("[data-nav]").forEach(b => {
      b.addEventListener("click", () => {
        state.view = b.dataset.nav;
        if (state.view !== "login") state.token = getToken();
        window.location.hash = `#${state.view}`;
      });
    });
  }, 0);

  render();
  return { mount: () => {}, update: render };
}

export function createApp() {
  const app = App();
  return app;
}

export { el, icon, getTheme, setTheme };
