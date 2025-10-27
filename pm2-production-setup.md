# PM2 Production Setup Guide for Mayhem Creations

## Overview
This guide covers deploying your Mayhem Creations application using PM2 in production, with Nginx serving the frontend statically.

## Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     Nginx       │    │   PM2 Backend   │    │ PM2 Email Svc   │
│  (Port 80/443)  │────│   (Port 5001)   │    │   (Port 5002)   │
│  Static Files   │    │   API Routes    │    │  Email/WebSocket│
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Prerequisites

### 1. Install PM2 Globally
```bash
npm install -g pm2
```

### 2. Install PM2 Logrotate (Optional but Recommended)
```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
pm2 set pm2-logrotate:compress true
```

## Production Deployment

### 1. Build Applications
```bash
# Build backend
cd backend
npm ci --production
npm run build

# Build services
cd ../services
npm ci --production
npm run build
```

### 2. Environment Files
Create production environment files:

**backend/.env.production**
```env
NODE_ENV=production
PORT=5001
DB_HOST=your-db-host
DB_USER=your-db-user
DB_PASSWORD=your-db-password
DB_NAME=mayhem_creation
# ... other production variables
```

**services/.env.production**
```env
NODE_ENV=production
PORT=5002
EMAIL_HOST=your-smtp-host
EMAIL_USER=your-email-user
EMAIL_PASS=your-email-password
# ... other production variables
```

### 3. Start with PM2
```bash
# Start all applications
pm2 start ecosystem.config.yaml --env production

# Or start specific app
pm2 start ecosystem.config.yaml --only mayhem-backend --env production
pm2 start ecosystem.config.yaml --only mayhem-email-service --env production
```

### 4. Save PM2 Configuration
```bash
pm2 save
pm2 startup
```

## PM2 Management Commands

### Basic Commands
```bash
# View all processes
pm2 list

# View logs
pm2 logs
pm2 logs mayhem-backend
pm2 logs mayhem-email-service

# Restart applications
pm2 restart all
pm2 restart mayhem-backend

# Stop applications
pm2 stop all
pm2 stop mayhem-backend

# Delete applications
pm2 delete all
pm2 delete mayhem-backend

# Reload (zero-downtime restart)
pm2 reload all
pm2 reload mayhem-backend
```

### Monitoring Commands
```bash
# Real-time monitoring
pm2 monit

# Process information
pm2 show mayhem-backend

# Process list with details
pm2 jlist
```

### Log Management
```bash
# View logs with timestamps
pm2 logs --timestamp

# Clear logs
pm2 flush

# View specific log file
pm2 logs mayhem-backend --lines 100
```

## Nginx Configuration

### 1. Install Nginx
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install nginx

# CentOS/RHEL
sudo yum install nginx
```

### 2. Nginx Configuration
Create `/etc/nginx/sites-available/mayhemcreations`:

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;
    
    # SSL Configuration
    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # Security Headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Frontend Static Files
    root /var/www/mayhemcreations/frontend/dist;
    index index.html;
    
    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    # API Routes - Backend
    location /api/ {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
    
    # WebSocket Routes - Backend
    location /socket.io/ {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Email Service Routes
    location /email/ {
        proxy_pass http://localhost:5002;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Static Files with Caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }
    
    # SPA Routing - All other routes go to index.html
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Security - Block access to sensitive files
    location ~ /\. {
        deny all;
    }
    
    location ~ \.(env|log|sql)$ {
        deny all;
    }
}
```

### 3. Enable Site
```bash
sudo ln -s /etc/nginx/sites-available/mayhemcreations /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Production Checklist

### Pre-Deployment
- [ ] Environment variables configured
- [ ] Database migrations completed
- [ ] SSL certificates installed
- [ ] Domain DNS configured
- [ ] Firewall rules set (ports 80, 443, 22)

### Post-Deployment
- [ ] PM2 processes running
- [ ] Nginx serving frontend
- [ ] API endpoints responding
- [ ] WebSocket connections working
- [ ] Email service functional
- [ ] Logs being generated
- [ ] Monitoring in place

## Monitoring and Maintenance

### 1. Health Checks
```bash
# Check if services are running
pm2 status

# Check API health
curl http://localhost:5001/api/health

# Check email service
curl http://localhost:5002/health
```

### 2. Log Rotation
```bash
# Install logrotate
pm2 install pm2-logrotate

# Configure log rotation
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
pm2 set pm2-logrotate:compress true
```

### 3. Backup Strategy
```bash
# Database backup
mysqldump -u username -p mayhem_creation > backup_$(date +%Y%m%d_%H%M%S).sql

# Application backup
tar -czf mayhemcreations_backup_$(date +%Y%m%d_%H%M%S).tar.gz /var/www/mayhemcreations
```

## Troubleshooting

### Common Issues
1. **Port conflicts**: Check if ports 5001/5002 are available
2. **Permission issues**: Ensure proper file permissions
3. **Environment variables**: Verify .env files are loaded
4. **Database connections**: Check database connectivity
5. **Memory issues**: Monitor memory usage with `pm2 monit`

### Useful Commands
```bash
# View detailed process info
pm2 show mayhem-backend

# View real-time logs
pm2 logs --follow

# Restart with zero downtime
pm2 reload all

# Check system resources
pm2 monit
```

## Security Considerations

1. **Firewall**: Only open necessary ports
2. **SSL**: Use strong SSL configuration
3. **Environment**: Keep .env files secure
4. **Updates**: Regularly update dependencies
5. **Monitoring**: Set up proper logging and monitoring
6. **Backups**: Implement regular backup strategy
