from wasm_contract_tests import Statistics
import time

def verify():
    stats = Statistics()
    stats.start_run()
    
    # Simulate some data
    data = [0.1, 0.2, 0.15, 0.3, 0.11, 0.12, 0.1, 0.1, 0.5, 0.1]
    for d in data:
        stats.add_result(d, True)
    
    # Simulate a failure
    stats.add_result(0.05, False)
    
    time.sleep(0.1) # ensure some duration
    stats.end_run()
    
    print("Testing Report Output:")
    report = stats.print_report()
    print(f"Returned Summary: {report}")

if __name__ == "__main__":
    verify()
