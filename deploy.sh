#!/bin/bash
set -e

# === CONFIG ===
REPO_URL="https://github.com/tayawaaean/mayhemcreations-shawn-denis.git"
BRANCH="error-logging"
TMP_DIR="error-logging"
PM2_CONFIG="ecosystem.config.yaml"

# === PROMPT ===
echo "Which project do you want to deploy?"
select PROJECT in "backend" "frontend" "services"; do
    if [[ -n "$PROJECT" ]]; then
        echo "Deploying $PROJECT..."
        break
    else
        echo "Invalid choice. Try again."
    fi
done

# === CLONE NEW CODE ===
echo "Cloning repository..."
rm -rf "$TMP_DIR"
git clone -b "$BRANCH" "$REPO_URL" "$TMP_DIR"

# === PRESERVE ENV FILES ===
echo "Preserving .env files..."
if [[ "$PROJECT" == "backend" ]]; then
    cp "./backend/.env" "./.env.tmp"
elif [[ "$PROJECT" == "frontend" ]]; then
    cp "./frontend/.env.development" "./.env.development.tmp"
    cp "./frontend/.env.production" "./.env.production.tmp"
elif [[ "$PROJECT" == "services" ]]; then
    cp "./services/.env" "./.env.tmp"
fi

# === REPLACE OLD PROJECT FOLDER ===
echo "Replacing old $PROJECT folder..."
rm -rf "$PROJECT"
mv "$TMP_DIR/$PROJECT" ./

# === RESTORE ENV FILES ===
echo "Restoring environment files..."
if [[ "$PROJECT" == "backend" ]]; then
    mv "./.env.tmp" "./backend/.env"
elif [[ "$PROJECT" == "frontend" ]]; then
    mv "./.env.development.tmp" "./frontend/.env.development"
    mv "./.env.production.tmp" "./frontend/.env.production"
elif [[ "$PROJECT" == "services" ]]; then
    mv "./.env.tmp" "./services/.env"
fi

# === INSTALL AND BUILD ===
echo "Installing dependencies..."
cd "$PROJECT"
npm install

if [[ "$PROJECT" == "frontend" || "$PROJECT" == "services" || "$PROJECT" == "backend" ]]; then
    npm run build
fi
cd ..

if [[ "$PROJECT" == "frontend" ]]; then
    sudo systemctl restart nginx
fi

# === PM2 RESTART ===
if [[ "$PROJECT" == "services" || "$PROJECT" == "backend" ]]; then
    echo "Restarting PM2 apps..."
    pm2 delete "$PM2_CONFIG" || true
    pm2 start "$PM2_CONFIG"
    pm2 save
fi


echo "✅ Deployment complete for $PROJECT"
