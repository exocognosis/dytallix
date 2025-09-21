# pyright: reportMissingModuleSource=false, reportMissingImports=false
import os
from pathlib import Path
import subprocess
import time
import pandas as pd
import numpy as np
import streamlit as st
import plotly.express as px
from plotly.subplots import make_subplots  # type: ignore
import plotly.graph_objects as go  # type: ignore
import re

# Optional sklearn metrics for PR/ROC
try:  # type: ignore
    from sklearn.metrics import precision_recall_curve, average_precision_score, roc_curve, roc_auc_score  # type: ignore
    _HAVE_SK = True
except Exception:  # type: ignore
    _HAVE_SK = False

st.set_page_config(page_title="PulseGuard Dashboard", layout="wide")

# Compatibility shim for Streamlit rerun API changes
_def_rerun = getattr(st, "rerun", None)
_def_exp_rerun = getattr(st, "experimental_rerun", None)

def _rerun():
    if _def_rerun is not None:
        return _def_rerun()
    if _def_exp_rerun is not None:
        return _def_exp_rerun()

# Use a vivid color palette and dark template for better contrast
px.defaults.template = "plotly_dark"
PALETTE = px.colors.qualitative.Vivid

ART_DIR = Path(__file__).resolve().parents[1] / "artifacts"

# --- Sidebar defaults & reset support ---
DEFAULTS = {
    "api_url": os.getenv("PULSEGUARD_API", "http://localhost:8090"),
    "attack_prob": float(os.getenv("ATTACK_DEFAULT_PROB", "0.1")),
    "attack_sev": float(os.getenv("ATTACK_DEFAULT_SEVERITY", "0.5")),
    "follow_latest": True,
    "auto_refresh": True,
    "refresh_interval": 2,
    "smooth_win": 5,
    "points_limit": 400,
    "detection_mode": "Alert label",
    "det_threshold": 0.5,
    "test_duration": 30,
    "test_rate": 5,
    "gan_enable": False,
    "gan_mode": "adversarial",
    "gan_mix": 0.3,
}

# Apply a pending reset before any widgets are created
if st.session_state.get("_request_reset", False):
    for _k, _v in DEFAULTS.items():
        st.session_state[_k] = _v
    st.session_state["_request_reset"] = False

# Initialize defaults only once
if "_defaults_initialized" not in st.session_state:
    for _k, _v in DEFAULTS.items():
        if _k not in st.session_state:
            st.session_state[_k] = _v
    st.session_state["_defaults_initialized"] = True

# --- Detection latency computation helper ---
def compute_detection_latency(df: pd.DataFrame, mode: str = "Alert label", threshold: float = 0.5) -> pd.DataFrame:
    """Return per-injection detection latency using either alert labels or score threshold.
    mode: "Alert label" or "Score threshold"
    """
    if not {"ts"}.issubset(df.columns):
        return pd.DataFrame(columns=[
            "attack_type","inject_idx","detect_idx","inject_ts","detect_ts","latency_s","inject_time"
        ])

    # Build attack series robustly
    if "attack_type" in df.columns:
        s_attack = df["attack_type"].fillna("none").astype(str)
    else:
        s_attack = pd.Series(["none"] * len(df))

    # Convert timestamps to float seconds (support numeric, numeric-as-string, or ISO strings)
    s_ts = df["ts"]
    ts_vals: np.ndarray
    try:
        num_ser = pd.to_numeric(s_ts, errors="coerce")
        if isinstance(num_ser, pd.Series) and num_ser.notna().any():
            ts_vals = np.asarray(num_ser, dtype="float64")
        else:
            dt = pd.to_datetime(s_ts, errors="coerce")
            np_dt = np.asarray(dt, dtype="datetime64[ns]")
            int_vals = np_dt.astype("int64")
            invalid = (int_vals == np.iinfo(np.int64).min)
            ts_vals = int_vals.astype("float64") / 1e9
            ts_vals = np.where(invalid, np.nan, ts_vals)
    except Exception:
        ts_vals = np.full(len(df), np.nan, dtype="float64")

    # Detection mask
    if mode == "Score threshold":
        if "anomaly_score" not in df.columns:
            return pd.DataFrame(columns=["attack_type","inject_idx","detect_idx","inject_ts","detect_ts","latency_s","inject_time"])
        s_score = pd.to_numeric(df["anomaly_score"], errors="coerce")
        detect_mask = s_score >= float(threshold)
    else:
        if "alert" not in df.columns:
            return pd.DataFrame(columns=["attack_type","inject_idx","detect_idx","inject_ts","detect_ts","latency_s","inject_time"])
        detect_mask = (df["alert"] == 1)

    det_idx = np.flatnonzero(np.asarray(detect_mask, dtype=bool))
    inj_series = (s_attack != "none")
    inj_idx = np.flatnonzero(np.asarray(inj_series, dtype=bool))

    records = []
    if inj_idx.size == 0 or det_idx.size == 0:
        return pd.DataFrame(columns=[
            "attack_type","inject_idx","detect_idx","inject_ts","detect_ts","latency_s","inject_time"
        ])

    for i in inj_idx:
        jpos = np.searchsorted(det_idx, i, side="left")
        if jpos >= det_idx.size:
            continue
        j = int(det_idx[jpos])
        inj_ts = float(ts_vals[i]) if i < ts_vals.shape[0] else np.nan
        det_ts = float(ts_vals[j]) if j < ts_vals.shape[0] else np.nan
        if np.isnan(inj_ts) or np.isnan(det_ts) or det_ts < inj_ts:
            continue
        records.append({
            "attack_type": s_attack.iat[i] if i < len(s_attack) else "unknown",
            "inject_idx": int(i),
            "detect_idx": int(j),
            "inject_ts": inj_ts,
            "detect_ts": det_ts,
            "latency_s": float(det_ts - inj_ts),
            "inject_time": pd.to_datetime(inj_ts, unit="s"),
        })

    return pd.DataFrame.from_records(records)

st.sidebar.header("Controls")
api_url = st.sidebar.text_input("PulseGuard API", st.session_state.api_url, key="api_url")
attack_prob = st.sidebar.slider("Attack Probability", 0.0, 1.0, float(st.session_state.attack_prob), 0.01, key="attack_prob")
attack_sev = st.sidebar.slider("Attack Severity", 0.0, 1.0, float(st.session_state.attack_sev), 0.01, key="attack_sev")

# Granular real-time viewing controls
follow_latest = st.sidebar.checkbox("Follow latest run", value=st.session_state.follow_latest, key="follow_latest")
auto_refresh = st.sidebar.checkbox("Auto-refresh", value=st.session_state.auto_refresh, key="auto_refresh")
refresh_interval = st.sidebar.slider("Refresh interval (s)", 1, 10, int(st.session_state.refresh_interval), key="refresh_interval")
smooth_win = st.sidebar.slider("Smoothing window (points)", 1, 25, int(st.session_state.smooth_win), key="smooth_win")
points_limit = st.sidebar.slider("Points to display", 50, 2000, int(st.session_state.points_limit), step=10, key="points_limit")

# Detection mode for latency computation
_detection_modes = ["Alert label", "Score threshold"]
detection_mode = st.sidebar.selectbox(
    "Detection mode", _detection_modes, index=_detection_modes.index(st.session_state.detection_mode),
    help="How to decide a detection event", key="detection_mode"
)
det_threshold = st.sidebar.slider(
    "Detection threshold (score)", 0.0, 1.0, float(st.session_state.det_threshold), 0.01,
    help="Used when Detection mode = Score threshold", key="det_threshold"
)

# Quick-run controls
# 5s increments up to 60s, then minute increments up to 10 minutes
_duration_opts = list(range(5, 61, 5)) + [i * 60 for i in range(2, 11)]
test_duration = st.sidebar.select_slider("Quick test duration", options=_duration_opts, value=st.session_state.test_duration,
                                         help="After 60s, steps are in 1-minute increments", key="test_duration")
# Friendly readout
if test_duration < 60:
    st.sidebar.caption(f"Selected: {test_duration} seconds")
else:
    mins = test_duration // 60
    st.sidebar.caption(f"Selected: {test_duration}s ({mins} minute{'s' if mins != 1 else ''})")

test_rate = st.sidebar.slider("Quick test rate (events/s)", 1, 50, int(st.session_state.test_rate), key="test_rate")

# --- GAN mode controls ---
gan_enable = st.sidebar.checkbox("Enable GAN mode", value=st.session_state.gan_enable, key="gan_enable")
gan_mode = st.sidebar.selectbox("GAN Mode", ["near_normal", "adversarial"], index=(1 if st.session_state.gan_mode == "adversarial" else 0), key="gan_mode")
gan_mix = st.sidebar.slider("GAN mix ratio", 0.0, 1.0, float(st.session_state.gan_mix), 0.05, key="gan_mix")

# --- Run / Reset / Refresh buttons ---
col_run1, col_reset, col_refresh = st.sidebar.columns(3)
if col_run1.button("Run Test"):
    env = os.environ.copy()
    env["PULSEGUARD_API"] = api_url
    env["ATTACK_DEFAULT_PROB"] = str(attack_prob)
    env["ATTACK_DEFAULT_SEVERITY"] = str(attack_sev)
    subprocess.Popen([
        "python", "pipeline_runner.py",
        "--duration", str(int(test_duration)),
        "--rate", str(int(test_rate)),
        "--seed", "7", "--ci",
        *( ["--gan-mode", gan_mode, "--gan-mix-ratio", str(float(gan_mix))] if gan_enable else ["--gan-mode", "off"] ),
    ], cwd=str(ART_DIR.parent), env=env)
    time.sleep(1)
    _rerun()

if col_reset.button("Reset", help="Reset all sidebar controls to default values"):
    # Set a flag and rerun so the reset happens before widgets are instantiated
    st.session_state["_request_reset"] = True
    _rerun()

if col_refresh.button("Refresh now"):
    _rerun()

st.sidebar.write("Latest Artifacts:")
# Only include timestamped run directories like 20250920T144632Z (exclude 'gan', etc.)
artifacts = sorted(
    [p for p in ART_DIR.glob("*") if p.is_dir() and re.match(r"^\d{8}T\d{6}Z$", p.name)],
    reverse=True,
)[:25]

if follow_latest:
    # Prefer the newest directory that already has results.csv
    selected = "<none>"
    for d in artifacts:
        if (d / "results.csv").exists():
            selected = d.name
            break
    if selected == "<none>" and artifacts:
        selected = artifacts[0].name
    st.sidebar.caption(f"Following: {selected}")
else:
    selected = st.sidebar.selectbox("Run", [a.name for a in artifacts] if artifacts else ["<none>"])

# --- Helper: robust CSV reader (handles in-progress writes) ---
def _read_csv_robust(path: Path, retries: int = 3, delay: float = 0.2) -> pd.DataFrame:
    last_err = None
    for _ in range(retries):
        try:
            return pd.read_csv(path)
        except Exception as e:
            last_err = e
            time.sleep(delay)
    raise last_err  # type: ignore[misc]

if selected != "<none>":
    dir_path = ART_DIR / selected
    csv_path = dir_path / "results.csv"
    if csv_path.exists():
        try:
            df = _read_csv_robust(csv_path)
        except Exception as e:
            st.error(f"Failed to read results.csv: {e}")
            st.stop()
        # Ensure numeric types and time axis
        if "api_latency_ms" in df.columns:
            df["api_latency_ms"] = pd.to_numeric(df["api_latency_ms"], errors="coerce")
        # Robust ts -> time conversion: try numeric (epoch seconds) first, else ISO string
        if "ts" in df.columns:
            ts_num = pd.to_numeric(df["ts"], errors="coerce")
            if isinstance(ts_num, pd.Series) and ts_num.notna().any():
                df["time"] = pd.to_datetime(ts_num, unit="s")
            else:
                df["time"] = pd.to_datetime(df["ts"], errors="coerce")
        else:
            df["time"] = pd.NaT
        # Tail for real-time view
        dfv = df.tail(points_limit).copy()
        # Smoothing for visibility
        for col in [
            "anomaly_score","api_latency_ms","block_latency_ms","build_time_ms",
            "tx_volume_tps","mempool_size","mempool_gas_pressure","cpu_pct","rss_mb"
        ]:
            if col in dfv.columns:
                dfv[col] = pd.to_numeric(dfv[col], errors="coerce")
                if smooth_win > 1:
                    dfv[col] = dfv[col].rolling(smooth_win, min_periods=1).mean()

        tab_data, tab_insights, tab_about = st.tabs(["Live Data", "Results & Insights", "About"])

        with tab_data:
            # Two-column layout with stacked charts in each column
            col1, col2 = st.columns(2)

            with col1:
                # Detection latency over time (replaces PulseGuard Score chart)
                det_df = compute_detection_latency(df, mode=detection_mode, threshold=det_threshold)
                if not det_df.empty:
                    det_tail = det_df.tail(min(points_limit, 200)).copy()
                    fig_det = px.scatter(
                        det_tail, x="inject_time", y="latency_s", color="attack_type",
                        color_discrete_sequence=PALETTE, title=f"Detection Latency Over Time (s) — {detection_mode}",
                    )
                    fig_det.update_traces(mode="markers")
                    fig_det.update_layout(height=260, yaxis_title="latency (s)")
                    st.plotly_chart(fig_det, use_container_width=True)
                else:
                    # Show an empty chart frame with labels to retain layout
                    fig_empty = go.Figure()
                    fig_empty.update_layout(
                        template="plotly_dark",
                        title=f"Detection Latency Over Time (s) — {detection_mode}",
                        xaxis_title="inject time",
                        yaxis_title="latency (s)",
                        height=260,
                    )
                    st.plotly_chart(fig_empty, use_container_width=True)
                    st.info("No detection latency yet (no qualifying detections for injected attacks). Adjust threshold or severity.")

                # Combined TPS + Mempool size
                if "tx_volume_tps" in dfv.columns and "mempool_size" in dfv.columns:
                    fig_nl = make_subplots(specs=[[{"secondary_y": True}]])
                    fig_nl.add_trace(
                        go.Scatter(x=dfv["time"], y=dfv["mempool_size"], name="mempool_size",
                                   line=dict(color=PALETTE[3], width=2)), secondary_y=False)
                    fig_nl.add_trace(
                        go.Scatter(x=dfv["time"], y=dfv["tx_volume_tps"], name="tx_volume_tps",
                                   line=dict(color=PALETTE[2], width=2, dash="dash")), secondary_y=True)
                    fig_nl.update_layout(template="plotly_dark", title_text="Network Load: TPS & Mempool Size", height=260)
                    fig_nl.update_yaxes(title_text="mempool size", secondary_y=False)
                    fig_nl.update_yaxes(title_text="tps", secondary_y=True)
                    st.plotly_chart(fig_nl, use_container_width=True)

                # Mempool gas pressure (moved here to left column, third row)
                if "mempool_gas_pressure" in dfv.columns:
                    fig_gp_left = px.line(dfv, x="time", y="mempool_gas_pressure", title="Mempool Gas Pressure",
                                          color_discrete_sequence=[PALETTE[5]])
                    fig_gp_left.update_traces(mode="lines+markers", line_shape="spline")
                    fig_gp_left.update_layout(height=240)
                    st.plotly_chart(fig_gp_left, use_container_width=True)

            with col2:
                # API latency (or fallback build time)
                if "api_latency_ms" in dfv.columns and dfv["api_latency_ms"].notna().any():
                    fig2 = px.line(dfv, x="time", y="api_latency_ms", title="API Latency (ms)",
                                   color_discrete_sequence=[PALETTE[1]])
                    fig2.update_traces(mode="lines+markers", line_shape="spline")
                    fig2.update_layout(height=260)
                    st.plotly_chart(fig2, use_container_width=True)
                elif "build_time_ms" in dfv.columns:
                    fig2b = px.line(dfv, x="time", y="build_time_ms", title="Build Time (ms) [fallback]",
                                    color_discrete_sequence=[PALETTE[1]])
                    fig2b.update_traces(mode="lines+markers", line_shape="spline")
                    fig2b.update_layout(height=260)
                    st.plotly_chart(fig2b, use_container_width=True)

                # Attacks injected
                if "attack_type" in df.columns:
                    counts = df.groupby("attack_type").size().reset_index(name="count")
                    fig3 = px.bar(counts, x="attack_type", y="count", title="Attacks Injected",
                                   color="attack_type", color_discrete_sequence=PALETTE)
                    fig3.update_layout(height=240, showlegend=True)
                    st.plotly_chart(fig3, use_container_width=True)

                # GAN vs baseline score distributions
                if "anomaly_score" in df.columns and "is_gan" in df.columns:
                    df_scores = df.copy()
                    df_scores["is_gan"] = df_scores["is_gan"].fillna(0).astype(int)
                    fig_g = px.histogram(df_scores, x="anomaly_score", color=df_scores["is_gan"].map({0: "baseline", 1: "GAN"}),
                                         nbins=30, barmode="overlay", title="Score Distribution: Baseline vs GAN")
                    st.plotly_chart(fig_g, use_container_width=True)

                # Resource usage (single set)
                rcol1, rcol2 = st.columns(2)
                with rcol1:
                    if "cpu_pct" in dfv.columns and dfv["cpu_pct"].notna().any():
                        fig_cpu = px.line(dfv, x="time", y="cpu_pct", title="Runner CPU (%)",
                                          color_discrete_sequence=[PALETTE[7]])
                        fig_cpu.update_traces(mode="lines+markers", line_shape="spline")
                        fig_cpu.update_layout(height=240)
                        st.plotly_chart(fig_cpu, use_container_width=True)
                with rcol2:
                    if "rss_mb" in dfv.columns and dfv["rss_mb"].notna().any():
                        fig_rss = px.line(dfv, x="time", y="rss_mb", title="Runner RSS (MB)",
                                          color_discrete_sequence=[PALETTE[8]])
                        fig_rss.update_traces(mode="lines+markers", line_shape="spline")
                        fig_rss.update_layout(height=240)
                        st.plotly_chart(fig_rss, use_container_width=True)

            st.download_button("Export CSV", data=csv_path.read_bytes(), file_name=f"{selected}.csv")

        with tab_insights:
            # KPIs
            total = len(df)
            alerts = int(df["alert"].sum()) if "alert" in df.columns else 0
            avg_score = float(df["anomaly_score"].mean()) if "anomaly_score" in df.columns else None
            p95_latency = float(df["api_latency_ms"].dropna().quantile(0.95)) if "api_latency_ms" in df.columns and df["api_latency_ms"].notna().any() else None
            p99_latency = float(df["api_latency_ms"].dropna().quantile(0.99)) if "api_latency_ms" in df.columns and df["api_latency_ms"].notna().any() else None
            attack_rows = int((df["attack_type"] != "none").sum()) if "attack_type" in df.columns else 0
            normal_rows = total - attack_rows
            tpr = ((df["attack_type"] != "none") & (df["alert"] == 1)).mean() if attack_rows > 0 and "alert" in df.columns and "attack_type" in df.columns else 0.0
            fpr = ((df["attack_type"] == "none") & (df["alert"] == 1)).mean() if normal_rows > 0 and "alert" in df.columns and "attack_type" in df.columns else 0.0
            precision = 0.0
            if "alert" in df.columns and "attack_type" in df.columns and alerts > 0:
                tp = int(((df["attack_type"] != "none") & (df["alert"] == 1)).sum())
                precision = float(tp / max(1, alerts))

            m1, m2, m3, m4, m5 = st.columns(5)
            m1.metric("Alerts", f"{alerts}", help="Count of rows labeled alert")
            m2.metric("Avg Score", f"{avg_score:.3f}" if avg_score is not None else "-")
            m3.metric("p95 API Latency (ms)", f"{p95_latency:.1f}" if p95_latency is not None else "-")
            m4.metric("p99 API Latency (ms)", f"{p99_latency:.1f}" if p99_latency is not None else "-")
            m5.metric("Precision", f"{precision:.2f}")

            # Bullet insights
            bullets = []
            if total:
                rate = alerts / total if total else 0
                bullets.append(f"Alert rate: {rate:.1%} ({alerts}/{total})")
            if attack_rows:
                bullets.append(f"TPR: {tpr:.1%} (alerts on attacked rows)")
            if normal_rows:
                bullets.append(f"FPR: {fpr:.1%} (false alerts on normal rows)")
            if "tx_volume_tps" in df.columns:
                bullets.append(f"Avg TPS: {df['tx_volume_tps'].mean():.2f}")
            if "mempool_size" in df.columns:
                bullets.append(f"Avg mempool size: {df['mempool_size'].mean():.1f}")
            st.markdown("\n".join([f"- {b}" for b in bullets]))

            # Threshold-based pass/fail
            min_tpr = float(os.getenv("PULSEGUARD_PASS_MIN_TPR", "0.7"))
            max_fpr = float(os.getenv("PULSEGUARD_PASS_MAX_FPR", "0.1"))
            min_precision = float(os.getenv("PULSEGUARD_PASS_MIN_PRECISION", "0.6"))
            max_p99_latency = float(os.getenv("PULSEGUARD_PASS_MAX_P99_MS", "250"))
            flags = {
                "TPR": tpr >= min_tpr,
                "FPR": fpr <= max_fpr,
                "Precision": precision >= min_precision,
                "p99 latency": (p99_latency is None) or (p99_latency <= max_p99_latency),
            }
            overall = all(flags.values())
            st.markdown("### Pass/Fail")
            if overall:
                st.success("Overall: PASS")
            else:
                st.error("Overall: FAIL")
            st.caption(f"Thresholds: min_tpr={min_tpr}, max_fpr={max_fpr}, min_precision={min_precision}, max_p99_ms={max_p99_latency}")

            # Charts
            c1, c2 = st.columns(2)
            with c1:
                if "anomaly_score" in df.columns:
                    st.plotly_chart(px.histogram(df, x="anomaly_score", nbins=30, title="Score Distribution",
                                                 color_discrete_sequence=[PALETTE[0]]), use_container_width=True)
                if "api_latency_ms" in df.columns and df["api_latency_ms"].notna().any():
                    st.plotly_chart(px.box(df, y="api_latency_ms", points="suspectedoutliers", title="API Latency Box"), use_container_width=True)
            with c2:
                if "tx_volume_tps" in df.columns and "anomaly_score" in df.columns:
                    st.plotly_chart(px.scatter(df.tail(1000), x="tx_volume_tps", y="anomaly_score", color=df.get("attack_type") if "attack_type" in df.columns else None,
                                               title="Score vs TPS", opacity=0.7), use_container_width=True)
                # Compute correlations in a pandas-version-compatible way (filter to numeric dtypes)
                candidate_cols = [
                    "anomaly_score","api_latency_ms","block_latency_ms","build_time_ms",
                    "mempool_size","tx_volume_tps","avg_gas_price"
                ]
                num_cols = [c for c in candidate_cols if c in df.columns and pd.api.types.is_numeric_dtype(df[c])]
                if len(num_cols) > 1:
                    try:
                        data = df[num_cols].astype(float)
                        arr = data.to_numpy()
                        corr = pd.DataFrame(np.corrcoef(arr, rowvar=False), index=num_cols, columns=num_cols)
                        st.plotly_chart(px.imshow(corr, text_auto=True, aspect="auto", title="Feature Correlations"), use_container_width=True)
                    except Exception as e:
                        st.warning(f"Correlation failed: {e}")

            # PR and ROC curves
            if _HAVE_SK and ("anomaly_score" in df.columns and "attack_type" in df.columns):
                y_true = (df["attack_type"] != "none").astype(int)
                y_score = pd.to_numeric(df["anomaly_score"], errors="coerce").fillna(0.0)  # type: ignore[attr-defined]
                try:
                    pr_p, pr_r, pr_t = precision_recall_curve(y_true, y_score)
                    ap = average_precision_score(y_true, y_score)
                    fpr_v, tpr_v, roc_t = roc_curve(y_true, y_score)
                    auc_v = roc_auc_score(y_true, y_score)

                    pr_fig = go.Figure()
                    pr_fig.add_trace(go.Scatter(x=pr_r, y=pr_p, mode="lines", name=f"PR (AP={ap:.3f})"))
                    pr_fig.update_layout(title="Precision-Recall Curve", xaxis_title="Recall", yaxis_title="Precision", height=300)

                    roc_fig = go.Figure()
                    roc_fig.add_trace(go.Scatter(x=fpr_v, y=tpr_v, mode="lines", name=f"ROC (AUC={auc_v:.3f})"))
                    roc_fig.add_trace(go.Scatter(x=[0,1], y=[0,1], mode="lines", name="chance", line=dict(dash="dash")))
                    roc_fig.update_layout(title="ROC Curve", xaxis_title="FPR", yaxis_title="TPR", height=300)

                    prc, rocc = st.columns(2)
                    with prc:
                        st.plotly_chart(pr_fig, use_container_width=True)
                    with rocc:
                        st.plotly_chart(roc_fig, use_container_width=True)
                except Exception as e:
                    st.warning(f"PR/ROC failed: {e}")
            elif not _HAVE_SK:
                st.info("scikit-learn not available; PR/ROC curves disabled.")

            # Per-attack coverage table
            if "attack_type" in df.columns and "alert" in df.columns:
                cov = (
                    df[df["attack_type"] != "none"]
                    .assign(is_alert=(df["alert"] == 1))
                    .groupby("attack_type")
                    .agg(count=("attack_type", "size"), detect_rate=("is_alert", "mean"))
                    .reset_index()
                )
                cov["detect_rate"] = cov["detect_rate"].astype(float)
                st.markdown("### Per-Attack Coverage")
                st.dataframe(cov, use_container_width=True)

            # Cross-run summary (last 8 runs)
            with st.expander("Cross-run comparisons", expanded=False):
                rows = []
                for d in artifacts[:8]:
                    cpath = d / "results.csv"
                    if not cpath.exists():
                        continue
                    try:
                        dfc = _read_csv_robust(cpath)
                        total_c = len(dfc)
                        alerts_c = int(dfc["alert"].sum()) if "alert" in dfc.columns else 0
                        ar = int((dfc["attack_type"] != "none").sum()) if "attack_type" in dfc.columns else 0
                        nr = total_c - ar
                        tpr_c = ((dfc["attack_type"] != "none") & (dfc["alert"] == 1)).mean() if ar > 0 and "alert" in dfc.columns and "attack_type" in dfc.columns else 0.0
                        fpr_c = ((dfc["attack_type"] == "none") & (dfc["alert"] == 1)).mean() if nr > 0 and "alert" in dfc.columns and "attack_type" in dfc.columns else 0.0
                        prec_c = float((((dfc["attack_type"] != "none") & (dfc["alert"] == 1)).sum()) / max(1, alerts_c)) if alerts_c > 0 and "attack_type" in dfc.columns and "alert" in dfc.columns else 0.0
                        if "api_latency_ms" in dfc.columns:
                            _s = pd.to_numeric(dfc["api_latency_ms"], errors="coerce")
                            _vals = np.array(_s, dtype=float)
                            _vals = _vals[~np.isnan(_vals)]
                            p95_c = float(np.quantile(_vals, 0.95)) if _vals.size > 0 else None
                            p99_c = float(np.quantile(_vals, 0.99)) if _vals.size > 0 else None
                        else:
                            p95_c = None
                            p99_c = None
                        rows.append({
                            "run": d.name,
                            "tpr": tpr_c,
                            "fpr": fpr_c,
                            "precision": prec_c,
                            "p95_ms": p95_c,
                            "p99_ms": p99_c,
                        })
                    except Exception:
                        continue
                if rows:
                    import pandas as _pd  # local alias to avoid confusion with df
                    cr = _pd.DataFrame(rows)
                    st.dataframe(cr, use_container_width=True)
                else:
                    st.caption("No comparable runs found yet.")

            # Precision/Recall snapshot at current threshold (baseline vs GAN)
            if _HAVE_SK and ("anomaly_score" in df.columns and "attack_type" in df.columns):
                from sklearn.metrics import precision_recall_fscore_support  # type: ignore
                y_true = (df["attack_type"] != "none").astype(int)
                y_pred = (pd.to_numeric(df["anomaly_score"], errors="coerce").fillna(0.0) >= float(det_threshold)).astype(int)
                prec, rec, f1, _ = precision_recall_fscore_support(y_true, y_pred, average="binary")
                mcol1, mcol2, mcol3 = st.columns(3)
                mcol1.metric("Precision@thr", f"{prec:.2f}")
                mcol2.metric("Recall@thr", f"{rec:.2f}")
                mcol3.metric("F1@thr", f"{f1:.2f}")

            # Export filtered CSVs
            if "is_gan" in df.columns:
                df_gan = df[df["is_gan"] == 1]
                df_base = df[df["is_gan"] == 0]
                c1, c2 = st.columns(2)
                if not df_gan.empty:
                    c1.download_button("Export GAN CSV", data=df_gan.to_csv(index=False).encode("utf-8"), file_name=f"{selected}_gan.csv")
                if not df_base.empty:
                    c2.download_button("Export Baseline CSV", data=df_base.to_csv(index=False).encode("utf-8"), file_name=f"{selected}_baseline.csv")

            # Top attack types
            if "attack_type" in df.columns:
                top = df[df["attack_type"] != "none"]["attack_type"].value_counts().head(5)
                if not top.empty:
                    st.write("Top attack types:")
                    st.table(top.rename("count"))

            # Link to exported summary from pipeline (if exists)
            rep_path = dir_path / "summary_report.md"
            if rep_path.exists():
                st.download_button("Download summary_report.md", data=rep_path.read_bytes(), file_name=f"{selected}_summary.md")

        with tab_about:
            st.subheader("About PulseGuard")
            st.markdown(
                """
                PulseGuard is Dytallix's real-time anomaly detection module for blockchain telemetry. It evaluates
                incoming transaction/context signals and returns an anomaly score and label via a FastAPI /score endpoint.
                """
            )
            st.subheader("How it works")
            st.markdown(
                """
                - SyntheticDataGen produces realistic blockchain telemetry with temporal patterns.
                - AttackInjector injects labeled anomalies (e.g., mempool_congestion, gas_spike, flash_loan_exploit).
                - pipeline_runner streams events to the PulseGuard API and writes results.csv, manifest.json, and logs.
                - The dashboard loads artifacts to visualize scores, detections, latencies, and insights in real time.
                """
            )
            st.subheader("What the tests measure")
            st.markdown(
                """
                - Detection quality: Recall/TPR, FPR, Precision, PR/ROC AUCs; score distributions.
                - Time-to-detect (TTD): median/p95/p99 latency from injection to first detection.
                - API performance: p95/p99 api_latency_ms and error rate.
                - Coverage: detections per attack_type and per-run summaries.
                - Robustness: compare metrics across different event rates.
                
                Artifacts per run: results.csv, summary_report.md, manifest.json, and a structured log.
                Use Run Test to create a new run; Reset restores default sidebar values.
                """
            )

            # --- GAN mode overview ---
            st.subheader("GAN mode")
            st.markdown(
                """
                - When enabled, the generator injects synthetic traffic labeled `is_gan=1` alongside baseline data.
                - Modes: `near_normal` (subtle distribution shifts) and `adversarial` (hard-to-detect anomalies).
                - `GAN mix ratio` sets what fraction of events come from the GAN stream.
                - The dashboard compares baseline vs GAN in the "Score Distribution" chart and metrics.
                - Useful for robustness testing, drift simulation, and stress-testing detection thresholds.
                """
            )

    # Auto-refresh logic (kept simple for compatibility across streamlit versions)
    if auto_refresh:
        st.caption(f"Auto-refreshing every {refresh_interval}s…")
        time.sleep(refresh_interval)
        _rerun()
else:
    st.info("No artifacts yet. Run `make test-pulseguard` or use 'Run 10s Test'.")
    # Keep polling for artifacts to be created
    if auto_refresh:
        st.caption(f"Waiting for new run… refreshing every {refresh_interval}s…")
        time.sleep(refresh_interval)
        _rerun()
