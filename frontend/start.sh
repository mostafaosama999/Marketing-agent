#!/bin/bash
# Startup script for DigitalOcean App Platform
# This ensures the React app is served correctly

echo "Starting Marketing Agent frontend..."
echo "Build directory contents:"
ls -la build/

# Serve the build directory with proper SPA configuration
# -s = Single Page Application mode (routes to index.html)
# -l = Listen on port 8080
# -n = No directory listing
npx serve -s build -l 8080 -n
