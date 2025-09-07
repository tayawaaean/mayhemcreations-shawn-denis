#!/bin/bash

# E-commerce Application Deployment Script
# Run as root or with sudo privileges

set -e

echo "🚀 Starting E-commerce Application Deployment"

# Configuration
APP_USER="nodeuser"
APP_GROUP="nodeuser"
APP_DIR="/var/www/ecommerce-api"
FRONTEND_DIR="/var/www/ecommerce-frontend"
NGINX_SITES_DIR="/etc/nginx/sites-available"
NGINX_ENABLED_DIR="/etc/nginx/sites-enabled"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   log_error "This script must be run as root or with sudo"
   exit 1
fi

# Update system packages
log_info "Updating system packages..."
apt-get update && apt-get upgrade -y

# Install required packages
log_info "Installing required packages..."
apt-get install -y curl wget gnupg2 software-properties-common apt-transport-https ca-certificates

# Install Node.js (using NodeSource repository)
log_info "Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Install PM2 globally for process management
log_info "Installing PM2..."
npm install -g pm2

# Install nginx
log_info "Installing nginx..."
apt-get install -y nginx

# Install MariaDB
log_info "Installing MariaDB..."
apt-get install -y mariadb-server mariadb-client

# Install Elasticsearch
log_info "Installing Elasticsearch..."
wget -qO - https://artifacts.elastic.co/GPG-KEY-elasticsearch | apt-key add -
echo "deb https://artifacts.elastic.co/packages/8.x/apt stable main" | tee /etc/apt/sources.list.d/elastic-8.x.list
apt-get update && apt-get install -y elasticsearch

# Create application user
log_info "Creating application user..."
if ! id "$APP_USER" &>/dev/null; then
    useradd -r -s /bin/bash -d "$APP_DIR" -m "$APP_USER"
    usermod -a -G "$APP_GROUP" "$APP_USER"
fi

# Create application directories
log_info "Creating application directories..."
mkdir -p "$APP_DIR"/{logs,uploads,jobs,tmp}
mkdir -p "$FRONTEND_DIR"
chown -R "$APP_USER:$APP_GROUP" "$APP_DIR"
chown -R "$APP_USER:$APP_GROUP" "$FRONTEND_DIR"

# Set up nginx directories and permissions
log_info "Setting up nginx..."
mkdir -p /var/log/nginx
mkdir -p /etc/nginx/sites-available
mkdir -p /etc/nginx/sites-enabled
mkdir -p /var/www/html

# Create nginx user if it doesn't exist
if ! id "nginx" &>/dev/null; then
    useradd -r -s /bin/false nginx
fi

# Set up MariaDB
log_info "Configuring MariaDB..."
systemctl enable mariadb
systemctl start mariadb

# Secure MariaDB installation (you'll need to run mysql_secure_installation manually)
log_warn "Please run 'mysql_secure_installation' after this script completes"

# Configure MariaDB for sessions
log_info "Creating MariaDB session database..."
mysql -u root -p << EOF
CREATE DATABASE IF NOT EXISTS ecommerce_sessions;
CREATE USER IF NOT EXISTS 'ecommerce_user'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON ecommerce_sessions.* TO 'ecommerce_user'@'localhost';
FLUSH PRIVILEGES;
EOF

# Set up Elasticsearch
log_info "Configuring Elasticsearch..."
systemctl enable elasticsearch
systemctl start elasticsearch

# Configure Elasticsearch for single-node
cat > /etc/elasticsearch/elasticsearch.yml << EOF
cluster.name: ecommerce-cluster
node.name: ecommerce-node-1
path.data: /var/lib/elasticsearch
path.logs: /var/log/elasticsearch
network.host: localhost
http.port: 9200
discovery.type: single-node
xpack.security.enabled: false
EOF

# Restart Elasticsearch with new configuration
systemctl restart elasticsearch

# Create application environment file template
log_info "Creating environment file template..."
cat > "$APP_DIR/.env.example" << EOF
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=ecommerce
DB_USER=ecommerce_user
DB_PASSWORD=your_secure_password

# Session Configuration
SESSION_SECRET=your_very_secure_session_secret
SESSION_NAME=ecommerce_session

# Security
JWT_SECRET=your_jwt_secret_key
ENCRYPTION_KEY=your_32_character_encryption_key

# Application
NODE_ENV=production
PORT=3000

# Elasticsearch
ELASTICSEARCH_URL=http://localhost:9200

# File Upload
UPLOAD_DIR=$APP_DIR/uploads
MAX_FILE_SIZE=50MB

# Email Configuration (configure with your SMTP settings)
SMTP_HOST=smtp.your-email-provider.com
SMTP_PORT=587
SMTP_USER=your-email@yourdomain.com
SMTP_PASS=your-email-password

# Payment Configuration (add your keys)
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key

# Cloud Storage (if using AWS S3 or Cloudinary)
# AWS_ACCESS_KEY_ID=your_aws_access_key
# AWS_SECRET_ACCESS_KEY=your_aws_secret_key
# AWS_S3_BUCKET=your-s3-bucket
# CLOUDINARY_CLOUD_NAME=your_cloud_name
# CLOUDINARY_API_KEY=your_api_key
# CLOUDINARY_API_SECRET=your_api_secret
EOF

chown "$APP_USER:$APP_GROUP" "$APP_DIR/.env.example"

# Set up log rotation
log_info "Setting up log rotation..."
cat > /etc/logrotate.d/ecommerce-api << EOF
$APP_DIR/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 $APP_USER $APP_GROUP
    postrotate
        systemctl reload ecommerce-api.service > /dev/null 2>&1 || true
    endscript
}
EOF

# Create nginx log rotation
cat > /etc/logrotate.d/nginx << EOF
/var/log/nginx/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 0644 nginx nginx
    postrotate
        systemctl reload nginx.service > /dev/null 2>&1 || true
    endscript
}
EOF

# Set up firewall (basic configuration)
log_info "Configuring firewall..."
if command -v ufw >/dev/null 2>&1; then
    ufw --force enable
    ufw default deny incoming
    ufw default allow outgoing
    ufw allow ssh
    ufw allow 'Nginx Full'
    ufw allow 3000/tcp  # Node.js API (can be restricted later)
    log_info "Firewall configured. Nginx Full profile allowed."
else
    log_warn "UFW not found. Please configure firewall manually."
fi

# Create SSL certificate directory
log_info "Creating SSL certificate directory..."
mkdir -p /etc/ssl/certs
mkdir -p /etc/ssl/private
chmod 700 /etc/ssl/private

# Generate self-signed certificate for testing (replace with real certificate)
log_info "Generating self-signed SSL certificate for testing..."
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/ssl/private/yourdomain.com.key \
    -out /etc/ssl/certs/yourdomain.com.crt \
    -subj "/C=US/ST=State/L=City/O=Organization/CN=yourdomain.com"

# Generate dhparam for better SSL security
log_info "Generating DH parameters (this may take a while)..."
openssl dhparam -out /etc/ssl/certs/dhparam.pem 2048

# Set correct permissions for SSL files
chmod 600 /etc/ssl/private/yourdomain.com.key
chmod 644 /etc/ssl/certs/yourdomain.com.crt
chmod 644 /etc/ssl/certs/dhparam.pem

# Enable services
log_info "Enabling services..."
systemctl enable nginx
systemctl enable mariadb
systemctl enable elasticsearch

# Create application deployment script
log_info "Creating application deployment script..."
cat > "$APP_DIR/deploy.sh" << 'EOF'
#!/bin/bash

# Application deployment script
set -e

APP_DIR="/var/www/ecommerce-api"
FRONTEND_DIR="/var/www/ecommerce-frontend"

cd "$APP_DIR"

# Pull latest code (you'll need to set up Git repository)
# git pull origin main

# Install/update dependencies
npm ci --production

# Build TypeScript
npm run build

# Run database migrations
npm run migrate

# Restart services
sudo systemctl restart ecommerce-api.service
sudo systemctl reload nginx

# Check health
sleep 5
curl -f http://localhost:3000/health || exit 1

echo "✅ Deployment completed successfully!"
EOF

chmod +x "$APP_DIR/deploy.sh"
chown "$APP_USER:$APP_GROUP" "$APP_DIR/deploy.sh"

# Create backup script
log_info "Creating backup script..."
cat > /usr/local/bin/backup-ecommerce.sh << EOF
#!/bin/bash

# E-commerce backup script
BACKUP_DIR="/var/backups/ecommerce"
DATE=\$(date +%Y%m%d_%H%M%S)

mkdir -p "\$BACKUP_DIR"

# Backup database
mysqldump -u root -p ecommerce > "\$BACKUP_DIR/database_\$DATE.sql"

# Backup uploads
tar -czf "\$BACKUP_DIR/uploads_\$DATE.tar.gz" -C "$APP_DIR" uploads

# Backup application code
tar -czf "\$BACKUP_DIR/application_\$DATE.tar.gz" -C "$APP_DIR" --exclude=node_modules --exclude=logs .

# Clean old backups (keep 7 days)
find "\$BACKUP_DIR" -name "*.sql" -mtime +7 -delete
find "\$BACKUP_DIR" -name "*.tar.gz" -mtime +7 -delete

echo "✅ Backup completed: \$DATE"
EOF

chmod +x /usr/local/bin/backup-ecommerce.sh

# Add backup to crontab
log_info "Setting up daily backups..."
(crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/backup-ecommerce.sh >> /var/log/backup.log 2>&1") | crontab -

# Final instructions
log_info "🎉 Deployment setup completed!"
echo
echo "Next steps:"
echo "1. Copy your application code to $APP_DIR"
echo "2. Copy your built React app to $FRONTEND_DIR/build"
echo "3. Copy the nginx configuration files to their respective locations"
echo "4. Configure your .env file based on .env.example"
echo "5. Install application dependencies: cd $APP_DIR && npm install"
echo "6. Build the application: npm run build"
echo "7. Run database migrations: npm run migrate"
echo "8. Copy the systemd service file to /etc/systemd/system/"
echo "9. Enable and start the service: systemctl enable ecommerce-api.service && systemctl start ecommerce-api.service"
echo "10. Configure nginx virtual host and restart nginx"
echo "11. Run mysql_secure_installation"
echo "12. Replace self-signed SSL certificate with real one"
echo
log_warn "Remember to:"
echo "- Change all default passwords in .env file"
echo "- Configure your domain name in nginx config"
echo "- Set up proper SSL certificates"
echo "- Configure your email SMTP settings"
echo "- Add your payment provider keys"
echo "- Test all functionality thoroughly"
echo
log_info "Logs will be available in:"
echo "- Application: $APP_DIR/logs/"
echo "- Nginx: /var/log/nginx/"
echo "- System: journalctl -u ecommerce-api.service"