import { el, p, icon, h3, loading } from "../utils/dom.js";

export function TerminalsView({ token, api, nav }) {
  const [session, setSession] = ["", setSession];
  const [output, setOutput] = ["", setOutput];
  const [cmd, setCmd] = ["", setCmd];
  const [busy, setBusy] = [false, setBusy];

  async function init() {
    const r = await api.get("/api/terminal/session");
    setSession(r.ok ? r.data.sessionId : "local");
    await run("$ id && $ ps aux | head -5");
  }

  async function run(command) {
    setBusy(true);
    setOutput(prev => prev + "\n$ " + command);
    const r = await api.post("/api/terminal/run", { command, shell: "/bin/bash" });
    setOutput(prev => prev + (r.data.stdout || "") + (r.data.stderr || ""));
    setBusy(false);
  }

  // Poll output so typing is echoed in real time
  const poll = setInterval(async () => {
    // keep-alive
  }, 15000);

  // Use a shared terminal: the server sends live process updates via Socket.IO
  // but the terminal uses short polling of a simple command engine. For the
  // interactive UX we use the command runner above.

  if (!session) {
    init();
    return el("div", { class: "terminal-view" },
      el("div", { class: "terminal-body" },
        el("div", { class: "terminal-header" }, "Web Terminal", h3("Initializing...")),
        el("div", { class: "terminal-output" }, loading())
      )
    );
  }

  return el("div", { class: "terminal-view" },
    el("div", { class: "terminal-toolbar" },
      el("h3", null, "Web Terminal"),
      el("span", { class: "text-xs text-secondary" }, `session ${session}`),
      el("div", { class: "spacer" }),

      el("button", { class: "btn btn-ghost btn-sm", onclick: async () => { await run("echo '--- system ---'; uptime; free -h; df -h /; " ); } }, icon.refresh, "Run uptime"),
      el("button", { class: "btn btn-ghost btn-sm", onclick: () => nav("systems") }, "Go to Systems")
    ),

    el("div", { class: "terminal-body" },
      el("div", { class: "terminal-header" }, "Console", "PID " + (navigator.userAgent ? "" : "")),
      el("div", { class: "terminal-output", style: "min-height: 420px" }, output),
      el("div", { class: "terminal-input" },
        el("input", { class: "input", value: cmd, oninput: e => setCmd(e.target.value), placeholder: "type a command..." }),
        el("button", { class: "btn btn-primary btn-sm", type: "button", onclick: async () => { if (cmd.trim()) await run(cmd); setCmd(""); } }, icon.play, "Enter")
      )
    )
  );
}
