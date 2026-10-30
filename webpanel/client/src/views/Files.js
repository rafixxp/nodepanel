import { el, p, icon, badge, h3, emptyState, loading, btn } from "../utils/dom.js";

export function FilesView({ token, api, nav }) {
  const [files, setFiles] = [[], setFiles];
  const [currentDir, setCurrentDir] = ["", setCurrentDir];
  const [root, setRoot] = ["/", setRoot];
  const [loading, setLoading] = [true, setLoading];
  const [msg, setMsg] = ["", setMsg];
  const [dragOver, setDragOver] = [false, setDragOver];

  async function load(rel = "") {
    setLoading(true);
    const r = await api.get(`/api/file/tree?root=${encodeURIComponent(root)}&rel=${encodeURIComponent(rel)}`);
    setFiles(r.ok ? r.data.files : []);
    setCurrentDir(rel);
    setLoading(false);
  }

  load();

  function goUp() {
    const up = currentDir.split("/").slice(0, -1).join("/") || "/";
    load(up);
  }

  function openDir(name) {
    const rel = currentDir ? `${currentDir}/${name}` : name;
    load(rel);
  }

  function selectFile(name) {
    api.get(`/api/file/read?root=${encodeURIComponent(root)}&rel=${encodeURIComponent(currentDir ? currentDir + "/" + name : name)}`)
      .then(r => {
        if (r.ok) { alert("File contents:\n\n" + r.data.file.content); }
      });
  }

  function deleteEntry(name) {
    if (!confirm(`Delete ${name}?`)) return;
    api.delete(`/api/file/delete?root=${encodeURIComponent(root)}&rel=${encodeURIComponent(currentDir ? currentDir + "/" + name : name)}`)
      .then(r => { if (r.ok) load(currentDir); else setMsg("Delete failed"); });
  }

  function createFolder(name) {
    api.post("/api/file/folder", { root, rel: currentDir, name })
      .then(r => { if (r.ok) load(currentDir); });
  }

  function ftypeIcon(name) {
    if (name.endsWith(".js")) return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 16 12 12 8 16"/><path d="M12 12v12"/><circle cx="12" cy="4" r="1.5" fill="currentColor"/></svg>';
    if (name.endsWith(".json")) return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6v6H9z"/><line x1="9" y1="2" x2="9" y2="6"/><line x1="15" y1="2" x2="15" y2="6"/></svg>';
    if (name.endsWith(".png") || name.endsWith(".jpg") || name.endsWith(".svg")) return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/><path d="M21 15l-5-5L5 21"/></svg>';
    if (name.endsWith(".html")) return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';
    if (name.endsWith(".txt")) return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';
    return icon.file;
  }

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1048576).toFixed(1) + " MB";
  }

  function fileRows() {
    return files.map(f => {
      const isDir = f.type === "dir";
      return el("tr", null,
        el("td", null,
          el("button", { class: "w-full text-left", onclick: () => isDir ? openDir(f.name) : selectFile(f.name) },
            el("span", { class: "file-icon" }, ftypeIcon(f.name)),
            el("span", { class: "file-name" }, f.name)
          )
        ),
        el("td", { class: "num" }, isDir ? "—" : formatSize(f.size)),
        el("td", null, new Date(f.mtime || 0).toLocaleDateString() + " " + new Date(f.mtime || 0).toLocaleTimeString()),
        el("td", null,
          isDir ? null :
          el("button", { class: "btn btn-ghost btn-sm", onclick: e => { e.stopPropagation(); copyText(f.path); } }, icon.download)
        ),
        el("td", null,
          el("button", { class: "btn btn-ghost btn-sm", onclick: e => { e.stopPropagation(); deleteEntry(f.name); } }, icon.trash)
        )
      );
    });
  }

  return el("div", null,
    el("div", { class: "card-toolbar" },
      el("div", { class: "card-toolbar-left" },
        el("div", { class: "segmented" },
          ["/", "/tmp", "/var/log", "/etc", "/home"].map(d =>
            el("button", { class: "segmented-item" + (d === root ? " active" : ""), onclick: () => { setRoot(d); load(""); } },
              d === "/" ? "root" : d.split("/").pop()
            )
          )
        ),
        currentDir && p(currentDir.replace(`${root}/`, ""), "path")
      ),
      el("div", { class: "card-toolbar-right" },
        el("button", { class: "btn btn-primary btn-sm", onclick: () => { const name = prompt("New folder name:"); if (name) createFolder(name); } },
          icon.plus, "New Folder"
        ),
        el("button", { class: "btn btn-ghost btn-sm", onclick: goUp }, "↑ Back")
      )
    ),

    el("div", { class: "card" },
      el("div", { class: "card-title" }, h3("File Browser"), el("span", { class: "text-xs text-secondary" }, `${files.length} items in ${currentDir || root}`)),
      el("div", { class: "table-wrapper" },
        el("table", null,
          el("thead", null,
            el("tr", null,
              el("th", null, "Name"), el("th", { class: "num" }, "Size"), el("th", null, "Modified"), el("th", { class: "text-right" }, "Actions")
            )
          ),
          el("tbody", null,
            files.length ? fileRows() : [el("tr", null, el("td", { colspan: 4 }, "No files yet — use Upload or New Folder."))]
          )
        )
      )
    ),

    el("div", { class: "card dropzone", ondragover: e => { e.preventDefault(); setDragOver(true); }, ondragleave: e => setDragOver(false), ondrop: e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) upload(f); } },
      el("div", { class: "dropzone-inner" },
        dragOver ? el("div", { class: "dropzone-active" }, icon.upload, "Drop files to upload") :
          el("div", null,
            icon.upload,
            el("p", null, "Drop files anywhere to upload"),
            el("button", { class: "btn btn-sm btn-ghost", onclick: () => document.getElementById("upload-input").click() }, "Choose files")
          )
      ),
      el("input", { id: "upload-input", type: "file", style: "display:none", onchange: e => { const f = e.target.files[0]; if (f) upload(f); e.target.value = ""; } })
    ),

    msg && el("div", { class: "badge badge-danger mt-2" }, msg)
  );

  async function upload(file) {
    const form = new FormData();
    form.append("file", file);
    const r = await api.post("/api/file/upload", form);
    if (r.ok) { load(currentDir); setMsg("Uploaded: " + file.name); }
    else setMsg("Upload failed");
  }
}
