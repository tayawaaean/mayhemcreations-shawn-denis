# Production Deployment Guide for Mayhem Creation

Complete step-by-step guide for deploying the Mayhem Creation e-commerce platform to production.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Server Setup](#server-setup)
3. [SSL Certificate Setup](#ssl-certificate-setup)
4. [Database Setup](#database-setup)
5. [Environment Variables](#environment-variables)
6. [Backend Deployment](#backend-deployment)
7. [Frontend Deployment](#frontend-deployment)
8. [Nginx Configuration](#nginx-configuration)
9. [Process Management (PM2)](#process-management-pm2)
10. [Firewall Configuration](#firewall-configuration)
11. [Monitoring and Maintenance](#monitoring-and-maintenance)
12. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Server Requirements

- **OS**: Ubuntu 20.04 LTS or later (recommended)
- **CPU**: 2+ cores
- **RAM**: 4GB minimum (8GB recommended)
- **Storage**: 20GB+ available space
- **Network**: Static IP address or dynamic DNS
- **Domain**: `mayhemcreation.com` with DNS configured

### Software Requirements

- Node.js 18.x or later
- npm 9.x or later
- MariaDB 11.x (MySQL-compatible)
- Nginx
- PM2 (for process management)
- Certbot (for SSL certificates)
- Git

### Domain DNS Configuration

Ensure your domain DNS records point to your server:

```
A Record:     mayhemcreation.com        → YOUR_SERVER_IP
A Record:     www.mayhemcreation.com   → YOUR_SERVER_IP
```

---

## Server Setup

### 1. Initial Server Configuration

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install essential packages
sudo apt install -y curl wget git build-essential

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should show v18.x.x
npm --version   # Should show 9.x.x

# Install MariaDB
sudo apt install -y mariadb-server mariadb-client
sudo mysql_secure_installation

# Install Nginx
sudo apt install -y nginx

# Install PM2 globally
sudo npm install -g pm2

# Install Certbot for SSL
sudo apt install -y certbot python3-certbot-nginx
```

### 2. Create Application User

```bash
# Create a dedicated user for the application
sudo adduser mayhem --disabled-password --gecos ""

# Add user to sudo group (if needed)
sudo usermod -aG sudo mayhem

# Create application directory
sudo mkdir -p /var/www/mayhem-creation
sudo chown mayhem:mayhem /var/www/mayhem-creation

# Create logs directory
sudo mkdir -p /var/log/mayhem-creation
sudo chown mayhem:mayhem /var/log/mayhem-creation
```

---

## SSL Certificate Setup

### 1. Obtain SSL Certificate with Let's Encrypt

```bash
# Stop Nginx temporarily
sudo systemctl stop nginx

# Obtain certificate (replace with your actual email)
sudo certbot certonly --standalone \
  -d mayhemcreation.com \
  -d www.mayhemcreation.com \
  --email main.mayhem.creation@gmail.com \
  --agree-tos \
  --non-interactive

# The certificates will be stored at:
# /etc/letsencrypt/live/mayhemcreation.com/fullchain.pem
# /etc/letsencrypt/live/mayhemcreation.com/privkey.pem
```

### 2. Set Up Auto-Renewal

```bash
# Test renewal
sudo certbot renew --dry-run

# Certbot will auto-renew certificates, but ensure Nginx reloads
# Add this to crontab or systemd timer
sudo systemctl enable certbot.timer
```

---

## Database Setup

### 1. Create Database and User

```bash
# Login to MariaDB
sudo mariadb -u root -p
# OR: sudo mysql -u root -p (mysql client works with MariaDB)

# In MariaDB prompt:
CREATE DATABASE mayhem_creation CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'mayhem_user'@'localhost' IDENTIFIED BY '5rQZYufErH97';
GRANT ALL PRIVILEGES ON mayhem_creation.* TO 'mayhem_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 2. Configure MariaDB for Production

Edit `/etc/mysql/mariadb.conf.d/50-server.cnf`:

```ini
[mysqld]
bind-address = 127.0.0.1
max_connections = 200
innodb_buffer_pool_size = 1G
innodb_log_file_size = 256M
```

Restart MariaDB:
```bash
sudo systemctl restart mariadb
# OR: sudo systemctl restart mysql (systemd service name)
```

**Note**: MariaDB uses MySQL-compatible syntax and commands. The `mysql` client command works with MariaDB.

---

## Environment Variables

### 1. Backend Environment Variables

Create `/var/www/mayhem-creation/backend/.env`:

```bash
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=mayhem_creation
DB_USER=mayhem_user
DB_PASSWORD=strong_password_here

# Server Configuration
PORT=5001
NODE_ENV=production
FRONTEND_URL=https://mayhemcreation.com

# Session Configuration
SESSION_SECRET=generate_strong_random_string_here_min_32_chars
SESSION_NAME=mayhem.sid

# JWT Configuration
JWT_SECRET=generate_strong_random_string_here_min_32_chars
JWT_EXPIRES_IN=7d

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password_here
EMAIL_FROM=Mayhem Creation <noreply@mayhemcreation.com>

# Stripe Configuration (Production)
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
STRIPE_SUCCESS_URL=https://mayhemcreation.com/payment/success
STRIPE_CANCEL_URL=https://mayhemcreation.com/payment/cancel

# PayPal Configuration (Production)
PAYPAL_CLIENT_ID=your_paypal_client_id_here
PAYPAL_CLIENT_SECRET=your_paypal_client_secret_here
PAYPAL_ENVIRONMENT=production
PAYPAL_WEBHOOK_ID_LIVE=your_live_webhook_id_here
PAYPAL_BRAND_NAME=Mayhem Creation
PAYPAL_SUCCESS_URL=https://mayhemcreation.com/payment/success
PAYPAL_CANCEL_URL=https://mayhemcreation.com/payment/cancel

# ShipStation / ShipEngine Configuration
SHIPSTATION_API_KEY=your_shipstation_or_shipengine_api_key_here
SHIPSTATION_API_SECRET=your_shipstation_api_secret_here
SHIPSTATION_BASE_URL=https://ssapi.shipstation.com

# OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here

# Security Configuration
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging Configuration
LOG_LEVEL=info
LOG_FILE=/var/log/mayhem-creation/combined.log
ERROR_LOG_FILE=/var/log/mayhem-creation/error.log

# CORS Configuration (comma-separated allowed origins)
CORS_ALLOWLIST=https://mayhemcreation.com,https://www.mayhemcreation.com

# Redis (Optional - for session store in production)
REDIS_URL=redis://localhost:6379
```

**Important**: 
- Generate strong secrets: `openssl rand -hex 32`
- Never commit `.env` files to version control
- Set file permissions: `chmod 600 .env`

### 2. Frontend Environment Variables

Create `/var/www/mayhem-creation/frontend/.env.production`:

```bash
VITE_API_BASE_URL=https://mayhemcreation.com/api/v1
VITE_SITE_URL=https://mayhemcreation.com
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_publishable_key_here
VITE_GOOGLE_CLIENT_ID=your_google_client_id_here

# Social Media Links (optional)
VITE_SOCIAL_ETSY=https://www.etsy.com/shop/yourshop
VITE_SOCIAL_TIKTOK=https://www.tiktok.com/@yourhandle
VITE_SOCIAL_FACEBOOK=https://www.facebook.com/yourpage
VITE_SOCIAL_INSTAGRAM=https://www.instagram.com/yourhandle
```

---

## Backend Deployment

### 1. Clone and Build Backend

```bash
cd /var/www/mayhem-creation

# Clone repository (or copy from local)
git clone https://github.com/your-org/mayhem-creations.git .
# OR: Copy files from your local machine using scp/rsync

# Navigate to backend
cd backend

# Install dependencies
npm install --production

# Build TypeScript
npm run build

# Run database migrations (if any)
# npm run migrate

# Seed initial data (roles, categories, etc.)
npm run seed
```

### 2. Test Backend

```bash
# Start backend manually to test
npm start

# Check if server starts correctly
curl http://localhost:5001/health

# Stop the server (Ctrl+C)
```

---

## Frontend Deployment

### 1. Build Frontend

```bash
cd /var/www/mayhem-creation/frontend

# Install dependencies
npm install

# Build for production
npm run build

# The build output will be in `frontend/dist/`
```

### 2. Verify Build Output

```bash
ls -la /var/www/mayhem-creation/frontend/dist
# Should contain: index.html, assets/, robots.txt, sitemap.xml, etc.
```

---

## Nginx Configuration

### 1. Copy Nginx Configuration

```bash
# Copy your nginx.conf to Nginx sites-available
sudo cp /var/www/mayhem-creation/nginx.conf /etc/nginx/sites-available/mayhem-creation

# Update SSL certificate paths if different
sudo nano /etc/nginx/sites-available/mayhem-creation

# Create symbolic link
sudo ln -s /etc/nginx/sites-available/mayhem-creation /etc/nginx/sites-enabled/

# Remove default site (optional)
sudo rm /etc/nginx/sites-enabled/default
```

### 2. Update Nginx Configuration Paths

Edit `/etc/nginx/sites-available/mayhem-creation` and ensure:

```nginx
# Update frontend root path
root /var/www/mayhem-creation/frontend/dist;

# Verify SSL certificate paths match your Let's Encrypt certificates
ssl_certificate /etc/letsencrypt/live/mayhemcreation.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/mayhemcreation.com/privkey.pem;
```

### 3. Test and Reload Nginx

```bash
# Test Nginx configuration
sudo nginx -t

# If test passes, reload Nginx
sudo systemctl reload nginx

# Check Nginx status
sudo systemctl status nginx
```

---

## Process Management (PM2)

### 1. Configure PM2

Create or use existing `ecosystem.config.js`:

```bash
cd /var/www/mayhem-creation
pm2 start ecosystem.config.js
```

### 2. PM2 Commands

```bash
# Start application
pm2 start ecosystem.config.js

# Stop application
pm2 stop ecosystem.config.js

# Restart application
pm2 restart ecosystem.config.js

# View logs
pm2 logs

# Monitor
pm2 monit

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the instructions provided by the command
```

### 3. PM2 Ecosystem Config Example

Your `ecosystem.config.js` should look like:

```javascript
module.exports = {
  apps: [{
    name: 'mayhem-backend',
    script: './backend/dist/server.js',
    cwd: '/var/www/mayhem-creation',
    instances: 2, // or 'max' for all CPU cores
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5001
    },
    error_file: '/var/log/mayhem-creation/pm2-error.log',
    out_file: '/var/log/mayhem-creation/pm2-out.log',
    log_file: '/var/log/mayhem-creation/pm2-combined.log',
    time: true,
    merge_logs: true,
    autorestart: true,
    max_memory_restart: '1G',
    watch: false
  }]
};
```

---

## Firewall Configuration

### 1. Configure UFW (Uncomplicated Firewall)

```bash
# Allow SSH (important - do this first!)
sudo ufw allow 22/tcp

# Allow HTTP
sudo ufw allow 80/tcp

# Allow HTTPS
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

**Note**: Backend (port 5001) should NOT be exposed - only accessible via Nginx reverse proxy.

---

## Monitoring and Maintenance

### 1. Log Monitoring

```bash
# Backend logs
tail -f /var/log/mayhem-creation/combined.log
tail -f /var/log/mayhem-creation/error.log

# Nginx logs
tail -f /var/log/nginx/mayhem_access.log
tail -f /var/log/nginx/mayhem_error.log

# PM2 logs
pm2 logs mayhem-backend
```

### 2. Health Checks

```bash
# Backend health
curl https://mayhemcreation.com/health

# Check SSL certificate
sudo certbot certificates

# Check Nginx status
sudo systemctl status nginx

# Check PM2 status
pm2 status
```

### 3. Backup Strategy

#### Database Backups

```bash
# Create backup script
sudo nano /usr/local/bin/backup-mayhem-db.sh

# Script content:
#!/bin/bash
BACKUP_DIR="/var/backups/mayhem-creation"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

mariadb-dump -u mayhem_user -p'5rQZYufErH97' mayhem_creation > \
  $BACKUP_DIR/mayhem_db_$DATE.sql
# OR: mysqldump -u mayhem_user -p'5rQZYufErH97' mayhem_creation > ... (mysql-dump works with MariaDB)

# Keep only last 7 days
find $BACKUP_DIR -name "mayhem_db_*.sql" -mtime +7 -delete

# Make executable
sudo chmod +x /usr/local/bin/backup-mayhem-db.sh

# Add to crontab (daily at 2 AM)
sudo crontab -e
# Add: 0 2 * * * /usr/local/bin/backup-mayhem-db.sh
```

#### Application Backups

```bash
# Backup application files
sudo tar -czf /var/backups/mayhem-creation/app_$(date +%Y%m%d).tar.gz \
  /var/www/mayhem-creation
```

### 4. Updates and Maintenance

```bash
# Update application code
cd /var/www/mayhem-creation
git pull origin main  # or your production branch

# Update backend
cd backend
npm install --production
npm run build
pm2 restart mayhem-backend

# Update frontend
cd ../frontend
npm install
npm run build
# Nginx will serve new build automatically

# Update system packages (monthly)
sudo apt update && sudo apt upgrade -y
```

---

## Troubleshooting

### Common Issues

#### 1. Backend Not Starting

```bash
# Check logs
pm2 logs mayhem-backend

# Check environment variables
cat /var/www/mayhem-creation/backend/.env

# Verify database connection
mariadb -u mayhem_user -p mayhem_creation
# OR: mysql -u mayhem_user -p mayhem_creation (mysql client works with MariaDB)

# Check port availability
sudo netstat -tulpn | grep 5001
```

#### 2. Nginx 502 Bad Gateway

```bash
# Check if backend is running
pm2 status

# Check backend logs
pm2 logs mayhem-backend

# Verify backend is accessible
curl http://localhost:5001/health

# Check Nginx error log
sudo tail -f /var/log/nginx/mayhem_error.log
```

#### 3. SSL Certificate Issues

```bash
# Test certificate renewal
sudo certbot renew --dry-run

# Manually renew if needed
sudo certbot renew

# Reload Nginx after renewal
sudo systemctl reload nginx
```

#### 4. Database Connection Issues

```bash
# Test MariaDB connection
mariadb -u mayhem_user -p mayhem_creation
# OR: mysql -u mayhem_user -p mayhem_creation (mysql client works with MariaDB)

# Check MariaDB status
sudo systemctl status mariadb
# OR: sudo systemctl status mysql (systemd service name)

# Verify credentials in .env match MariaDB user
```

#### 5. CORS Issues

Ensure `CORS_ALLOWLIST` in backend `.env` includes:
- `https://mayhemcreation.com`
- `https://www.mayhemcreation.com`

#### 6. Session Issues

- Ensure `SESSION_SECRET` is set and strong (32+ characters)
- Check session cookie settings in `backend/src/config/session.ts`
- Verify `saveUninitialized: false` in production

---

## Security Checklist

- [ ] Strong passwords for all services
- [ ] `.env` files have correct permissions (600)
- [ ] SSL certificates installed and auto-renewing
- [ ] Firewall configured (only 22, 80, 443 open)
- [ ] Backend not directly accessible (behind Nginx)
- [ ] Database user has limited privileges
- [ ] Regular security updates applied
- [ ] Backup strategy in place
- [ ] Monitoring and logging configured
- [ ] Rate limiting enabled in Nginx
- [ ] Security headers configured in Nginx
- [ ] Secrets stored securely (not in code)

---

## Post-Deployment Verification

### 1. Frontend Checks

```bash
# Homepage loads
curl https://mayhemcreation.com

# API responds
curl https://mayhemcreation.com/api/v1/health

# SSL valid
openssl s_client -connect mayhemcreation.com:443 -servername mayhemcreation.com
```

### 2. Backend API Checks

```bash
# Health check
curl https://mayhemcreation.com/health

# API endpoints
curl https://mayhemcreation.com/api/v1/categories
```

### 3. Payment Gateway Checks

- Verify Stripe webhook URL: `https://mayhemcreation.com/api/v1/webhooks/stripe`
- Verify PayPal webhook URL: `https://mayhemcreation.com/api/v1/webhooks/paypal`
- Test a payment flow end-to-end

### 4. Admin Access

- Login to admin dashboard: `https://mayhemcreation.com/admin`
- Verify all admin features work

---

## Additional Resources

- [Nginx Documentation](https://nginx.org/en/docs/)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Node.js Production Best Practices](https://nodejs.org/en/docs/guides/nodejs-docker-webapp/)

---

## Support

For issues or questions:
1. Check logs: `pm2 logs` and `/var/log/nginx/mayhem_error.log`
2. Review this deployment guide
3. Check application-specific documentation in `docs/` folder

---

**Last Updated**: 2025-11-02
**Version**: 1.0.0

