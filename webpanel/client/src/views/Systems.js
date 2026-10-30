import { el, p, icon, badge, h3, emptyState, loading, btn } from "../utils/dom.js";

export function SystemsView({ token, api, nav }) {
  const [procs, setProcs] = [[], setProcs];
  const [services, setServices] = [[], setServices];
  const [sessions, setSessions] = [[], setSessions];
  const [loading, setLoading] = [true, setLoading];
  const [selProc, setSelProc] = ["", setSelProc];

  async function refresh() {
    setLoading(true);
    const [s, svc, ses] = await Promise.all([
      api.get("/api/system/processes"),
      api.get("/api/system/services"),
      api.get("/api/system/sessions"),
    ]);
    setProcs(r1 => r1.ok ? r1.data.processes : []);
    setServices(r2 => r2.ok ? r2.data.services : []);
    setSessions(r3 => r3.ok ? r3.data.sessions : []);
    setLoading(false);
  }
  refresh();
  setInterval(refresh, 4000);

  const procRows = procs.map(p =>
    el("tr", null,
      el("td", { class: "num" }, p.pid),
      el("td", null, p.name || "…"),
      el("td", { class: "num" }, p.cpu != null ? `${p.cpu.toFixed(1)}%` : "…"),
      el("td", null, p.state || "…")
    )
  );

  const svcRows = services.map(svc => {
    const active = svc.active || "inactive";
    return el("tr", null,
      el("td", null, svc.unit || "…"),
      el("td", null, svc.description || "…"),
      el("td", null,
        active === "active" ? badge("active", "badge-ok") :
        active === "failed" ? badge("failed", "badge-danger") :
        badge(active, "badge-muted")
      )
    );
  });

  const sessRows = sessions.map(s =>
    el("tr", null,
      el("td", null, s.user || "…"),
      el("td", null, s.tty || "…"),
      el("td", null, s.host || "…"),
      el("td", null, s.session || "…")
    )
  );

  const runCommand = cmd => {
    if (!cmd.trim()) return;
    api.post("/api/terminal/run", { command: cmd })
      .then(r => {
        if (r.ok) alert("Output: " + (r.data.stdout || r.data.stderr || "")).catch(() => {});
      });
  };

  return el("div", null,
    // Processes
    el("div", { class: "card" },
      el("div", { class: "card-title" }, h3("Processes"), el("span", { class: "text-xs text-secondary" }, "top CPU consumers"))
      ,
      el("div", { class: "table-wrapper" },
        el("table", null,
          el("thead", null,
            el("tr", null,
              el("th", null, "PID"), el("th", null, "Name"), el("th", { class: "num" }, "CPU"), el("th", null, "Status")
            )
          ),
          el("tbody", null, procRows.length ? procRows : [el("tr", null, el("td", { colspan: 4 }, "No processes."))])
        )
      )
    ),

    // Services
    el("div", { class: "card" },
      el("div", { class: "card-title" }, h3("Systemd Services"), el("span", { class: "text-xs text-secondary" }, "manage systemd units"))
      ,
      el("div", { class: "table-wrapper" },
        el("table", null,
          el("thead", null,
            el("tr", null,
              el("th", null, "Unit"), el("th", null, "Description"), el("th", null, "Status")
            )
          ),
          el("tbody", null, svcRows.length ? svcRows : [el("tr", null, el("td", { colspan: 3 }, "No services."))])
        )
      )
    ),

    // Sessions
    el("div", { class: "card" },
      el("div", { class: "card-title" }, h3("Sessions"), el("span", { class: "text-xs text-secondary" }, "active SSH & login sessions"))
      ,
      el("div", { class: "table-wrapper" },
        el("table", null,
          el("thead", null,
            el("tr", null,
              el("th", null, "User"), el("th", null, "TTY"), el("th", null, "Host"), el("th", null, "Session")
            )
          ),
          el("tbody", null, sessRows.length ? sessRows : [el("tr", null, el("td", { colspan: 4 }, "No active sessions."))])
        )
      )
    ),

    // Terminal quick-run
    el("div", { class: "card" },
      el("div", { class: "card-title" }, h3("Quick Command"), el("span", { class: "text-xs text-secondary" }, "run arbitrary command"))
      ,
      el("div", null,
        el("form", { onsubmit: e => { e.preventDefault(); runCommand(e.target.command.value); e.target.command.value = ""; } },
          el("input", { class: "input", placeholder: "e.g. systemctl restart nginx", name: "command" }),
          el("button", { class: "btn btn-primary btn-sm", type: "submit" }, "Run", icon.terminal)
        )
      )
    )
  );
}
