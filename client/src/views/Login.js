import { el, p, icon, loading } from "../utils/dom.js";

export function LoginView({ token, api, nav }) {
  if (token) { nav("dashboard"); }

  const [email, setEmail] = ["admin", setEmail];
  const [password, setPassword] = ["test123", setPassword];
  const [msg, setMsg] = ["", setMsg];
  const [busy, setBusy] = [false, setBusy];

  function login(e) {
    e.preventDefault();
    setMsg("");
    setBusy(true);
    api.post("/api/auth/login", { username: email, password })
      .then(r => {
        if (r.ok && r.data.token) {
          localStorage.setItem("webpanel_token", r.data.token);
          nav("dashboard");
        } else {
          setMsg("Wrong username or password. Try <strong>admin / test123</strong>");
        }
      })
      .catch(() => setMsg("Connection error — is the server running?"))
      .finally(() => setBusy(false));
  }

  return el("div", { class: "login-wrap" },
    el("div", { class: "login-card" },
      el("div", { class: "text-center mb-4" },
        el("svg", { width: 44, height: 44, viewBox: "0 0 32 32", fill: "none", stroke: "currentColor", strokeWidth: 2 },
          `<rect x="4" y="4" width="24" height="24" rx="7"/><path d="M8 18 L16 10 L24 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>`
        ),
        el("h1", null, "WebPanel"),
        p("Sign in to manage your system.", "subtitle")
      ),
      msg && el("div", { class: "badge badge-danger mb-3", id: "login-msg" }, msg),
      el("form", { onsubmit: login },
        el("div", { class: "field" },
          el("label", null, "Username"),
          el("input", { class: "input", type: "text", value: email, oninput: v => setEmail(v.target.value) })
        ),
        el("div", { class: "field" },
          el("label", null, "Password"),
          el("input", { class: "input", type: "password", value: password, oninput: v => setPassword(v.target.value) })
        ),
        el("button", { class: "btn btn-primary w-full", type: "submit", disabled: busy },
          busy ? el("span", { class: "loading-ring" }) : null,
          "Sign in"
        )
      ),
      p("Demo account: <strong>admin</strong> / <strong>test123</strong>", "footer-note text-center")
    )
  );
}
