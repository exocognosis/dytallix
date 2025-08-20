#!/bin/bash

# Manual testing script for monitoring and feedback implementation
# This script demonstrates how to test the implemented features

echo "=== Dytallix Monitoring & Feedback Test Script ==="
echo

# Test 1: Check if faucet service can start
echo "1. Testing faucet service startup..."
cd /home/runner/work/dytallix/dytallix/faucet
timeout 5s npm start > /tmp/faucet_startup.log 2>&1 &
FAUCET_PID=$!
sleep 3

if ps -p $FAUCET_PID > /dev/null; then
    echo "✓ Faucet service started successfully"
    
    # Test 2: Metrics endpoint
    echo "2. Testing metrics endpoint..."
    METRICS_RESPONSE=$(curl -s http://localhost:3001/metrics)
    if echo "$METRICS_RESPONSE" | grep -q "http_requests_total"; then
        echo "✓ Metrics endpoint working - found expected metrics"
    else
        echo "✗ Metrics endpoint not working properly"
    fi
    
    # Test 3: Feedback endpoint
    echo "3. Testing feedback endpoint..."
    FEEDBACK_RESPONSE=$(curl -s -X POST http://localhost:3001/api/feedback \
        -H "Content-Type: application/json" \
        -d '{"message": "Test feedback from automated script"}')
    
    if echo "$FEEDBACK_RESPONSE" | grep -q '"success":true'; then
        echo "✓ Feedback endpoint working - successfully accepted feedback"
        
        # Test 4: Feedback stats
        echo "4. Testing feedback stats endpoint..."
        STATS_RESPONSE=$(curl -s http://localhost:3001/api/feedback/stats)
        if echo "$STATS_RESPONSE" | grep -q '"totalCount"'; then
            echo "✓ Feedback stats endpoint working"
        else
            echo "✗ Feedback stats endpoint not working properly"
        fi
    else
        echo "✗ Feedback endpoint not working properly"
    fi
    
    # Test 5: Privacy protection
    echo "5. Testing privacy protection..."
    if [ -f data/feedback.log ]; then
        FEEDBACK_DATA=$(cat data/feedback.log | tail -1)
        if echo "$FEEDBACK_DATA" | grep -q '"ipHash"' && ! echo "$FEEDBACK_DATA" | grep -q '127.0.0.1'; then
            echo "✓ Privacy protection working - IP addresses are hashed"
        else
            echo "✗ Privacy protection may not be working properly"
        fi
    else
        echo "✗ Feedback storage file not found"
    fi
    
    # Test 6: Spam protection
    echo "6. Testing spam protection..."
    SPAM_RESPONSE=$(curl -s -X POST http://localhost:3001/api/feedback \
        -H "Content-Type: application/json" \
        -d '{"message": "Buy viagra now! Click here for free money!"}')
    
    if echo "$SPAM_RESPONSE" | grep -q '"success":false'; then
        echo "✓ Spam protection working - rejected spam content"
    else
        echo "✗ Spam protection may not be working properly"
    fi
    
    # Test 7: Honeypot protection
    echo "7. Testing honeypot protection..."
    HONEYPOT_RESPONSE=$(curl -s -X POST http://localhost:3001/api/feedback \
        -H "Content-Type: application/json" \
        -d '{"message": "Valid message", "bot_field": "bot content"}')
    
    if echo "$HONEYPOT_RESPONSE" | grep -q '"success":false'; then
        echo "✓ Honeypot protection working - rejected bot submission"
    else
        echo "✗ Honeypot protection may not be working properly"
    fi
    
    # Kill faucet process
    kill $FAUCET_PID 2>/dev/null
    
else
    echo "✗ Faucet service failed to start"
    cat /tmp/faucet_startup.log
fi

echo
echo "=== Configuration Files ==="
echo "8. Checking monitoring configuration files..."

if [ -f "/home/runner/work/dytallix/dytallix/monitoring/prometheus.yml" ]; then
    echo "✓ Prometheus configuration file exists"
else
    echo "✗ Prometheus configuration file missing"
fi

if [ -f "/home/runner/work/dytallix/dytallix/monitoring/alerts.yml" ]; then
    echo "✓ Alerting rules file exists"
else
    echo "✗ Alerting rules file missing"
fi

echo
echo "=== Documentation ==="
echo "9. Checking documentation files..."

if [ -f "/home/runner/work/dytallix/dytallix/docs/ANNOUNCE.md" ]; then
    echo "✓ Announcement documentation exists"
else
    echo "✗ Announcement documentation missing"
fi

if [ -f "/home/runner/work/dytallix/dytallix/CHANGELOG.md" ]; then
    echo "✓ Changelog exists"
else
    echo "✗ Changelog missing"
fi

echo
echo "=== Testing Summary ==="
echo "All manual tests completed. Review output above for any issues."
echo
echo "To test Prometheus integration:"
echo "1. Install Prometheus"
echo "2. Copy monitoring/prometheus.yml to Prometheus config"
echo "3. Start Prometheus pointing to faucet on port 3001"
echo "4. Check that metrics are being scraped"
echo
echo "To trigger alerts for testing:"
echo "1. Send many requests quickly to trigger rate limiting"
echo "2. Monitor for rate_limit_hits_total metric increases"
echo "3. Check that alerts fire based on thresholds in monitoring/alerts.yml"