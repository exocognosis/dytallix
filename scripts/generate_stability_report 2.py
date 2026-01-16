#!/usr/bin/env python3
import sys, json, statistics, os, math
from datetime import datetime

try:
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    HAVE_PLOTS = True
except Exception:
    HAVE_PLOTS = False

if len(sys.argv) < 3:
    print("Usage: generate_stability_report.py <stability.log> <report.md>")
    sys.exit(1)

log_path, report_path = sys.argv[1:3]
entries=[]
with open(log_path) as f:
    for line in f:
        line=line.strip()
        if not line or not line.startswith('{'): continue
        try:
            entries.append(json.loads(line))
        except json.JSONDecodeError:
            continue

if not entries:
    print("No entries parsed; aborting report generation")
    sys.exit(0)

# derive metrics
heights_series=[e['heights'] for e in entries if isinstance(e.get('heights'), list)]
validators=len(heights_series[0]) if heights_series else 0
# block time: estimate from max height among validators
height_progress=[max([h for h in hs if isinstance(h,int)]) for hs in heights_series if any(isinstance(h,int) for h in hs)]
block_intervals=[]
for i in range(1,len(height_progress)):
    dh=height_progress[i]-height_progress[i-1]
    if dh>0:
        # approximate wall time difference between consecutive samples
        t1=datetime.fromisoformat(entries[i]['ts'])
        t0=datetime.fromisoformat(entries[i-1]['ts'])
        dt=(t1-t0).total_seconds()
        block_intervals.extend([dt/dh]*dh)

avg_block_time=statistics.mean(block_intervals) if block_intervals else float('nan')
median_block_time=statistics.median(block_intervals) if block_intervals else float('nan')
missed_totals=[0]*validators
for e in entries:
    mb=e.get('missed') or []
    for i,m in enumerate(mb):
        try: missed_totals[i]+=int(m)
        except: pass

tps_values=[e.get('tps',0) for e in entries]
avg_tps = statistics.mean([v for v in tps_values if isinstance(v,(int,float))]) if tps_values else 0
peak_tps = max(tps_values) if tps_values else 0

plots_dir=os.path.join(os.path.dirname(report_path),'plots')
os.makedirs(plots_dir, exist_ok=True)
if HAVE_PLOTS:
    # Block height progression
    times=[datetime.fromisoformat(e['ts']) for e in entries]
    for vidx in range(validators):
        plt.plot(times,[ (hs[vidx] if isinstance(hs[vidx],int) else math.nan) for hs in heights_series], label=f'validator-{vidx}')
    plt.title('Block Height Progression')
    plt.xlabel('Time'); plt.ylabel('Height'); plt.legend(); plt.tight_layout()
    plt.savefig(os.path.join(plots_dir,'block_height.png')); plt.close()

    # TPS
    plt.plot(times, tps_values)
    plt.title('TPS Over Time'); plt.xlabel('Time'); plt.ylabel('TPS'); plt.tight_layout()
    plt.savefig(os.path.join(plots_dir,'tps.png')); plt.close()

    # Missed blocks cumulative
    for vidx in range(validators):
        cum=[]; s=0
        for e in entries:
            try: s=int(e['missed'][vidx]);
            except: pass
            cum.append(s)
        plt.plot(times,cum,label=f'validator-{vidx}')
    plt.title('Missed Blocks (Cumulative)'); plt.xlabel('Time'); plt.ylabel('Missed'); plt.legend(); plt.tight_layout()
    plt.savefig(os.path.join(plots_dir,'missed_blocks.png')); plt.close()
else:
    print("matplotlib not available; skipping plots")

# Write/augment report
if not os.path.exists(report_path):
    with open(report_path,'w') as f: f.write("# Stability Report\n\n")

with open(report_path,'a') as f:
    f.write("## Summary Metrics\n")
    f.write(f"Validators: {validators}\n\n")
    f.write(f"Average Block Time (s): {avg_block_time:.3f}\n\n")
    f.write(f"Median Block Time (s): {median_block_time:.3f}\n\n")
    f.write(f"Missed Blocks (per validator): {missed_totals}\n\n")
    f.write(f"Average TPS: {avg_tps:.2f} | Peak TPS: {peak_tps:.2f}\n\n")
    if HAVE_PLOTS:
        f.write("### Plots\n")
        f.write("![](plots/block_height.png)\n\n![](plots/tps.png)\n\n![](plots/missed_blocks.png)\n\n")
    f.write("---\n")
print("Report generation complete")