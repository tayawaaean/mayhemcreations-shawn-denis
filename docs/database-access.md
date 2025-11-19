# Database Access Guide for Ubuntu Server

## Prerequisites
- SSH access to your Ubuntu server
- Database credentials from your `.env` file

## Method 1: Command Line Access (via SSH)

### Step 1: SSH into your server
```bash
ssh username@your-server-ip
```

### Step 2: Connect to MySQL
```bash
# Using MySQL client
mysql -u root -p

# Or with specific database
mysql -u root -p mayhem_creations

# Or with full connection string
mysql -h localhost -P 3306 -u root -p mayhem_creations
```

### Step 3: Enter your password
Enter the password from your `.env` file (`DB_PASSWORD`)

### Common MySQL Commands
```sql
-- Show all databases
SHOW DATABASES;

-- Use a specific database
USE mayhem_creations;

-- Show all tables
SHOW TABLES;

-- Describe a table structure
DESCRIBE table_name;

-- View table data
SELECT * FROM table_name LIMIT 10;

-- Exit MySQL
EXIT;
```

## Method 2: Remote Access via SSH Tunnel

If you want to use a GUI tool from your local machine:

### Step 1: Create SSH tunnel
```bash
# On your local machine
ssh -L 3307:localhost:3306 username@your-server-ip

# This forwards local port 3307 to server's port 3306
# Keep this terminal open while using the database
```

### Step 2: Connect GUI tool
Use these connection settings:
- **Host:** `localhost` (or `127.0.0.1`)
- **Port:** `3307` (the forwarded port)
- **Username:** `root` (or your DB_USER)
- **Password:** Your DB_PASSWORD
- **Database:** `mayhem_creations` (or your DB_NAME)

## Method 3: GUI Tools

### Option A: MySQL Workbench
1. Download from: https://dev.mysql.com/downloads/workbench/
2. Create new connection:
   - Connection Method: Standard TCP/IP over SSH
   - SSH Hostname: `your-server-ip`
   - SSH Username: `your-ssh-username`
   - SSH Password/Key: Your SSH credentials
   - MySQL Hostname: `localhost`
   - MySQL Port: `3306`
   - Username: `root` (or your DB_USER)
   - Password: Your DB_PASSWORD
   - Default Schema: `mayhem_creations`

### Option B: DBeaver (Free, Cross-platform)
1. Download from: https://dbeaver.io/download/
2. Create new connection:
   - Database: MySQL
   - Server Host: `your-server-ip`
   - Port: `3306`
   - Database: `mayhem_creations`
   - Username: `root`
   - Password: Your DB_PASSWORD
   - **Important:** Enable SSH tunnel if MySQL is not exposed publicly

### Option C: phpMyAdmin (Web-based)
1. Install on server:
```bash
sudo apt update
sudo apt install phpmyadmin
```
2. Access via: `http://your-server-ip/phpmyadmin`

## Method 4: Direct Remote Access (Not Recommended for Production)

⚠️ **Security Warning:** Only enable this if absolutely necessary and secure it properly.

### Step 1: Configure MySQL to allow remote connections
```bash
# Edit MySQL config
sudo nano /etc/mysql/mysql.conf.d/mysqld.cnf

# Comment out or change:
# bind-address = 127.0.0.1
# To:
bind-address = 0.0.0.0

# Restart MySQL
sudo systemctl restart mysql
```

### Step 2: Create remote user (if needed)
```sql
-- Connect to MySQL
mysql -u root -p

-- Create user for remote access
CREATE USER 'remote_user'@'%' IDENTIFIED BY 'strong_password';
GRANT ALL PRIVILEGES ON mayhem_creations.* TO 'remote_user'@'%';
FLUSH PRIVILEGES;
EXIT;
```

### Step 3: Configure firewall
```bash
# Allow MySQL port through firewall
sudo ufw allow 3306/tcp
sudo ufw reload
```

## Troubleshooting

### Check if MySQL is running
```bash
sudo systemctl status mysql
# or
sudo systemctl status mysqld
```

### Check MySQL port
```bash
sudo netstat -tlnp | grep 3306
# or
sudo ss -tlnp | grep 3306
```

### View MySQL error logs
```bash
sudo tail -f /var/log/mysql/error.log
```

### Reset MySQL root password (if forgotten)
```bash
# Stop MySQL
sudo systemctl stop mysql

# Start MySQL in safe mode
sudo mysqld_safe --skip-grant-tables &

# Connect without password
mysql -u root

# Reset password
USE mysql;
UPDATE user SET authentication_string=PASSWORD('new_password') WHERE User='root';
FLUSH PRIVILEGES;
EXIT;

# Restart MySQL normally
sudo systemctl restart mysql
```

## Security Best Practices

1. **Never expose MySQL port publicly** - Use SSH tunnel instead
2. **Use strong passwords** - Change default root password
3. **Create specific users** - Don't use root for applications
4. **Limit user privileges** - Grant only necessary permissions
5. **Enable SSL** - For production databases
6. **Regular backups** - Set up automated backups

## Quick Access Script

Create a helper script on your server:

```bash
# Create file
nano ~/db-access.sh

# Add content:
#!/bin/bash
DB_USER=$(grep DB_USER /path/to/your/backend/.env | cut -d '=' -f2)
DB_PASSWORD=$(grep DB_PASSWORD /path/to/your/backend/.env | cut -d '=' -f2)
DB_NAME=$(grep DB_NAME /path/to/your/backend/.env | cut -d '=' -f2)

mysql -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME"

# Make executable
chmod +x ~/db-access.sh

# Use it
~/db-access.sh
```

## Finding Your Database Credentials

Your database credentials are in your `.env` file:
```bash
# On your server
cd /path/to/your/backend
cat .env | grep DB_
```

Look for:
- `DB_HOST=localhost` (or your database server IP)
- `DB_PORT=3306`
- `DB_NAME=mayhem_creations` (or your database name)
- `DB_USER=root` (or your database user)
- `DB_PASSWORD=your_password_here` (your database password)

