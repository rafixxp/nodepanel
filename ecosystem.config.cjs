module.exports = {
  apps: [
    {
      name: "webpanel",
      script: "src/start.js",
      cwd: process.cwd(),
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        HOST: "0.0.0.0",
        PORT: "8080",
      },
      env_production: {
        NODE_ENV: "production",
        HOST: "0.0.0.0",
        PORT: "8080",
      },
    },
  ],
};
