module.exports = {
  apps: [
    {
      name: "kazpam-dashboard",
      cwd: "C:/Users/user/Documents/KazPAM/dashboard",
      script: "node",
      args: "server.cjs",
      env: {
        NODE_ENV: "production"
      }
    }
  ]
};
