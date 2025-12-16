// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title QuantumVaultAttestation
 * @dev Contract for recording cryptographic attestations on-chain
 */
contract QuantumVaultAttestation {
    struct Attestation {
        bytes32 attestationHash;
        string assetFingerprint;
        string anchorId;
        uint256 timestamp;
        address recorder;
    }

    mapping(uint256 => Attestation) public attestations;
    uint256 public attestationCount;

    event AttestationRecorded(
        uint256 indexed attestationId,
        bytes32 indexed attestationHash,
        address indexed recorder,
        string assetFingerprint,
        string anchorId,
        uint256 timestamp
    );

    /**
     * @dev Records a new attestation on-chain
     * @param attestationHash The hash of the attestation data
     * @param assetFingerprint The fingerprint of the asset being attested
     * @param anchorId The ID of the anchor used for wrapping
     * @return attestationId The ID of the recorded attestation
     */
    function recordAttestation(
        bytes32 attestationHash,
        string memory assetFingerprint,
        string memory anchorId
    ) public returns (uint256) {
        require(attestationHash != bytes32(0), "Invalid attestation hash");
        require(bytes(assetFingerprint).length > 0, "Asset fingerprint required");
        require(bytes(anchorId).length > 0, "Anchor ID required");

        uint256 attestationId = attestationCount++;
        
        attestations[attestationId] = Attestation({
            attestationHash: attestationHash,
            assetFingerprint: assetFingerprint,
            anchorId: anchorId,
            timestamp: block.timestamp,
            recorder: msg.sender
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

    /**
     * @dev Retrieves an attestation by ID
     * @param attestationId The ID of the attestation
     * @return attestationHash The hash of the attestation
     * @return assetFingerprint The asset fingerprint
     * @return anchorId The anchor ID
     * @return timestamp When the attestation was recorded
     * @return recorder The address that recorded the attestation
     */
    function getAttestation(uint256 attestationId)
        public
        view
        returns (
            bytes32 attestationHash,
            string memory assetFingerprint,
            string memory anchorId,
            uint256 timestamp,
            address recorder
        )
    {
        require(attestationId < attestationCount, "Attestation does not exist");
        
        Attestation memory att = attestations[attestationId];
        return (
            att.attestationHash,
            att.assetFingerprint,
            att.anchorId,
            att.timestamp,
            att.recorder
        );
    }

    /**
     * @dev Verifies if an attestation hash exists
     * @param attestationHash The hash to verify
     * @return exists Whether the hash has been recorded
     * @return attestationId The ID of the attestation (0 if not found)
     */
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
