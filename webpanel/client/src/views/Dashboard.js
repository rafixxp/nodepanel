import { el, p, icon, badge, h3, h2 } from "../utils/dom.js";

export function DashboardView({ token, api, nav }) {
  const [info, setInfo] = [null, setInfo];
  const [procs, setProcs] = [[], setProcs];
  const [loading, setLoading] = [true, setLoading];
  const [updating, setUpdating] = [false, setUpdating];

  async function load() {
    setLoading(true);
    const [i, s] = await Promise.all([api.get("/api/system/info"), api.get("/api/system/processes")]);
    setInfo(i.ok ? i.data : null);
    setProcs(i.ok ? s.data.processes : []);
    setLoading(false);
  }

  // Re-fetch processes every 3s via SSE is too complex for now; poll lightweight.
  setInterval(() => { api.get("/api/system/processes").then(r => setProcs(r.ok ? r.data.processes : [])); }, 3000);

  load();

  if (!info) return el("div", null, "Loading...");

  const mem = info.memory || "…";
  const loadPct = info.load ? ((parseFloat(info.load[0]) + parseFloat(info.load[1]) + parseFloat(info.load[2])) / 3) * 100 : 0;

  function statusBadge(label, cls) { return badge(label, cls); }

  const procList = procs.slice(0, 8).map(p =>
    el("tr", null,
      el("td", { class: "num" }, p.pid || "…"),
      el("td", null, p.name || "…"),
      el("td", { class: "num" }, p.cpu != null ? `${p.cpu.toFixed(1)}%` : "…"),
      el("td", null, p.state || "…")
    )
  );

  return el("div", null,
    // KPI cards
    el("div", { class: "dashboard-grid" },
      el("div", { class: "widget" },
        el("div", { class: "widget-header" },
          h3("CPU"), badge(info.cpuCores ?? "?", "badge-ok")
        ),
        el("div", { class: "value" }, info.cpuCores ?? "…"), h2("cores")
      ),
      el("div", { class: "widget" },
        el("div", { class: "widget-header" },
          h3("Memory"), badge("8GB", "badge-ok")
        ),
        el("div", { class: "value" }, mem), h2("used of total")
      ),
      el("div", { class: "widget" },
        el("div", { class: "widget-header" },
          h3("Load"), badge("0.50", loadPct > 80 ? "badge-danger" : loadPct > 50 ? "badge-warn" : "badge-ok")
        ),
        el("div", { class: "value" }, info.load ? info.load.join(" ") : "…"), h2("1/5/15 min avg")
      ),
      el("div", { class: "widget" },
        el("div", { class: "widget-header" },
          h3("Disk"), badge("34%", "badge-ok")
        ),
        el("div", { class: "value" }, info.disk || "…"), h2("root usage")
      ),
    ),

    // System details row
    el("div", { class: "grid grid-cols-2 gap-2 mt-2" },
      el("div", { class: "card" },
        el("div", { class: "card-title" }, h3("System"), el("span", null, info.os || "…")),
        p(`Uptime: <strong>${info.uptime || "…"}</strong>`, "text-sm mt-2"),
        p(`Hostname: <strong>${info.hostname || "…"}</strong>`, "text-sm")
      ),
      el("div", { class: "card" },
        el("div", { class: "card-title" }, h3("Network")),
        p(`${info.network || "…"}`.replace(/\s+/g, " ").slice(0, 120) + (info.network && info.network.length > 120 ? "…" : ""), "text-sm")
      ),
    ),

    // Live process table
    el("div", { class: "card mt-2" },
      el("div", { class: "card-title" },
        h3("Live Processes"),
        el("span", { class: "text-xs text-secondary" }, "auto-refresh")
      ),
      el("div", { class: "table-wrapper" },
        el("table", null,
          el("thead", null,
            el("tr", null,
              el("th", null, "PID"), el("th", null, "Name"), el("th", { class: "num" }, "CPU"), el("th", null, "Status")
            )
          ),
          el("tbody", null, procList.length ? procList : [el("tr", null, el("td", { colspan: 4 }, "No processes found."))])
        )
      )
    ),

    // Recent activity
    el("div", { class: "card mt-2" },
      el("div", { class: "card-title" }, h3("Recent Sessions")),
      p("SSH and login sessions are monitored in real time. Open the Systems view for details.", "text-sm")
    )
  );
}
