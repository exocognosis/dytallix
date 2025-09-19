#!/usr/bin/env python3
import time
import random
from prometheus_client import start_http_server, Counter, Gauge, Histogram

# Minimal AI microservice metrics exporter
requests_total = Counter('ai_infer_requests_total', 'Total inference requests')
errors_total = Counter('ai_infer_errors_total', 'Total inference errors')
latency = Histogram('ai_infer_latency_seconds', 'Inference latency in seconds', buckets=[0.01,0.05,0.1,0.2,0.5,1,2,5])
up = Gauge('ai_infer_up', 'AI inference service availability flag')

def simulate_work():
    with latency.time():
        t = random.uniform(0.01, 0.2)
        time.sleep(t)
    requests_total.inc()
    if random.random() < 0.01:
        errors_total.inc()

def main():
    port = 9091
    start_http_server(port)
    up.set(1)
    while True:
        simulate_work()
        time.sleep(0.5)

if __name__ == '__main__':
    main()

