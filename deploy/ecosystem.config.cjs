// pm2 process definition. Environment comes from /opt/deepnotes/.env (kept outside the repo, chmod 600).
module.exports = {
  apps: [
    {
      name: "deepnotes-api",
      cwd: "/opt/deepnotes/app/backend",
      script: "dist/server.js",
      node_args: "--env-file=/opt/deepnotes/.env",
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "500M",
      env: { NODE_ENV: "production", UPLOAD_DIR: "/opt/deepnotes/uploads" },
      out_file: "/opt/deepnotes/logs/api.out.log",
      error_file: "/opt/deepnotes/logs/api.err.log",
      time: true,
    },
  ],
};
