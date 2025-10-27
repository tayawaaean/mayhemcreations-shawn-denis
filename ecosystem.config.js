// PM2 Ecosystem Configuration for Mayhem Creations Production
// This configuration manages both backend API and email services
// Frontend will be served statically via Nginx

module.exports = {
  apps: [
    // Backend API Service
    {
      name: 'mayhem-backend',
      script: 'dist/server.js',
      cwd: './backend',
      instances: 2,
      exec_mode: 'cluster',
      node_args: '--env-file=.env',
      env: {
        NODE_ENV: 'production',
        PORT: 5001,
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 5001,
      },
      env_staging: {
        NODE_ENV: 'staging',
        PORT: 5001,
      },
      // Process Management
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
      max_memory_restart: '1G',
      // Logging
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      // Advanced Features
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'dist'],
      // Health Monitoring
      health_check_grace_period: 3000,
      // Auto restart on file changes (disabled for production)
      watch_options: {
        followSymlinks: false,
      },
      // Environment specific settings
      source_map_support: true,
      // Process title
      instance_var: 'INSTANCE_ID',
    },

    // Email Service
    {
      name: 'mayhem-email-service',
      script: 'dist/server.js',
      cwd: './services',
      instances: 1,
      exec_mode: 'fork',
      node_args: '--env-file=.env',
      env: {
        NODE_ENV: 'production',
        PORT: 5002,
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 5002,
      },
      env_staging: {
        NODE_ENV: 'staging',
        PORT: 5002,
      },
      // Process Management
      min_uptime: '10s',
      max_restarts: 5,
      restart_delay: 4000,
      max_memory_restart: '512M',
      // Logging
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      // Advanced Features
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'dist'],
      // Health Monitoring
      health_check_grace_period: 3000,
      // Process title
      instance_var: 'INSTANCE_ID',
    },
  ],

  // Deployment Configuration
  deploy: {
    production: {
      user: 'mayhem',
      host: 'your-server.com',
      ref: 'origin/main',
      repo: 'https://github.com/your-username/mayhemcreations-shawn-denis.git',
      path: '/var/www/mayhemcreations',
      'pre-deploy-local': '',
      'post-deploy': `
        cd backend && npm ci --production
        cd ../services && npm ci --production
        cd ../backend && npm run build
        cd ../services && npm run build
        pm2 reload ecosystem.config.js --env production
        pm2 save
      `,
      'pre-setup': '',
    },
  },
};
