import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import os from "node:os";

const execFileAsync = promisify(execFile);

const docRoots = {
  nginx: ["/var/www/html", "/srv/www"],
  apache: ["/var/www/html", "/var/www/sites", "/srv/www"],
  caddy: ["/var/www", "/srv/www"],
};

const generator = {
  nginx(domain, pathPrefix, docRoot, ssl) {
    const sslBlock = ssl
      ? `listen 443 ssl;
  ssl_certificate /etc/letsencrypt/live/${domain}/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/${domain}/privkey.pem;
  location / {
      root /var/www/${domain};
      index index.html;
  }`
      : "";
    return `
server {
  listen 80;
  server_name ${domain};
  root /var/www/${domain};
  index index.html;
  location / { try_files $uri $uri/ /index.html; }
  ${sslBlock}
}
`;
  },

  apache(domain, pathPrefix, docRoot, ssl) {
    const sslBlock = ssl
      ? `  <IfModule mod_ssl.c>
  Listen 443
  <VirtualHost *:443>
    ServerName ${domain}
    DocumentRoot /var/www/${domain}
    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/${domain}/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/${domain}/privkey.pem
    <Directory /var/www/${domain}>
      AllowOverride All
      Require all granted
    </Directory>
  </VirtualHost>
  </IfModule>`
      : "";
    return `
<VirtualHost *:80>
  ServerName ${domain}
  DocumentRoot /var/www/${domain}
  <Directory /var/www/${domain}>
    AllowOverride All
    Require all granted
  </Directory>
  ${sslBlock}
</VirtualHost>
`;
  },
};

export const websiteService = {
  async listOrigins() {
    const docDirs = [];
    for (const [svc, dirs] of Object.entries(docRoots)) {
      for (const d of dirs) {
        if (fs.existsSync(d)) docDirs.push({ service: svc, root: d });
      }
    }
    return docDirs;
  },

  async listSites(docRoot) {
    try {
      const entries = await fsp.readdir(docRoot, { withFileTypes: true });
      return entries
        .filter((e) => e.isDirectory())
        .map((e) => ({ name: e.name, path: path.join(docRoot, e.name), type: "dir" }));
    } catch {
      return [];
    }
  },

  async generateConfig(svc, domain, ssl, docRoot) {
    const html = generator[svc](domain, "/", docRoot || `/var/www/html`, !!ssl);
    const file = path.resolve(`/etc/${svc}/conf.d/${domain}.conf`);
    await fsp.mkdir(path.dirname(file), { recursive: true });
    await fsp.writeFile(file, html, "utf8");
    return { file, content: html };
  },

  async installCertbot(domain, email) {
    let out = "";
    const cmds = [];
    if (process.platform === "linux") {
      if (await this.nginxInstalled()) cmds.push("certbot --nginx -d " + domain + " -m " + email + " --non-interactive --agree-tos");
      else cmds.push("certbot certonly --standalone -d " + domain + " -m " + email + " --non-interactive --agree-tos");
    }
    for (const c of cmds) {
      out += await execFileAsync("bash", ["-c", c], { timeout: 60000 }).then((r) => r.stdout).catch((e) => e.message);
    }
    return { ok: true, output: out };
  },

  async checkPrereqs(svc) {
    const exists = (name) => fs.existsSync(`/usr/sbin/${name}` || `/usr/bin/${name}`);
    const checks = {
      nginx: { installed: exists("nginx"), config: "/etc/nginx/nginx.conf", test: "nginx -t" },
      apache: { installed: exists("apache2"), config: "/etc/apache2/apache2.conf", test: "apache2ctl -t" },
      mysql: { installed: exists("mysqld"), config: "/etc/mysql/mysql.conf.d/mysqld.cnf", test: "mysql --version" },
      certbot: { installed: exists("certbot"), config: "/etc/letsencrypt/cli.conf", test: "certbot --version" },
    };
    return checks[svc] || {};
  },

  async nginxInstalled() {
    try {
      await execFileAsync("nginx", ["-v"], { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  },

  async apacheInstalled() {
    try {
      await execFileAsync("apache2ctl", ["-v"], { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  },

  async mysqlInstalled() {
    try {
      await execFileAsync("mysql", ["--version"], { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  },
};
