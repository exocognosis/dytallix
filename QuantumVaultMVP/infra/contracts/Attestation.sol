// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

contract QuantumVaultAttestation {
    event Attested(
        bytes32 indexed assetFingerprint,
        bytes32 indexed anchorIdHash,
        bytes32 indexed policySnapshotHash,
        string wrapperAlgorithm,
        uint8 riskLevel,
        uint256 timestamp,
        address submitter
    );

    mapping(bytes32 => bool) public seen;

    function attest(
        bytes32 assetFingerprint,
        bytes32 anchorIdHash,
        bytes32 policySnapshotHash,
        string calldata wrapperAlgorithm,
        uint8 riskLevel,
        uint256 timestamp
    ) external {
        // Idempotency: ignore duplicates.
        if (seen[assetFingerprint]) {
            return;
        }
        seen[assetFingerprint] = true;
        emit Attested(assetFingerprint, anchorIdHash, policySnapshotHash, wrapperAlgorithm, riskLevel, timestamp, msg.sender);
    }
}
