module.exports = {
  apps: [
    {
      name: 'writon-api',
      cwd: './server',
      script: 'src/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      }
    }
  ]
};
