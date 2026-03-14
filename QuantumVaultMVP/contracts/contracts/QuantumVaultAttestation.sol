// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title QuantumVaultAttestation
 * @dev On-chain proof registry for PQC attestations and access-ledger proofs
 */
contract QuantumVaultAttestation {
    struct Attestation {
        bytes32 attestationHash;
        string assetFingerprint;
        string anchorId;
        uint256 timestamp;
        address recorder;
        bytes mldsaSignature;
        bytes32 signerKeyHash;
    }

    struct AccessProof {
        bytes32 attestationHash;
        bytes32 assetIdHash;
        bytes32 contentHash;
        bytes32 policyHash;
        bytes32 eventTypeHash;
        bytes32 requesterHash;
        bytes32 approvalHash;
        uint256 sessionTtlSeconds;
        string anchorRef;
        uint256 timestamp;
        address recorder;
        bytes systemSignature;
        bytes32 signerKeyHash;
    }

    mapping(uint256 => Attestation) public attestations;
    mapping(uint256 => AccessProof) public accessProofs;
    uint256 public attestationCount;
    uint256 public accessProofCount;

    event AttestationRecorded(
        uint256 indexed attestationId,
        bytes32 indexed attestationHash,
        address indexed recorder,
        string assetFingerprint,
        string anchorId,
        uint256 timestamp
    );

    event AccessProofRecorded(
        uint256 indexed proofId,
        bytes32 indexed attestationHash,
        address indexed recorder,
        bytes32 assetIdHash,
        bytes32 contentHash,
        bytes32 policyHash,
        bytes32 eventTypeHash,
        bytes32 requesterHash,
        bytes32 approvalHash,
        uint256 sessionTtlSeconds,
        string anchorRef,
        uint256 timestamp
    );

    function recordAttestation(
        bytes32 attestationHash,
        string memory assetFingerprint,
        string memory anchorId,
        bytes memory mldsaSignature,
        bytes32 signerKeyHash
    ) public returns (uint256) {
        require(attestationHash != bytes32(0), "Invalid attestation hash");
        require(bytes(assetFingerprint).length > 0, "Asset fingerprint required");
        require(bytes(anchorId).length > 0, "Anchor ID required");
        require(mldsaSignature.length > 0, "Signature required");

        uint256 attestationId = attestationCount++;

        attestations[attestationId] = Attestation({
            attestationHash: attestationHash,
            assetFingerprint: assetFingerprint,
            anchorId: anchorId,
            timestamp: block.timestamp,
            recorder: msg.sender,
            mldsaSignature: mldsaSignature,
            signerKeyHash: signerKeyHash
        });

        emit AttestationRecorded(
            attestationId,
            attestationHash,
            msg.sender,
            assetFingerprint,
            anchorId,
            block.timestamp
        );

        return attestationId;
    }

    function recordAccessProof(
        bytes32 attestationHash,
        bytes32 assetIdHash,
        bytes32 contentHash,
        bytes32 policyHash,
        bytes32 eventTypeHash,
        bytes32 requesterHash,
        bytes32 approvalHash,
        uint256 sessionTtlSeconds,
        string memory anchorRef,
        bytes memory systemSignature,
        bytes32 signerKeyHash
    ) public returns (uint256) {
        require(attestationHash != bytes32(0), "Invalid attestation hash");
        require(assetIdHash != bytes32(0), "Asset ID hash required");
        require(contentHash != bytes32(0), "Content hash required");
        require(policyHash != bytes32(0), "Policy hash required");
        require(eventTypeHash != bytes32(0), "Event type hash required");
        require(requesterHash != bytes32(0), "Requester hash required");
        require(bytes(anchorRef).length > 0, "Anchor reference required");
        require(systemSignature.length > 0, "System signature required");

        uint256 proofId = accessProofCount++;

        accessProofs[proofId] = AccessProof({
            attestationHash: attestationHash,
            assetIdHash: assetIdHash,
            contentHash: contentHash,
            policyHash: policyHash,
            eventTypeHash: eventTypeHash,
            requesterHash: requesterHash,
            approvalHash: approvalHash,
            sessionTtlSeconds: sessionTtlSeconds,
            anchorRef: anchorRef,
            timestamp: block.timestamp,
            recorder: msg.sender,
            systemSignature: systemSignature,
            signerKeyHash: signerKeyHash
        });

        emit AccessProofRecorded(
            proofId,
            attestationHash,
            msg.sender,
            assetIdHash,
            contentHash,
            policyHash,
            eventTypeHash,
            requesterHash,
            approvalHash,
            sessionTtlSeconds,
            anchorRef,
            block.timestamp
        );

        return proofId;
    }

    function getAttestation(uint256 attestationId)
        public
        view
        returns (
            bytes32 attestationHash,
            string memory assetFingerprint,
            string memory anchorId,
            uint256 timestamp,
            address recorder,
            bytes memory mldsaSignature,
            bytes32 signerKeyHash
        )
    {
        require(attestationId < attestationCount, "Attestation does not exist");

        Attestation memory att = attestations[attestationId];
        return (
            att.attestationHash,
            att.assetFingerprint,
            att.anchorId,
            att.timestamp,
            att.recorder,
            att.mldsaSignature,
            att.signerKeyHash
        );
    }

    function getAccessProof(uint256 proofId)
        public
        view
        returns (
            bytes32 attestationHash,
            bytes32 assetIdHash,
            bytes32 contentHash,
            bytes32 policyHash,
            bytes32 eventTypeHash,
            bytes32 requesterHash,
            bytes32 approvalHash,
            uint256 sessionTtlSeconds,
            string memory anchorRef,
            uint256 timestamp,
            address recorder,
            bytes memory systemSignature,
            bytes32 signerKeyHash
        )
    {
        require(proofId < accessProofCount, "Access proof does not exist");

        AccessProof memory proof = accessProofs[proofId];
        return (
            proof.attestationHash,
            proof.assetIdHash,
            proof.contentHash,
            proof.policyHash,
            proof.eventTypeHash,
            proof.requesterHash,
            proof.approvalHash,
            proof.sessionTtlSeconds,
            proof.anchorRef,
            proof.timestamp,
            proof.recorder,
            proof.systemSignature,
            proof.signerKeyHash
        );
    }

    function verifyAttestationHash(bytes32 attestationHash)
        public
        view
        returns (bool exists, uint256 attestationId)
    {
        for (uint256 i = 0; i < attestationCount; i++) {
            if (attestations[i].attestationHash == attestationHash) {
                return (true, i);
            }
        }
        return (false, 0);
    }
}
