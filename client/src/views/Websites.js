import { el, p, icon, badge, h3, emptyState, loading, btn } from "../utils/dom.js";

export function WebsitesView({ token, api, nav }) {
  const [origins, setOrigins] = [[], setOrigins];
  const [sites, setSites] = [[], setSites];
  const [loading, setLoading] = [true, setLoading];
  const [domain, setDomain] = ["", setDomain];
  const [service, setService] = ["nginx", setService];
  const [ssl, setSsl] = [false, setSsl];
  const [step, setStep] = ["list", setStep];
  const [msg, setMsg] = ["", setMsg];

  async function refresh() {
    setLoading(true);
    const [o, s] = await Promise.all([api.get("/api/website/origins"), api.get("/api/website/sites")]);
    setOrigins(o.ok ? o.data.origins : []);
    setSites(o.ok ? o.data.sites : []);
    setLoading(false);
  }
  refresh();
  setInterval(refresh, 5000);

  function renderOrigin(o) {
    const exists = sites.some(s => s.name === o.root);
    return el("div", { class: "card" },
      el("div", { class: "card-title" }, h3(`${o.service} — doc root`), el("span", { class: "text-xs text-secondary" }, o.root)),
      p(exists ? "Website already present." : "Add a domain below to generate a server block.", "text-sm")
    );
  }

  const originsList = origins.map(o => renderOrigin(o));
  const sitesList = sites.map(s =>
    el("div", { class: "card" },
      el("div", { class: "card-title" }, h3(s.name), el("span", { class: "text-xs text-secondary" }, s.path || ""))
    )
  );

  function renderCreate() {
    return el("div", { class: "card" },
      el("div", { class: "card-title" }, h3("Create Website"), el("span", { class: "text-xs text-secondary" }, "generates the site config")) ,
      el("div", { class: "field" },
        el("label", null, "Domain"),
        el("input", { class: "input", type: "text", value: domain, oninput: e => setDomain(e.target.value), placeholder: "example.com" })
      ),
      el("div", { class: "field" },
        el("label", null, "Service"),
        el("select", { class: "select", value: service, onchange: e => setService(e.target.value) },
          el("option", { value: "nginx" }, "nginx"),
          el("option", { value: "apache" }, "Apache"),
        )
      ),
      el("div", { class: "field" },
        el("label", null, "Document root"),
        el("input", { class: "input", type: "text", value: "/var/www/html", oninput: e => setDomain(e.target.value), placeholder: "/var/www/html" })
      ),
      el("div", { class: "field" },
        el("label", null, "SSL (Let's Encrypt)"),
        el("div", { class: "flex gap-2" },
          el("label", { style: "display:flex;align-items:center;gap:0.4rem" },
            el("input", { type: "checkbox", checked: ssl, onchange: e => setSsl(e.target.checked) })
          ),
          el("span", { class: "text-sm" }, "Request certbot certificate")
        )
      ),
      el("div", { class: "card-actions" },
        el("button", { class: "btn btn-primary btn-sm", onclick: async () => {
          const r = await api.post("/api/website/create", { domain, service, docRoot: "/var/www/html" });
          if (r.ok) setMsg("Config written: " + r.data.configFile); else setMsg(r.data.error);
        } }, "Generate Config"),
        ssl && el("button", { class: "btn btn-ghost btn-sm", onclick: async () => {
          const r = await api.post("/api/website/ssl", { domain, email: "admin@" + domain, service });
          if (r.ok) setMsg("SSL: " + r.data.output); else setMsg(r.data.error);
        } }, "Request SSL")
      )
    );
  }

  return el("div", null,
    el("div", { class: "card" },
      el("div", { class: "card-title" }, h3("Origins"),
        el("span", { class: "text-xs text-secondary" }, "detected document roots"))
      ,
      originsList.length ? originsList : [emptyState("No origins", "No document roots detected. Add a website below.")],
    ),

    el("div", { class: "card" },
      el("div", { class: "card-title" }, h3("Sites"),
        el("span", { class: "text-xs text-secondary" }, `${sites.length} site(s)`))
      ,
      sitesList.length ? sitesList : [emptyState("No sites", "Create a website to get started.")],
    ),

    renderCreate(),
    msg && el("div", { class: "badge badge-ok mt-2" }, msg)
  );
}
