#!/bin/bash

# Gmail Integration Deployment Script
# For: mostafaainews@gmail.com

echo "🚀 Gmail Integration Deployment Script"
echo "========================================"
echo ""

# Check if we're in the right directory
if [ ! -f "firebase.json" ]; then
    echo "❌ Error: Must run from project root directory"
    exit 1
fi

# Step 1: Check Firebase config
echo "📋 Step 1: Checking Firebase configuration..."
echo ""

INBOX_EMAIL=$(firebase functions:config:get gmail.inbox_email 2>/dev/null | grep -o '"inbox_email":"[^"]*"' | cut -d'"' -f4)
APP_PASSWORD=$(firebase functions:config:get gmail.app_password 2>/dev/null | grep -o '"app_password":"[^"]*"' | cut -d'"' -f4)

if [ -z "$INBOX_EMAIL" ]; then
    echo "⚠️  Gmail inbox email not configured"
    echo ""
    read -p "Enter your Gmail address (mostafaainews@gmail.com): " EMAIL
    EMAIL=${EMAIL:-mostafaainews@gmail.com}
    firebase functions:config:set gmail.inbox_email="$EMAIL"
    echo "✅ Inbox email set to: $EMAIL"
else
    echo "✅ Inbox email configured: $INBOX_EMAIL"
fi

echo ""

if [ -z "$APP_PASSWORD" ]; then
    echo "⚠️  Gmail app password not configured"
    echo ""
    echo "To generate an app password:"
    echo "1. Go to: https://myaccount.google.com/apppasswords"
    echo "2. Create app password for 'Marketing Agent'"
    echo "3. Copy the 16-character password (remove spaces)"
    echo ""
    read -p "Enter your Gmail app password: " PASSWORD

    if [ -z "$PASSWORD" ]; then
        echo "❌ No password provided. Exiting."
        exit 1
    fi

    firebase functions:config:set gmail.app_password="$PASSWORD"
    echo "✅ App password configured"
else
    echo "✅ App password configured"
fi

echo ""
echo "========================================"
echo ""

# Step 2: Build functions
echo "🔨 Step 2: Building Cloud Functions..."
echo ""
cd functions
npm run build
BUILD_STATUS=$?
cd ..

if [ $BUILD_STATUS -ne 0 ]; then
    echo "❌ Build failed. Please fix errors and try again."
    exit 1
fi

echo "✅ Build successful"
echo ""
echo "========================================"
echo ""

# Step 3: Deploy
echo "☁️  Step 3: Deploying to Firebase..."
echo ""

firebase deploy --only functions:scheduledEmailSync,functions:manualEmailSync,firestore:rules

DEPLOY_STATUS=$?

echo ""
echo "========================================"
echo ""

if [ $DEPLOY_STATUS -eq 0 ]; then
    echo "✅ Deployment successful!"
    echo ""
    echo "Next steps:"
    echo "1. Start the frontend: cd agency-app && npm start"
    echo "2. Navigate to: http://localhost:3000/inbound-generation"
    echo "3. Click the 'Sync Now' button to test"
    echo ""
    echo "View logs: firebase functions:log"
else
    echo "❌ Deployment failed. Check the errors above."
    exit 1
fi
