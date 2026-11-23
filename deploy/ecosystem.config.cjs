// pm2 definition of what runs on the demo server (see docs/DEPLOYMENT.md section 9).
// Environment comes from /opt/deepnotes/.env (kept outside the repo, chmod 600).
// Start once with: pm2 start deploy/ecosystem.config.cjs && pm2 save
module.exports = {
  apps: [
    {
      name: "deepnotes-api",
      cwd: "/opt/deepnotes/app/backend",
      script: "dist/server.js",
      node_args: "--env-file=/opt/deepnotes/.env",
      instances: 1,
      exec_mode: "fork",
      // the server has 1 GB shared with other projects; restart before this process hurts them
      max_memory_restart: "250M",
      env: { NODE_ENV: "production", PORT: "4000" },
      out_file: "/opt/deepnotes/logs/api.out.log",
      error_file: "/opt/deepnotes/logs/api.err.log",
      time: true,
    },
    {
      // Cloudflare quick tunnel. The empty --config is essential: another project's ~/.cloudflared/config.yml
      // would otherwise be loaded and every request would get an empty 404.
      name: "deepnotes-tunnel",
      script: "cloudflared",
      args: "tunnel --config /opt/deepnotes/cloudflared-quick.yml --no-autoupdate --url http://127.0.0.1:4000",
      autorestart: true,
    },
  ],
};
