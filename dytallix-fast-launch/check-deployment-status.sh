#!/bin/bash
# Quick deployment status checker for Hetzner server

SERVER="root@178.156.187.81"

echo "=== Checking Deployment Status on $SERVER ==="
echo ""

echo "📊 Running Processes:"
ssh $SERVER "ps aux | grep -E 'cargo|node|deploy' | grep -v grep" || echo "No build processes running"
echo ""

echo "📝 Recent Deploy Log (last 20 lines):"
ssh $SERVER "cd /opt/dytallix-fast-launch && tail -20 logs/node-build.log 2>/dev/null || echo 'Build log not found yet'"
echo ""

echo "🔍 Services Status:"
ssh $SERVER "cd /opt/dytallix-fast-launch && ls -la .pids/ 2>/dev/null || echo 'No PIDs yet'"
echo ""

echo "🌐 Port Status:"
ssh $SERVER "ss -tlnp | grep -E '3030|8787|5173'" || echo "No services listening yet"
echo ""

echo "To watch live:"
echo "  ssh $SERVER 'cd /opt/dytallix-fast-launch && tail -f logs/node-build.log'"
