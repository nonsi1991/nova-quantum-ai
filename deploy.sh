#!/bin/bash
echo "=== Nova Quantum AI GitHub Pages Deployment ==="
echo "1. Initialize git repository..."
git init
git add .
git commit -m "Deploy Nova Quantum AI Platform with Admin Features"

echo "2. Add GitHub remote (replace with your GitHub repo URL)..."
echo "   git remote add origin https://github.com/YOUR_USERNAME/nova-quantum-ai.git"
echo "   git push -u origin main"

echo "3. Enable GitHub Pages in repository settings:"
echo "   - Go to Settings > Pages"
echo "   - Source: Deploy from a branch"
echo "   - Branch: main"
echo "   - Folder: / (root)"
echo "   - Custom domain: nova-quantum-ai.duckdns.org"

echo "4. Configure DNS at DuckDNS:"
echo "   - Add CNAME record: nova-quantum-ai.duckdns.org -> YOUR_USERNAME.github.io"

echo "✅ Deployment package ready!"
echo "📁 Total files: $(find . -type f | wc -l)"
echo "📊 Total size: $(du -sh . | cut -f1)"
EOF && chmod +x deploy.sh && echo "✅ Deployment Script erstellt"