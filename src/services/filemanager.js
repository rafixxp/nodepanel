import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import os from "node:os";

// Root directory the file manager is allowed to browse. Default: user home.
export const DEFAULT_ROOT = process.env.FILE_MANAGER_ROOT || path.join(os.homedir(), "webpanelFiles");

function resolveRoot(base, rel) {
  const resolved = path.resolve(base, "..", rel);
  if (resolved === base || resolved.startsWith(base + path.sep) || resolved === base + "\\") return resolved;
  return base;
}

export const fileManagerService = {
  async listFiles(root, rel) {
    const full = path.resolve(root, rel || ".");
    const entries = await fsp.readdir(full, { withFileTypes: true });
    const list = [];
    for (const entry of entries) {
      const fullPath = path.join(full, entry.name);
      try {
        const stat = await fsp.stat(fullPath);
        list.push({
          name: entry.name,
          path: path.posix.join(rel || "", entry.name),
          type: entry.isDirectory() ? "dir" : "file",
          size: stat.size,
          mtime: stat.mtimeMs,
          readable: stat.isDirectory() || (stat.mode & 0o400),
        });
      } catch {
        /* skip unreadable */
      }
    }
    return list.sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === "dir" ? -1 : 1));
  },

  async readFile(root, rel) {
    const full = path.resolve(root, rel);
    return { name: path.basename(full), content: await fsp.readFile(full, "utf8") };
  },

  async writeFile(root, rel, content) {
    const full = path.resolve(root, rel);
    await fsp.mkdir(path.dirname(full), { recursive: true });
    await fsp.writeFile(full, content, "utf8");
    return { ok: true };
  },

  async deleteEntry(root, rel) {
    const full = path.resolve(root, rel);
    await fsp.rm(full, { recursive: true, force: true });
    return { ok: true };
  },

  async createFolder(root, rel, name) {
    const full = path.resolve(root, rel, name);
    await fsp.mkdir(full, { recursive: true });
    return { ok: true };
  },

  async upload(root, rel, file) {
    const full = path.resolve(root, rel, file.name);
    await fsp.mkdir(path.dirname(full), { recursive: true });
    await fsp.writeFile(full, file.data, file.type.startsWith("text/") ? "utf8" : "binary");
    return { ok: true, path: path.posix.join(rel, file.name) };
  },
};
