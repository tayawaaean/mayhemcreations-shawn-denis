#!/bin/bash

# Production Deployment Script for Mayhem Creations
# This script automates the deployment process using PM2

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="mayhemcreations"
BACKEND_DIR="./backend"
SERVICES_DIR="./services"
FRONTEND_DIR="./frontend"
LOG_DIR="./logs"
PM2_CONFIG="ecosystem.config.yaml"

# Functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
    exit 1
}

# Check if PM2 is installed
check_pm2() {
    if ! command -v pm2 &> /dev/null; then
        error "PM2 is not installed. Please install it with: npm install -g pm2"
    fi
    success "PM2 is installed"
}

# Check if Node.js version is compatible
check_node() {
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        error "Node.js version 18 or higher is required. Current version: $(node -v)"
    fi
    success "Node.js version is compatible: $(node -v)"
}

# Create necessary directories
create_directories() {
    log "Creating necessary directories..."
    mkdir -p "$LOG_DIR"
    mkdir -p "$BACKEND_DIR/logs"
    mkdir -p "$SERVICES_DIR/logs"
    success "Directories created"
}

# Install dependencies
install_dependencies() {
    log "Installing production dependencies..."
    
    # Backend dependencies
    cd "$BACKEND_DIR"
    npm ci --production --silent
    success "Backend dependencies installed"
    
    # Services dependencies
    cd "../$SERVICES_DIR"
    npm ci --production --silent
    success "Services dependencies installed"
    
    cd ..
}

# Build applications
build_applications() {
    log "Building applications..."
    
    # Build backend
    cd "$BACKEND_DIR"
    npm run build
    success "Backend built successfully"
    
    # Build services
    cd "../$SERVICES_DIR"
    npm run build
    success "Services built successfully"
    
    cd ..
}

# Check environment files
check_environment() {
    log "Checking environment files..."
    
    if [ ! -f "$BACKEND_DIR/.env" ]; then
        warning "Backend .env file not found. Please create it before deployment."
    else
        success "Backend .env file found"
    fi
    
    if [ ! -f "$SERVICES_DIR/.env" ]; then
        warning "Services .env file not found. Please create it before deployment."
    else
        success "Services .env file found"
    fi
}

# Stop existing PM2 processes
stop_existing() {
    log "Stopping existing PM2 processes..."
    pm2 stop all 2>/dev/null || true
    pm2 delete all 2>/dev/null || true
    success "Existing processes stopped"
}

# Start applications with PM2
start_applications() {
    log "Starting applications with PM2..."
    
    if [ -f "$PM2_CONFIG" ]; then
        pm2 start "$PM2_CONFIG" --env production
        success "Applications started with PM2"
    else
        error "PM2 configuration file not found: $PM2_CONFIG"
    fi
}

# Save PM2 configuration
save_pm2_config() {
    log "Saving PM2 configuration..."
    pm2 save
    success "PM2 configuration saved"
}

# Setup PM2 startup
setup_pm2_startup() {
    log "Setting up PM2 startup..."
    pm2 startup | grep -E '^sudo' | bash || warning "PM2 startup setup may require manual intervention"
    success "PM2 startup configured"
}

# Health check
health_check() {
    log "Performing health checks..."
    
    # Wait for applications to start
    sleep 10
    
    # Check backend
    if curl -f http://localhost:5001/api/health > /dev/null 2>&1; then
        success "Backend health check passed"
    else
        warning "Backend health check failed"
    fi
    
    # Check email service
    if curl -f http://localhost:5002/health > /dev/null 2>&1; then
        success "Email service health check passed"
    else
        warning "Email service health check failed"
    fi
}

# Show status
show_status() {
    log "Current PM2 status:"
    pm2 list
    pm2 logs --lines 10
}

# Main deployment function
deploy() {
    log "Starting production deployment for $APP_NAME..."
    
    check_pm2
    check_node
    create_directories
    check_environment
    install_dependencies
    build_applications
    stop_existing
    start_applications
    save_pm2_config
    setup_pm2_startup
    health_check
    show_status
    
    success "Deployment completed successfully!"
    log "Applications are running. Check status with: pm2 list"
    log "View logs with: pm2 logs"
    log "Monitor with: pm2 monit"
}

# Rollback function
rollback() {
    log "Rolling back deployment..."
    pm2 stop all
    pm2 delete all
    success "Rollback completed"
}

# Main script
case "${1:-deploy}" in
    deploy)
        deploy
        ;;
    rollback)
        rollback
        ;;
    status)
        pm2 list
        ;;
    logs)
        pm2 logs
        ;;
    restart)
        pm2 restart all
        ;;
    stop)
        pm2 stop all
        ;;
    start)
        pm2 start all
        ;;
    *)
        echo "Usage: $0 {deploy|rollback|status|logs|restart|stop|start}"
        echo ""
        echo "Commands:"
        echo "  deploy   - Deploy the application (default)"
        echo "  rollback - Rollback the deployment"
        echo "  status   - Show PM2 status"
        echo "  logs     - Show PM2 logs"
        echo "  restart  - Restart all applications"
        echo "  stop     - Stop all applications"
        echo "  start    - Start all applications"
        exit 1
        ;;
esac
