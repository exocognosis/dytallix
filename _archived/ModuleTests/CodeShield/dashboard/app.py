import streamlit as st
import pandas as pd
import json
from pathlib import Path
import plotly.express as px
import os
import io
import time
import httpx

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / "artifacts"

# Load .env if available
try:
    from dotenv import load_dotenv  # type: ignore
    for _env in [ROOT.parent / "config" / ".env", ROOT.parent / ".env", ROOT / ".env"]:
        if _env.exists():
            load_dotenv(_env)
            break
except Exception:
    pass

API = os.getenv("CODESHIELD_API", "http://127.0.0.1:7081")
TIMEOUT_S = int(os.getenv("CODESHIELD_TIMEOUT_S", "60"))

st.set_page_config(page_title="CodeShield Dashboard", layout="wide")
st.title("CodeShield Test Dashboard")

# Helpers

def _safe_json(resp: httpx.Response):
    try:
        return resp.json()
    except Exception:
        return {"raw": resp.text}

# ------------------------
# Interactive Scanner
# ------------------------
st.header("Interactive Scan")
with st.expander("Scan a Solidity contract (paste code or upload .sol)", expanded=True):
    colL, colR = st.columns([2, 1])
    with colL:
        code_text = st.text_area("Paste Solidity code", height=240, placeholder="// SPDX-License-Identifier: MIT\npragma solidity ^0.8.20;\ncontract C { /* ... */ }")
    with colR:
        uploaded = st.file_uploader("or Upload .sol", type=["sol"])  # type: ignore
        api_url = st.text_input("API Base URL", API)
        poll_s = st.number_input("Poll interval (s)", min_value=0.2, max_value=5.0, value=0.5, step=0.1)
        timeout_s = st.number_input("Timeout (s)", min_value=5, max_value=300, value=TIMEOUT_S, step=5)
        save_artifacts = st.checkbox("Save report to artifacts", value=True)
    do_scan = st.button("Scan Contract", type="primary")

    if do_scan:
        content: bytes = b""
        filename = "Pasted.sol"
        if uploaded is not None:
            filename = uploaded.name or filename
            content = uploaded.read()
        elif code_text.strip():
            content = code_text.encode()
        else:
            st.warning("Provide code or upload a file.")
        if content:
            try:
                with httpx.Client(base_url=api_url, timeout=timeout_s) as client:
                    files = [("files", (filename, content))]
                    with st.spinner("Submitting scan..."):
                        try:
                            r = client.post("/scan", files=files)
                        except httpx.RequestError as e:
                            st.error(f"Network error submitting scan: {e}")
                            st.stop()

                    if r.status_code >= 400:
                        err_body = _safe_json(r)
                        st.error(f"Scan error: {r.status_code}")
                        with st.expander("Details"):
                            st.write(err_body)
                    else:
                        body = _safe_json(r)
                        sid = body.get("id") or body.get("scan_id")
                        if not sid:
                            st.error("No scan id returned")
                        else:
                            with st.status("Scanning...", expanded=True) as status:
                                started = time.time()
                                rep = None
                                last_err = None
                                while time.time() - started < timeout_s:
                                    time.sleep(float(poll_s))
                                    try:
                                        rr = client.get(f"/report/{sid}")
                                        if rr.status_code == 200:
                                            rep = _safe_json(rr)
                                            if str(rep.get("status", "")).lower() in {"done", "completed", "ok", "success"}:
                                                break
                                        elif rr.status_code >= 400:
                                            last_err = _safe_json(rr)
                                    except httpx.RequestError as e:
                                        last_err = {"error": str(e)}
                                        continue
                                if not rep:
                                    status.update(label="Scan failed or timed out", state="error")
                                    st.error("Timeout waiting for report")
                                    if last_err:
                                        with st.expander("Last error"):
                                            st.write(last_err)
                                else:
                                    status.update(label="Scan complete", state="complete")
                                    # Render results
                                    st.subheader("Results")
                                    st.json(rep)

                                    # Optional save to artifacts
                                    if save_artifacts:
                                        try:
                                            (ART / "reports").mkdir(parents=True, exist_ok=True)
                                            outp = ART / "reports" / f"{sid}.json"
                                            outp.write_text(json.dumps(rep, indent=2))
                                            st.success(f"Saved {outp}")
                                        except Exception as e:
                                            st.warning(f"Could not save artifact: {e}")

                                    # Download button
                                    st.download_button("Download Report (JSON)", data=json.dumps(rep, indent=2), file_name=f"{sid}.json", mime="application/json")

                                    # Findings table
                                    fins = rep.get("findings", []) or []
                                    if fins:
                                        dfF = pd.DataFrame(fins)
                                        st.dataframe(dfF)
                                        # Severity distribution
                                        if "severity" in dfF.columns:
                                            try:
                                                st.plotly_chart(px.histogram(dfF, x="severity", title="Findings by severity"), use_container_width=True)
                                                sev_counts = dfF["severity"].value_counts().reset_index()
                                                sev_counts.columns = ["severity", "count"]
                                                st.plotly_chart(px.pie(sev_counts, names="severity", values="count", title="Severity breakdown"), use_container_width=True)
                                            except Exception:
                                                pass
                                        # Rank histogram
                                        if "rank" in dfF.columns:
                                            try:
                                                st.plotly_chart(px.histogram(dfF, x="rank", nbins=10, title="Rank distribution"), use_container_width=True)
                                            except Exception:
                                                pass
                                        # Rule frequency
                                        if "rule_id" in dfF.columns:
                                            try:
                                                rule_counts = dfF["rule_id"].value_counts().reset_index()
                                                rule_counts.columns = ["rule_id", "count"]
                                                st.plotly_chart(px.bar(rule_counts, x="rule_id", y="count", title="Findings by rule"), use_container_width=True)
                                            except Exception:
                                                pass
                                    else:
                                        st.info("No findings reported.")

                                    # Gas hints
                                    hints = rep.get("gas_hints", []) or []
                                    if hints:
                                        st.subheader("Gas/Complexity Hints")
                                        st.dataframe(pd.DataFrame(hints))

                                    # Suggested fixes
                                    st.subheader("Suggested Fixes")
                                    SUGGEST = {
                                        "REENTRANCY": "Use checks-effects-interactions, reentrancy guards (OpenZeppelin ReentrancyGuard), and avoid external calls before state updates.",
                                        "TX_ORIGIN": "Do not use tx.origin for authorization; use msg.sender and role-based access control.",
                                        "DELEGATECALL": "Avoid arbitrary delegatecall; pin to trusted implementations, use transparent/UUPS proxy patterns, validate implementation storage layout.",
                                        "UNCHECKED_CALL": "Check return values of low-level calls or use functions that revert on failure.",
                                        "INTEGER_ISSUES": "Use Solidity ^0.8.x checked arithmetic or SafeMath where applicable; validate inputs and bounds.",
                                        "STORAGE_COLLISION": "Reserve storage slots and follow upgrade-safe patterns (ERC-1967, UUPS); avoid variable reordering across upgrades.",
                                        "STORAGE_LAYOUT": "When upgrading, keep storage layout compatible; append variables and run storage diff tools before deployment.",
                                        "UNPROTECTED_UPGRADE": "Restrict upgrade entry points to admin-only and validate new implementation, add pause switches.",
                                        "ACCESS_CONTROL": "Enforce RBAC with onlyOwner/AccessControl, check modifiers on all sensitive functions.",
                                        "ARBITRARY_WRITE": "Validate input and index bounds, restrict writes to authorized actors only.",
                                        "FRONT_RUNNING": "Use commit-reveal, minimum delays, or anti-MEV patterns for sensitive operations.",
                                        "PRICE_ORACLE": "Use TWAP/medianized oracles; validate sources and add circuit breakers.",
                                        "DENIAL_OF_SERVICE": "Avoid unbounded loops and external calls in critical paths; add pull over push patterns.",
                                        "SELFDESTRUCT": "Avoid selfdestruct or restrict it to timelocked governance.",
                                        "TIMESTAMP_DEPENDENCY": "Use block.number or time windows; avoid exact timestamp equality checks.",
                                    }
                                    if fins:
                                        for f in fins:
                                            rid = str(f.get("rule_id") if isinstance(f, dict) else f)
                                            st.markdown(f"- {rid}: {SUGGEST.get(rid, 'Review business logic, apply least privilege, validate inputs, and add tests.')}")
            except Exception as e:
                st.error(f"Scan failed: {e}")

# ------------------------
# Batch Artifacts View
# ------------------------
st.header("Batch Artifacts")
results = ART / "results.csv"
errors = ART / "errors.csv"
latency = ART / "latency.json"

col1, col2, col3 = st.columns(3)

if results.exists():
    df = pd.read_csv(results)
    p50 = 0
    if latency.exists():
        try:
            p50 = json.loads(latency.read_text()).get("p50", 0) or 0
        except Exception:
            p50 = 0
    col1.metric("Contracts", len(df))
    col2.metric("High findings", int(df.get("high_findings", pd.Series(dtype=int)).sum()) if not df.empty else 0)
    col3.metric("Median latency (ms)", float(p50))
    st.dataframe(df)
    if not df.empty:
        if "high_findings" in df.columns:
            st.plotly_chart(px.histogram(df, x="high_findings", nbins=5, title="High findings distribution"), use_container_width=True)
        if "latency_ms" in df.columns:
            st.plotly_chart(px.histogram(df, x="latency_ms", nbins=20, title="Latency (ms)"), use_container_width=True)
else:
    st.info("No results yet. Run: make run")

if errors.exists():
    st.subheader("Errors")
    try:
        st.dataframe(pd.read_csv(errors))
    except Exception as e:
        st.warning(f"Could not load errors.csv: {e}")

# Export bundle
if st.button("Export Bundle (.tgz)"):
    import tarfile, time as _t
    tgz = ART / f"bundle_{int(_t.time())}.tgz"
    with tarfile.open(tgz, "w:gz") as tar:
        for p in ART.glob("**/*"):
            if p.is_file():
                tar.add(p, arcname=p.relative_to(ART))
    st.success(f"Wrote {tgz}")
