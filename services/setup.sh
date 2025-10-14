#!/bin/bash

echo "🚀 Setting up Chat Email Service..."

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp env.example .env
    echo "⚠️  Please update .env file with your SMTP credentials and admin email"
fi

# Create logs directory if it doesn't exist
mkdir -p logs

echo "✅ Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Update .env file with your SMTP credentials"
echo "2. Set ADMIN_EMAIL to your admin email address"
echo "3. Run 'npm run dev' to start the service"
echo "4. Run 'node test-integration.js' to test the integration"
echo ""
echo "🔧 Required environment variables:"
echo "- SMTP_HOST (e.g., smtp.gmail.com)"
echo "- SMTP_PORT (e.g., 587)"
echo "- SMTP_USER (your email)"
echo "- SMTP_PASS (your app password)"
echo "- ADMIN_EMAIL (admin notification email)"
echo "- ADMIN_NAME (admin name for emails)"
