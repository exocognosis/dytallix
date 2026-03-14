#!/usr/bin/env python3

import argparse
import json
import os
import subprocess
import sys
import urllib.error
import urllib.request
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[2]
AGENT_DIR = ROOT / "agent"
AGENT_DIST = AGENT_DIR / "dist" / "cli.js"
E2E_DATA_ROOT = ROOT / "infra" / "data" / "local-managed-endpoint-e2e"
E2E_ARTIFACT_ROOT = ROOT / ".secure" / "local-services" / "e2e" / "managed-endpoint"


class ApiError(RuntimeError):
    def __init__(self, method: str, path: str, status: int, payload: Any):
        super().__init__(f"{method} {path} failed with HTTP {status}: {payload}")
        self.method = method
        self.path = path
        self.status = status
        self.payload = payload


@dataclass
class RunContext:
    run_label: str
    artifact_root: Path
    agent_root: Path
    enrollment_path: Path
    bundle_path: Path
    result_path: Path
    source_dir: Path
    dest_dir: Path
    source_file: Path
    device_id: str


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run the QuantumVault managed checkout/check-in flow against the local stack.",
    )
    parser.add_argument("--api-base-url", default="http://127.0.0.1:13000/api/v1")
    parser.add_argument("--admin-email", default="admin@quantumvault.local")
    parser.add_argument("--admin-password", default="QuantumVault2024!")
    parser.add_argument("--device-compliance", default="MANAGED")
    parser.add_argument("--network-zone", default="INTERNAL")
    parser.add_argument("--location-label", default="Phoenix Lab")
    parser.add_argument("--location-code", default="PHX-LAB")
    parser.add_argument("--device-label", default="Local E2E Device")
    parser.add_argument("--skip-anchor-rotation", action="store_true")
    parser.add_argument("--keep-workspace", action="store_true")
    return parser.parse_args()


def ensure_secure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)
    os.chmod(path, 0o700)


def write_secure_text(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
    os.chmod(path, 0o600)


def write_secure_json(path: Path, payload: Any) -> None:
    write_secure_text(path, json.dumps(payload, indent=2))


def now_label() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def make_run_context() -> RunContext:
    run_label = f"{now_label()}-{uuid.uuid4().hex[:8]}"
    artifact_root = E2E_ARTIFACT_ROOT / run_label
    agent_root = artifact_root / "agent-home"
    enrollment_path = artifact_root / "enrollment.json"
    bundle_path = artifact_root / "checkout-bundle.json"
    result_path = artifact_root / "result.json"
    source_dir = E2E_DATA_ROOT / run_label / "source"
    dest_dir = E2E_DATA_ROOT / run_label / "dest"
    device_id = f"local-e2e-{uuid.uuid4().hex[:8]}"

    ensure_secure_dir(artifact_root)
    ensure_secure_dir(agent_root)
    ensure_secure_dir(source_dir)
    ensure_secure_dir(dest_dir)

    source_file = source_dir / "managed-endpoint-e2e.txt"
    write_secure_text(
        source_file,
        "\n".join(
            [
                "QuantumVault managed endpoint local verification",
                f"run={run_label}",
                f"created_at={datetime.now(timezone.utc).isoformat()}",
                "",
            ]
        ),
    )

    return RunContext(
        run_label=run_label,
        artifact_root=artifact_root,
        agent_root=agent_root,
        enrollment_path=enrollment_path,
        bundle_path=bundle_path,
        result_path=result_path,
        source_dir=source_dir,
        dest_dir=dest_dir,
        source_file=source_file,
        device_id=device_id,
    )


def api_request(
    base_url: str,
    method: str,
    path: str,
    payload: Any | None = None,
    token: str | None = None,
    extra_headers: dict[str, str] | None = None,
) -> Any:
    headers: dict[str, str] = {}
    data = None
    if payload is not None:
        headers["Content-Type"] = "application/json"
        data = json.dumps(payload).encode("utf-8")
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if extra_headers:
        headers.update(extra_headers)

    request = urllib.request.Request(
        f"{base_url.rstrip('/')}{path}",
        data=data,
        headers=headers,
        method=method,
    )
    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            body = response.read().decode("utf-8")
            return json.loads(body) if body else None
    except urllib.error.HTTPError as error:
        body = error.read().decode("utf-8")
        try:
            parsed = json.loads(body) if body else None
        except json.JSONDecodeError:
            parsed = body
        raise ApiError(method, path, error.code, parsed) from error


def run_command(args: list[str], cwd: Path | None = None) -> str:
    completed = subprocess.run(
        args,
        cwd=str(cwd) if cwd else None,
        check=True,
        capture_output=True,
        text=True,
    )
    return completed.stdout.strip()


def ensure_agent_cli() -> None:
    if AGENT_DIST.exists():
        return

    if not (AGENT_DIR / "node_modules" / "typescript" / "bin" / "tsc").exists():
        raise RuntimeError(
            "Agent dependencies are missing. Run `cd QuantumVaultMVP/agent && npm install` first.",
        )

    run_command(
        [
            "npx",
            "-p",
            "node@22",
            "node",
            "./node_modules/typescript/bin/tsc",
            "-p",
            "tsconfig.json",
        ],
        cwd=AGENT_DIR,
    )


def run_agent(args: list[str]) -> Any:
    ensure_agent_cli()
    stdout = run_command(["npx", "-p", "node@22", "node", "dist/cli.js", *args], cwd=AGENT_DIR)
    return json.loads(stdout)


def container_path(path: Path) -> str:
    data_root = (ROOT / "infra" / "data").resolve()
    resolved = path.resolve()
    relative = resolved.relative_to(data_root)
    return f"/app/data/{relative.as_posix()}"


def login(args: argparse.Namespace, context: RunContext) -> tuple[str, dict[str, Any]]:
    payload = api_request(
        args.api_base_url,
        "POST",
        "/auth/login",
        {
            "email": args.admin_email,
            "password": args.admin_password,
        },
        extra_headers={
            "x-qv-device-id": context.device_id,
            "x-qv-device-compliance": args.device_compliance,
            "x-qv-network-zone": args.network_zone,
            "x-qv-location": args.location_label,
        },
    )
    return payload["access_token"], payload["user"]


def ensure_local_dev_anchors(base_url: str, token: str, skip_rotation: bool) -> list[dict[str, str]]:
    anchors = api_request(base_url, "GET", "/anchors", token=token)
    repaired: list[dict[str, str]] = []
    desired = [
        ("ML-DSA-65", "Local E2E Signer"),
        ("ML-KEM-1024", "Local E2E KEM"),
    ]

    for algorithm, label in desired:
        active = [anchor for anchor in anchors if anchor.get("algorithm") == algorithm and anchor.get("isActive")]
        if active and not skip_rotation:
            newest = sorted(active, key=lambda anchor: anchor.get("createdAt") or "", reverse=True)[0]
            rotated = api_request(base_url, "POST", f"/anchors/{newest['id']}/rotate", token=token)
            repaired.append(
                {
                    "algorithm": algorithm,
                    "action": "rotated",
                    "anchorId": rotated["id"],
                    "vaultPrivKeyPath": rotated["vaultPrivKeyPath"],
                }
            )
            continue

        if active:
            repaired.append(
                {
                    "algorithm": algorithm,
                    "action": "reused",
                    "anchorId": active[0]["id"],
                    "vaultPrivKeyPath": active[0]["vaultPrivKeyPath"],
                }
            )
            continue

        created = api_request(
            base_url,
            "POST",
            "/anchors",
            {"name": f"{label} {now_label()}", "algorithm": algorithm},
            token=token,
        )
        repaired.append(
            {
                "algorithm": algorithm,
                "action": "created",
                "anchorId": created["id"],
                "vaultPrivKeyPath": created["vaultPrivKeyPath"],
            }
        )

    return repaired


def run_local_pipeline(base_url: str, token: str, context: RunContext) -> tuple[dict[str, Any], dict[str, Any]]:
    payload = {
        "originDatabase": container_path(context.source_dir),
        "destinationDatabase": container_path(context.dest_dir),
        "sourceDirectories": container_path(context.source_dir),
        "destinationDirectories": container_path(context.dest_dir),
        "directories": container_path(context.source_dir),
        "fileTypes": ".txt",
        "formats": "TXT",
        "maxFiles": "10",
        "maxFileSizeBytes": str(2 * 1024 * 1024),
        "defaultPqcLevel": "maximum",
        "kemAlgorithm": "ML-KEM-1024",
        "enableDilithium": True,
        "enableSphincs": False,
        "signatureAlgorithms": "ML-DSA-65",
        "verifyManifestSha": True,
    }
    pipeline = api_request(base_url, "POST", "/admin/pqc-pipeline", payload, token=token)
    if not pipeline.get("success"):
        raise RuntimeError(f"Pipeline failed: {pipeline}")

    run = api_request(base_url, "GET", f"/pipeline/runs/{pipeline['runId']}", token=token)
    relative_path = context.source_file.name
    asset = next(
        (
            candidate
            for candidate in run.get("assets", [])
            if candidate.get("relativePath") == relative_path and candidate.get("status") == "TRANSFERRED"
        ),
        None,
    )
    if not asset:
        raise RuntimeError(f"Processed pipeline asset not found in run {pipeline['runId']}: {run}")

    return pipeline, asset


def issue_managed_credential(
    base_url: str,
    token: str,
    user: dict[str, Any],
    args: argparse.Namespace,
    context: RunContext,
) -> tuple[dict[str, Any], dict[str, Any]]:
    enrollment = run_agent(
        [
            "init",
            "--root",
            str(context.agent_root),
            "--profile",
            "local-e2e",
            "--device-id",
            context.device_id,
            "--device-label",
            args.device_label,
            "--network-zone",
            args.network_zone,
            "--location-label",
            args.location_label,
            "--location-code",
            args.location_code,
            "--output",
            str(context.enrollment_path),
        ]
    )["enrollment"]

    credential = api_request(
        base_url,
        "POST",
        "/admin/managed-credentials",
        {
            "displayName": f"Local E2E Credential {context.run_label}",
            "assignedUserId": user["id"],
            "deviceId": enrollment["deviceId"],
            "deviceLabel": enrollment["deviceLabel"],
            "deviceKeyAlgorithm": enrollment["deviceKeyAlgorithm"],
            "devicePublicKey": enrollment["devicePublicKey"],
            "networkZone": enrollment["networkZone"],
            "locationLabel": args.location_label,
            "locationCode": args.location_code,
            "reason": f"Managed endpoint E2E validation {context.run_label}",
        },
        token=token,
    )
    return enrollment, credential


def issue_access_session(
    base_url: str,
    token: str,
    asset_id: str,
    run_label: str,
) -> tuple[dict[str, Any], str, str, str]:
    access = api_request(
        base_url,
        "POST",
        "/access/requests",
        {
            "pipelineAssetId": asset_id,
            "action": "DOWNLOAD",
            "ttlSeconds": 1800,
            "reason": f"Managed endpoint E2E validation {run_label}",
        },
        token=token,
    )

    decision = access["decision"]["decision"]
    if decision != "APPROVED":
        raise RuntimeError(f"Access request was not approved: {access}")

    request_id = access["request"]["id"]
    if "session" in access and "sessionToken" in access:
        return access, request_id, access["session"]["id"], access["sessionToken"]

    activation = api_request(base_url, "POST", f"/access/requests/{request_id}/activate", token=token)
    return access, request_id, activation["sessionId"], activation["sessionToken"]


def checkout_and_checkin(
    base_url: str,
    token: str,
    session_id: str,
    session_token: str,
    enrollment: dict[str, Any],
    credential: dict[str, Any],
    context: RunContext,
    keep_workspace: bool,
) -> tuple[dict[str, Any], dict[str, Any], dict[str, Any]]:
    run_agent(
        [
            "trust-sync",
            "--root",
            str(context.agent_root),
            "--profile",
            "local-e2e",
            "--server-base-url",
            base_url.removesuffix("/api/v1"),
        ]
    )

    bundle = api_request(
        base_url,
        "POST",
        f"/access/sessions/{session_id}/checkout",
        {
            "sessionToken": session_token,
            "credentialId": credential["id"],
            "deviceKeyAlgorithm": enrollment["deviceKeyAlgorithm"],
            "devicePublicKey": enrollment["devicePublicKey"],
            "agentVersion": enrollment["agentVersion"],
            "workspaceId": f"managed-endpoint-e2e-{context.run_label}",
            "reason": f"Managed endpoint E2E validation {context.run_label}",
        },
        token=token,
    )
    write_secure_json(context.bundle_path, bundle)

    opened = run_agent(
        [
            "open",
            "--root",
            str(context.agent_root),
            "--profile",
            "local-e2e",
            "--bundle",
            str(context.bundle_path),
            "--server-base-url",
            base_url.removesuffix("/api/v1"),
        ]
    )
    plaintext_path = Path(opened["plaintextPath"])
    with plaintext_path.open("a", encoding="utf-8") as handle:
        handle.write(
            f"checked_in_at={datetime.now(timezone.utc).isoformat()}\n"
            f"run={context.run_label}\n"
        )

    checkin_args = [
        "checkin",
        "--workspace",
        opened["workspacePath"],
        "--server-base-url",
        base_url.removesuffix("/api/v1"),
        "--editor",
        "QuantumVault Managed Endpoint E2E",
        "--reason",
        f"Managed endpoint E2E validation complete {context.run_label}",
    ]
    if keep_workspace:
        checkin_args.append("--keep-workspace")

    checked_in = run_agent(checkin_args)
    return bundle, opened, checked_in


def collect_audit_events(
    base_url: str,
    token: str,
    session_id: str,
    request_id: str,
) -> list[dict[str, Any]]:
    events = api_request(base_url, "GET", "/access/audit", token=token)
    return [
        event
        for event in events
        if event.get("accessSessionId") == session_id or event.get("accessRequestId") == request_id
    ]


def main() -> int:
    args = parse_args()
    context = make_run_context()

    token, user = login(args, context)
    repaired_anchors = ensure_local_dev_anchors(args.api_base_url, token, args.skip_anchor_rotation)
    pipeline, asset = run_local_pipeline(args.api_base_url, token, context)
    enrollment, credential = issue_managed_credential(args.api_base_url, token, user, args, context)
    access, request_id, session_id, session_token = issue_access_session(
        args.api_base_url,
        token,
        asset["id"],
        context.run_label,
    )
    bundle, opened, checked_in = checkout_and_checkin(
        args.api_base_url,
        token,
        session_id,
        session_token,
        enrollment,
        credential,
        context,
        args.keep_workspace,
    )
    audit_events = collect_audit_events(args.api_base_url, token, session_id, request_id)
    blockchain_status = api_request(args.api_base_url, "GET", "/blockchain/status")

    required_actions = {
        "ACCESS_REQUEST_CREATED",
        "ACCESS_SESSION_ISSUED",
        "CHECKOUT_BUNDLE_ISSUED",
        "CHECKOUT_SESSION_CHECKED_IN",
    }
    observed_actions = {event.get("action") for event in audit_events}
    missing_actions = sorted(required_actions - observed_actions)
    if missing_actions:
        raise RuntimeError(f"Missing audit actions for session {session_id}: {missing_actions}")

    result = {
        "runLabel": context.run_label,
        "artifactRoot": str(context.artifact_root),
        "sourceRoot": str(context.source_dir),
        "destinationRoot": str(context.dest_dir),
        "deviceId": context.device_id,
        "userId": user["id"],
        "anchorRepair": repaired_anchors,
        "pipeline": {
            "runId": pipeline["runId"],
            "processed": pipeline["processed"],
            "skipped": pipeline["skipped"],
            "failed": pipeline["failed"],
            "assetId": asset["id"],
            "relativePath": asset["relativePath"],
            "storageLocation": asset["storageLocation"],
        },
        "credential": {
            "id": credential["id"],
            "deviceId": credential["deviceId"],
            "networkZone": credential["networkZone"],
        },
        "access": {
            "requestId": request_id,
            "decision": access["decision"]["decision"],
            "policyHash": access["decision"]["policyHash"],
            "sessionId": session_id,
        },
        "checkout": {
            "bundleId": bundle["bundleId"],
            "workspacePath": opened["workspacePath"],
        },
        "checkin": checked_in["response"],
        "audit": {
            "eventCount": len(audit_events),
            "actions": sorted(observed_actions),
        },
        "blockchain": blockchain_status,
    }
    write_secure_json(context.result_path, result)
    sys.stdout.write(f"{json.dumps(result, indent=2)}\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
