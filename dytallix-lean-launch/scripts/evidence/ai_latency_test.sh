#!/bin/bash

# AI Service Latency Measurement Script
# Measures p50/p95 latency and logs to launch-evidence/ai/latency_histogram.json

set -e

echo "=== AI Service Latency Measurement ==="

# Ensure AI service is running
AI_URL="http://localhost:7000"
if ! curl -s "${AI_URL}/health" > /dev/null; then
    echo "❌ AI service not running at ${AI_URL}"
    echo "Please start the AI service first:"
    echo "cd services/ai-oracle && python3 -m uvicorn app:app --host 0.0.0.0 --port 7000"
    exit 1
fi

echo "✅ AI service is running"

# Create evidence directory
mkdir -p launch-evidence/ai

# Test parameters
NUM_REQUESTS=50
ENDPOINT="${AI_URL}/api/ai/risk"

echo "📊 Running ${NUM_REQUESTS} requests to measure latency..."

# Array to store latencies
latencies=()

for i in $(seq 1 ${NUM_REQUESTS}); do
    # Generate unique transaction hash
    TX_HASH=$(printf "0x%064x" $((0x1234567890abcdef + i)))
    
    # Measure request time
    start_time=$(date +%s%3N)
    
    response=$(curl -s -X POST "${ENDPOINT}" \
        -H "Content-Type: application/json" \
        -d "{\"tx_hash\":\"${TX_HASH}\",\"from\":\"dyt1alice${i}\",\"to\":\"dyt1bob${i}\",\"amount\":$((1000 + i)),\"fee\":50,\"nonce\":${i}}")
    
    end_time=$(date +%s%3N)
    
    # Calculate latency in milliseconds
    latency=$((end_time - start_time))
    latencies+=(${latency})
    
    # Check if request was successful
    if echo "${response}" | jq -e '.score' > /dev/null 2>&1; then
        echo "  Request ${i}/${NUM_REQUESTS}: ${latency}ms ✅"
    else
        echo "  Request ${i}/${NUM_REQUESTS}: ${latency}ms ❌ (failed)"
    fi
    
    # Small delay to avoid overwhelming the service
    sleep 0.1
done

echo ""
echo "📈 Calculating statistics..."

# Sort latencies for percentile calculation
IFS=$'\n' sorted_latencies=($(sort -n <<<"${latencies[*]}"))

# Calculate statistics
total_latencies=${#sorted_latencies[@]}
sum=0
for lat in "${sorted_latencies[@]}"; do
    sum=$((sum + lat))
done

avg=$((sum / total_latencies))

# Calculate percentiles
p50_index=$(((total_latencies * 50) / 100))
p95_index=$(((total_latencies * 95) / 100))

p50=${sorted_latencies[$p50_index]}
p95=${sorted_latencies[$p95_index]}

min_latency=${sorted_latencies[0]}
max_latency=${sorted_latencies[$((total_latencies - 1))]}

echo "📊 Latency Statistics:"
echo "  Requests: ${total_latencies}"
echo "  Average:  ${avg}ms"
echo "  Minimum:  ${min_latency}ms"
echo "  P50:      ${p50}ms"
echo "  P95:      ${p95}ms"
echo "  Maximum:  ${max_latency}ms"

# Create latency histogram JSON
histogram_json=$(cat <<EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "test_parameters": {
    "num_requests": ${NUM_REQUESTS},
    "endpoint": "${ENDPOINT}",
    "ai_service_url": "${AI_URL}"
  },
  "statistics": {
    "total_requests": ${total_latencies},
    "average_ms": ${avg},
    "min_ms": ${min_latency},
    "max_ms": ${max_latency},
    "p50_ms": ${p50},
    "p95_ms": ${p95}
  },
  "raw_latencies_ms": [$(IFS=,; echo "${sorted_latencies[*]}")],
  "histogram_buckets": {
    "0-100ms": $(printf '%s\n' "${sorted_latencies[@]}" | awk '$1 <= 100' | wc -l),
    "101-250ms": $(printf '%s\n' "${sorted_latencies[@]}" | awk '$1 > 100 && $1 <= 250' | wc -l),
    "251-500ms": $(printf '%s\n' "${sorted_latencies[@]}" | awk '$1 > 250 && $1 <= 500' | wc -l),
    "501-1000ms": $(printf '%s\n' "${sorted_latencies[@]}" | awk '$1 > 500 && $1 <= 1000' | wc -l),
    "1000ms+": $(printf '%s\n' "${sorted_latencies[@]}" | awk '$1 > 1000' | wc -l)
  },
  "success_criteria": {
    "target_avg_latency_ms": 1000,
    "actual_avg_latency_ms": ${avg},
    "avg_latency_met": $([ ${avg} -lt 1000 ] && echo "true" || echo "false"),
    "target_p95_latency_ms": 2000,
    "actual_p95_latency_ms": ${p95},
    "p95_latency_met": $([ ${p95} -lt 2000 ] && echo "true" || echo "false")
  }
}
EOF
)

# Save histogram to evidence file
echo "${histogram_json}" > launch-evidence/ai/latency_histogram.json

echo ""
echo "✅ Latency measurement complete!"
echo "📄 Results saved to: launch-evidence/ai/latency_histogram.json"

# Check success criteria
if [ ${avg} -lt 1000 ] && [ ${p95} -lt 2000 ]; then
    echo "🎉 SUCCESS: Latency requirements met (avg < 1000ms, p95 < 2000ms)"
    exit 0
else
    echo "⚠️  WARNING: Latency requirements not fully met"
    if [ ${avg} -ge 1000 ]; then
        echo "   - Average latency ${avg}ms >= 1000ms threshold"
    fi
    if [ ${p95} -ge 2000 ]; then
        echo "   - P95 latency ${p95}ms >= 2000ms threshold"
    fi
    exit 1
fi