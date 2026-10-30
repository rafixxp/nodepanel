import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import os from "node:os";
import fs from "node:fs";
import path from "node:path";

const execFileAsync = promisify(execFile);

const SSH = process.env.SSH_PROBE === "1" || process.env.SYSTEM_HOST !== "127.0.0.1";

function sh(cmd) {
  return execFileAsync("bash", ["-c", cmd], { timeout: 15000 }).then((r) => r.stdout.trim());
}

export const systemService = {
  async systemInfo() {
    const [cpus, mem, load, osInfo, drives, net] = await Promise.all([
      sh("nproc"),
      sh("free -b | awk 'NR==2{printf \"%.2f GiB / %.2f GiB\", $3/1024/1024, $2/1024/1024}'"),
      sh("cat /proc/loadavg | awk '{printf \"%.2f %.2f %.2f\", $1, $2, $3}'"),
      sh("cat /etc/os-release | grep PRETTY_NAME | cut -d= -f2-"),
      sh("df -h / | tail -1 | awk '{gsub(/%/,\"\"); print $5\"%\" \" on \" $6}'"),
      sh("ip -brief addr show | head -6 | tr '\\n' ' '"),
    ]);
    // Await each sh() result so the returned values are plain strings,
    // not pending Promises (JSON.stringify would render them as {}).  
    const uptime = await sh("cat /proc/uptime | awk '{printf \"%.0f s\", $1}'");
    const hostname = await sh("hostname");
    return {
      cpuCores: Number(cpus),
      memory: mem,
      load: load.split(" "),
      os: osInfo,
      disk: drives,
      network: net,
      uptime,
      hostname,
    };
  },

  async processList() {
    // /proc sampling gives the best information without installing psutil.
    const entries = await sh("ls /proc | grep -E '^[0-9]+$'").then((v) => v.split("\n").filter(Boolean));
    const list = [];
    for (const pid of entries) {
      try {
        const cmd = await sh(`cat /proc/${pid}/comm 2>/dev/null`).catch(() => "");
        const state = await sh(`awk '/^State/{print $2}' /proc/${pid}/status 2>/dev/null`).catch(() => "");
        if (!cmd) continue;
        const cpu = await sh(`awk '/^cpu/{print $2}' /proc/${pid}/stat 2>/dev/null`).catch(() => "0");
        list.push({ pid: Number(pid), name: cmd, state, cpu: Number(cpu) || 0, user: "" });
      } catch {
        /* skip */
      }
    }
    return list.sort((a, b) => b.cpu - a.cpu).slice(0, 200);
  },

  async processStream(opts) {
    // Returns a Readable that emits JSON lines of process updates.
    const child = spawn("bash", ["-c", `watch -n${opts.interval || 1.5} -d true`], { stdio: ["ignore", "pipe", "ignore"] });
    // The watch trick is a fallback; below is the /proc polling implementation
    // we actually use as the primary stream.
    const { Readable } = await import("node:stream");
    const stream = new Readable({ objectMode: true });
    let running = true;
    let timer = null;

    const tick = async () => {
      if (!running) return;
      const list = await this.processList();
      stream.push(JSON.stringify({ timestamp: Date.now(), processes: list }));
      timer = setTimeout(() => tick(), (opts.interval || 1.5) * 1000);
    };
    tick();

    stream.on("error", () => {});
    stream._read = () => {}; // pause/resume handled by backpressure on push

    stream.destroy = () => {
      running = false;
      clearTimeout(timer);
      child.kill();
    };
    return stream;
  },

  async serviceList() {
    const raw = await sh("systemctl list-units --type=service --all --no-pager --no-legend 2>/dev/null || systemctl list-units --type=service --all --no-pager 2>/dev/null || true");
    const services = [];
    for (const line of raw.split("\n")) {
      const m = line.match(/^(\S+)\s+(\S+)\s+(\S+)\s+(.*)/);
      if (m) services.push({ unit: m[1], active: m[2], sub: m[3], description: m[4] });
    }
    return services;
  },

  async serviceStatus(name) {
    const r = await sh(`systemctl is-active "${name}" 2>/dev/null || echo unknown`);
    return { name, active: r };
  },

  async serviceEnable(name) {
    await sh(`systemctl enable "${name}" 2>/dev/null`);
    return { name, enabled: true };
  },
  async serviceDisable(name) {
    await sh(`systemctl disable "${name}" 2>/dev/null`);
    return { name, enabled: false };
  },
  async serviceRestart(name) {
    await sh(`systemctl restart "${name}" 2>/dev/null`);
    return { name, restarted: true };
  },
  async sessionList() {
    // List SSH + login sessions from /run/user and utmp where available.
    const sessions = [];
    try {
      const raw = await sh("who 2>/dev/null || last -F 2>/dev/null | head -20 || true");
      for (const line of raw.split("\n")) {
        const m = line.match(/(\S+)\s+(\S+)\s+(\S+)\s+(.*)/);
        if (m) sessions.push({ user: m[1], tty: m[2], host: m[3], session: m[4] });
      }
    } catch {
      /* ignore */
    }
    return sessions;
  },

  async diskUsage() {
    const rows = await sh("df -h --total=0 2>/dev/null | tail -n +2").then((v) => v.split("\n"));
    return rows.map((r) => {
      const p = r.split(/\s+/).filter(Boolean);
      return { filesystem: p[0] || "", size: p[1] || "", used: p[2] || "", avail: p[3] || "", use: p[4] || "", mount: p[5] || "" };
    });
  },

  async networkInterfaces() {
    const out = {};
    const raw = await sh("ip -o addr show 2>/dev/null || true");
    for (const line of raw.split("\n")) {
      const m = line.match(/^([^\s]+):\s+(.*)/);
      if (m) {
        const iface = m[1];
        const addr = m[2].split(" ").filter(Boolean)[0] || "";
        out[iface] = addr;
      }
    }
    return out;
  },

  async nginxConfigTest() {
    try {
      await sh("nginx -t 2>&1");
      return { ok: true, error: "" };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  },

  async certbotCertExists(domain) {
    const r = await sh(`bash -c "find /etc/letsencrypt/live -maxdepth 1 -type d -name '${domain}' 2>/dev/null"`);
    return r.length > 0;
  },
};
