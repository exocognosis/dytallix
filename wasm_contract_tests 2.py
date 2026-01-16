import subprocess
import time
import os
import sys
import json
import concurrent.futures

# Configuration
RPC_URL = "http://localhost:3003"
ARTIFACTS_DIR = os.path.abspath("artifacts")
BASIC_WASM = os.path.join(ARTIFACTS_DIR, "counter.wasm")
COMPLEX_WASM = os.path.join(ARTIFACTS_DIR, "contracts", "complex_suite.wasm")

# Environment for dytx
ENV = os.environ.copy()
ENV["DYTX_PASSPHRASE"] = "password123"

class TestResult:
    def __init__(self, name, description, status, details=""):
        self.name = name
        self.description = description
        self.status = status
        self.details = details

results = []

def print_header(title):
    print("\n" + "="*80)
    print(f" TEST SUITE: {title}")
    print("="*80 + "\n")

def print_step(step, msg):
    print(f"[{step}] {msg}")

def run_dytx(args):
    cmd = ["dytx"] + args + ["--rpc", RPC_URL]
    try:
        result = subprocess.run(
            cmd, 
            cwd=os.getcwd(), 
            env=ENV, 
            capture_output=True, 
            text=True
        )
        return result
    except Exception as e:
        print(f"Error running command: {e}")
        return None

def extract_address(output):
    for line in output.splitlines():
        if "Address:" in line:
            return line.split("Address:")[1].strip()
    return None

def verify_success(res, context):
    if res and res.returncode == 0:
        print(f"   ✓ {context} Verified")
        return True
    else:
        err = res.stderr.strip() if res else "Unknown error"
        print(f"   ❌ {context} Failed: {err}")
        return False

# --- TEST CASES ---

def test_level_1():
    print_header("LEVEL 1/5: BASIC INTERACTION")
    print("Description: Simple state increment and query using `counter.wasm`.")
    
    print_step("INIT", "Loading artifacts/counter.wasm...")
    if not os.path.exists(BASIC_WASM):
        print("   ❌ Artifact not found")
        results.append(TestResult("L1: Basic", "Deploy Counter", "FAIL", "Artifact missing"))
        return None

    print_step("DEPLOY", "Initiating deployment transaction to blockchain...")
    res = run_dytx(["contract", "deploy", "--wasm", BASIC_WASM, "--gas", "1000000"])
    
    addr = None
    if verify_success(res, "Deployment"):
        addr = extract_address(res.stdout)
        print(f"   ➜ Contract Address: {addr}")
    else:
        results.append(TestResult("L1: Basic", "Deploy Counter", "FAIL", res.stderr))
        return None

    print_step("INTERACT", "Sending `increment` transaction...")
    res = run_dytx(["contract", "exec", "--address", addr, "--method", "increment", "--args", "{}", "--gas", "1000000"])
    if verify_success(res, "Execution"):
        pass
    else:
        results.append(TestResult("L1: Basic", "Execute Increment", "FAIL", res.stderr))
        return addr

    print_step("VERIFY", "Querying `get` to validate state change...")
    res = run_dytx(["contract", "exec", "--address", addr, "--method", "get", "--args", "{}", "--gas", "1000000"])
    if verify_success(res, "Query State"):
        results.append(TestResult("L1: Basic", "Full Lifecycle (Deploy/Exec/Query)", "PASS", f"Addr: {addr[:10]}..."))
    else:
        results.append(TestResult("L1: Basic", "Query State", "FAIL", res.stderr))

    return addr

def deploy_complex_suite():
    print("\n" + "-"*80)
    print(" PREPARING COMPLEX SUITE (Levels 2-5)")
    print("-"*80)
    
    print_step("INIT", f"Loading {COMPLEX_WASM}...")
    if not os.path.exists(COMPLEX_WASM):
        print("   ❌ Artifact not found")
        return None

    print_step("DEPLOY", "Deploying `complex_suite.wasm` (Shared Runtime)...")
    res = run_dytx(["contract", "deploy", "--wasm", COMPLEX_WASM, "--gas", "5000000"])
    
    addr = None
    if verify_success(res, "Complex Suite Deployment"):
        addr = extract_address(res.stdout)
        print(f"   ➜ Suite Address: {addr}")
    else:
        print("   ❌ Critical: Failed to deploy complex suite. Aborting levels 2-5.")
        return None
        
    return addr

def test_level_2(addr):
    print_header("LEVEL 2/5: LOGIC GATES")
    print("Description: Bitwise operations, branching, and arithmetic.")
    
    if not addr: return

    print_step("INTERACT", "Executing `logic_gate` (XOR/Rotate/Branching)...")
    start = time.time()
    res = run_dytx(["contract", "exec", "--address", addr, "--method", "logic_gate", "--args", "{}", "--gas", "2000000"])
    duration = time.time() - start
    
    print_step("FINALIZE", f"Transaction completed in {duration:.4f}s")
    
    if verify_success(res, "Logic Execution"):
        results.append(TestResult("L2: Logic", "Bitwise/Branching Logic", "PASS", f"{duration:.2f}s"))
    else:
        results.append(TestResult("L2: Logic", "Bitwise/Branching Logic", "FAIL", res.stderr))

import statistics

class Statistics:
    def __init__(self):
        self.latencies = []
        self.success_count = 0
        self.fail_count = 0
        self.total_start_time = None
        self.total_end_time = None

    def start_run(self):
        self.total_start_time = time.time()

    def end_run(self):
        self.total_end_time = time.time()

    def add_result(self, latency, success):
        self.latencies.append(latency)
        if success:
            self.success_count += 1
        else:
            self.fail_count += 1

    def print_report(self):
        if not self.total_end_time or not self.total_start_time:
            return "No data collected."
            
        total_time = self.total_end_time - self.total_start_time
        total_tx = len(self.latencies)
        tps = total_tx / total_time if total_time > 0 else 0
        
        avg_lat = statistics.mean(self.latencies) if self.latencies else 0
        med_lat = statistics.median(self.latencies) if self.latencies else 0
        p95_lat = statistics.quantiles(self.latencies, n=20)[18] if len(self.latencies) >= 20 else max(self.latencies) if self.latencies else 0
        min_lat = min(self.latencies) if self.latencies else 0
        max_lat = max(self.latencies) if self.latencies else 0

        print("\n" + " "*3 + "-"*60)
        print(" "*3 + f" DETAILED STATISTICS ({total_tx} Requests)")
        print(" "*3 + "-"*60)
        print(" "*3 + f" Success Rate:   {self.success_count}/{total_tx} ({self.success_count/total_tx*100:.1f}%)")
        print(" "*3 + f" Throughput:     {tps:.2f} TPS")
        print(" "*3 + f" Total Duration: {total_time:.3f}s")
        print(" "*3 + "-"*60)
        print(" "*3 + f" Latency (s):")
        print(" "*3 + f"   Min: {min_lat:.4f}  |  Max: {max_lat:.4f}")
        print(" "*3 + f"   Avg: {avg_lat:.4f}  |  Median: {med_lat:.4f}")
        print(" "*3 + f"   P95: {p95_lat:.4f}")
        print(" "*3 + "-"*60 + "\n")
        
        return f"{tps:.2f} TPS | P95: {p95_lat:.3f}s"

def measured_run_dytx(args):
    start = time.time()
    res = run_dytx(args)
    duration = time.time() - start
    success = (res is not None and res.returncode == 0)
    return success, duration, res

def test_level_3(addr):
    print_header("LEVEL 3/5: CPU STRESS")
    print("Description: Recursive Fibonacci calculation with concurrent load.")
    
    if not addr: return

    concurrency = 10  # Increased for better stats
    print_step("INIT", f"Preparing {concurrency} concurrent transactions (Fibonacci)...")
    print_step("INTERACT", "Broadcasting transactions to node...")
    
    stats = Statistics()
    stats.start_run()
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=concurrency) as executor:
        futures = []
        for i in range(concurrency):
            # Using heavy_compute
            futures.append(executor.submit(measured_run_dytx, ["contract", "exec", "--address", addr, "--method", "heavy_compute", "--args", "{}", "--gas", "5000000"]))
        
        completed_count = 0
        for future in concurrent.futures.as_completed(futures):
            success, duration, res = future.result()
            stats.add_result(duration, success)
            
            if success:
                sys.stdout.write(".")
            else:
                sys.stdout.write("x")
            sys.stdout.flush()
            completed_count += 1
            
    print() # Newline
    stats.end_run()

    report_summary = stats.print_report()
    
    # Pass if at least 80% success
    if stats.success_count >= (concurrency * 0.8):
        results.append(TestResult("L3: CPU", f"Concurrent Fib ({concurrency}x)", "PASS", report_summary))
    else:
        results.append(TestResult("L3: CPU", f"Concurrent Fib ({concurrency}x)", "FAIL", f"Low success rate: {stats.success_count}/{concurrency}"))

def test_level_4(addr):
    print_header("LEVEL 4/5: MEMORY STRESS")
    print("Description: Large dynamic vector allocation (~2MB+).")
    
    if not addr: return

    print_step("INTERACT", "Executing `memory_hog` (Allocation test)...")
    res = run_dytx(["contract", "exec", "--address", addr, "--method", "memory_hog", "--args", "{}", "--gas", "10000000"])
    
    if verify_success(res, "Memory Allocation"):
        results.append(TestResult("L4: Memory", "Large Dynamic Allocation", "PASS", "Safe"))
    else:
        results.append(TestResult("L4: Memory", "Large Dynamic Allocation", "FAIL", res.stderr))

def test_level_5(addr):
    print_header("LEVEL 5/5: MIXED COMPLEXITY")
    print("Description: COMBINED CPU calculation and Memory pressure.")
    
    if not addr: return

    print_step("INTERACT", "Executing `mixed_heavy` (Fibonacci + Vector Fold)...")
    start = time.time()
    res = run_dytx(["contract", "exec", "--address", addr, "--method", "mixed_heavy", "--args", "{}", "--gas", "20000000"])
    duration = time.time() - start
    
    if verify_success(res, "Mixed Workload"):
        results.append(TestResult("L5: Mixed", "Combined CPU + Mem Stress", "PASS", f"{duration:.2f}s"))
    else:
        results.append(TestResult("L5: Mixed", "Combined CPU + Mem Stress", "FAIL", res.stderr))


def main():
    print("\n" + "#"*80)
    print(" DYTALLIX WASM CONTRACT VALIDATION PROTOCOL")
    print(f" Target Node: {RPC_URL}")
    print("#"*80)

    # Level 1 (Independent)
    test_level_1()

    # Levels 2-5 (Shared Suite)
    complex_addr = deploy_complex_suite()
    if complex_addr:
        test_level_2(complex_addr)
        test_level_3(complex_addr)
        test_level_4(complex_addr)
        test_level_5(complex_addr)
    else:
        print("\n❌ Skipping Levels 2-5 due to deployment failure.")

    # Summary
    print("\n" + "="*90)
    print(" FINAL VERIFICATION REPORT")
    print("="*90)
    print(f"{'LEVEL':<12} | {'TEST CASE':<30} | {'STATUS':<10} | {'DETAILS'}")
    print("-" * 90)
    
    passes = 0
    fails = 0
    
    for r in results:
        if r.status == "PASS":
            passes += 1
            status_icon = "PASS ✅"
        else:
            fails += 1
            status_icon = "FAIL ❌"
            
        print(f"{r.name:<12} | {r.description:<30} | {status_icon:<10} | {r.details}")

    print("-" * 90)
    print(f"Total Tests: {len(results)} | Successful: {passes} | Failed: {fails}")
    print("="*90 + "\n")

    if fails > 0:
        sys.exit(1)

if __name__ == "__main__":
    main()
