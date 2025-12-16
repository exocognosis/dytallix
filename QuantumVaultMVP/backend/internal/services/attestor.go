package services

import (
	"context"
	"crypto/ecdsa"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"math/big"
	"os"
	"sort"
	"strings"
	"time"

	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/ethclient"
	"go.uber.org/zap"

	"quantumvaultmvp/backend/internal/config"
	"quantumvaultmvp/backend/internal/db"
)

type Attestor struct {
	log *zap.Logger
	db  *db.DB

	client *ethclient.Client
	chainID *big.Int
	contractAddress common.Address
	contractABI abi.ABI
	privateKey *ecdsa.PrivateKey
	network string
}

type contractFile struct {
	Address string          `json:"address"`
	ChainId string          `json:"chainId"`
	ABI     json.RawMessage `json:"abi"`
}

func NewAttestor(logger *zap.Logger, database *db.DB, cfg config.Config) (*Attestor, error) {
	if cfg.EthRPCURL == "" || cfg.EthPrivateKey == "" || cfg.AttestationContractFile == "" {
		return nil, errors.New("attestation required: set QV_ETH_RPC_URL, QV_ETH_PRIVATE_KEY, QV_ATTESTATION_CONTRACT_FILE")
	}
	cli, err := ethclient.Dial(cfg.EthRPCURL)
	if err != nil {
		return nil, err
	}
	pk, err := crypto.HexToECDSA(strings.TrimPrefix(cfg.EthPrivateKey, "0x"))
	if err != nil {
		return nil, err
	}

	b, err := os.ReadFile(cfg.AttestationContractFile)
	if err != nil {
		return nil, err
	}
	var cf contractFile
	if err := json.Unmarshal(b, &cf); err != nil {
		return nil, err
	}
	addr := common.HexToAddress(cf.Address)

	var abiItems any
	if err := json.Unmarshal(cf.ABI, &abiItems); err != nil {
		return nil, err
	}
	abiBytes, _ := json.Marshal(abiItems)
	parsed, err := abi.JSON(strings.NewReader(string(abiBytes)))
	if err != nil {
		return nil, err
	}

	chainID := big.NewInt(0)
	if cf.ChainId != "" {
		chainID, _ = new(big.Int).SetString(cf.ChainId, 10)
	}
	if chainID.Sign() == 0 {
		chainID, err = cli.ChainID(context.Background())
		if err != nil {
			return nil, err
		}
	}

	return &Attestor{log: logger, db: database, client: cli, chainID: chainID, contractAddress: addr, contractABI: parsed, privateKey: pk, network: cfg.EthRPCURL}, nil
}

func (a *Attestor) AttestAssets(ctx context.Context, assetIDs []string, createdBy string) (string, error) {
	if len(assetIDs) == 0 {
		return "", errors.New("asset_ids required")
	}
	jobID := ""
	if err := a.db.Pool.QueryRow(ctx, `INSERT INTO attestation_jobs(created_by,status) VALUES($1,'QUEUED') RETURNING id`, nullIfEmpty(createdBy)).Scan(&jobID); err != nil {
		return "", err
	}
	go a.runJob(context.Background(), jobID, assetIDs)
	return jobID, nil
}

func (a *Attestor) runJob(ctx context.Context, jobID string, assetIDs []string) {
	started := time.Now()
	_, _ = a.db.Pool.Exec(ctx, `UPDATE attestation_jobs SET status='RUNNING', started_at=$2 WHERE id=$1`, jobID, started)

	anyFailed := false
	for _, assetID := range assetIDs {
		txHash, blockNum, err := a.attestOne(ctx, assetID)
		if err != nil {
			anyFailed = true
			_, _ = a.db.Pool.Exec(ctx, `INSERT INTO attestations(asset_id,network,chain_id,contract_address,tx_hash,status,error) VALUES($1,$2,$3,$4,$5,'FAILED',$6)
				ON CONFLICT (asset_id, tx_hash) DO NOTHING`, assetID, a.network, a.chainID.Int64(), a.contractAddress.Hex(), "0x0", err.Error())
			continue
		}
		_, _ = a.db.Pool.Exec(ctx, `INSERT INTO attestations(asset_id,network,chain_id,contract_address,tx_hash,block_number,status) VALUES($1,$2,$3,$4,$5,$6,'CONFIRMED')
			ON CONFLICT (asset_id, tx_hash) DO NOTHING`, assetID, a.network, a.chainID.Int64(), a.contractAddress.Hex(), txHash, blockNum)
		_, _ = a.db.Pool.Exec(ctx, `UPDATE assets SET status='ATTESTED', updated_at=now() WHERE id=$1`, assetID)
		_, _ = a.db.Pool.Exec(ctx, `INSERT INTO audit_log(actor_user_id, action, entity_type, entity_id, metadata) VALUES(NULL,'ATTEST_ASSET','asset',$1, jsonb_build_object('tx',$2,'job_id',$3))`, assetID, txHash, jobID)
	}

	finished := time.Now()
	if anyFailed {
		_, _ = a.db.Pool.Exec(ctx, `UPDATE attestation_jobs SET status='FAILED', error='one or more assets failed', finished_at=$2 WHERE id=$1`, jobID, finished)
	} else {
		_, _ = a.db.Pool.Exec(ctx, `UPDATE attestation_jobs SET status='SUCCEEDED', finished_at=$2 WHERE id=$1`, jobID, finished)
	}
}

func (a *Attestor) attestOne(ctx context.Context, assetID string) (txHash string, blockNumber int64, err error) {
	assetHash, anchorHash, policyHash, wrapperAlg, riskLevel, ts, err := a.buildAttestationInputs(ctx, assetID)
	if err != nil {
		return "", 0, err
	}

	nonce, err := a.client.PendingNonceAt(ctx, crypto.PubkeyToAddress(a.privateKey.PublicKey))
	if err != nil {
		return "", 0, err
	}
	gasPrice, err := a.client.SuggestGasPrice(ctx)
	if err != nil {
		return "", 0, err
	}

	auth, err := bind.NewKeyedTransactorWithChainID(a.privateKey, a.chainID)
	if err != nil {
		return "", 0, err
	}
	auth.Nonce = big.NewInt(int64(nonce))
	auth.Value = big.NewInt(0)
	auth.GasPrice = gasPrice
	auth.GasLimit = 500000

	contract := bind.NewBoundContract(a.contractAddress, a.contractABI, a.client, a.client, a.client)
	tx, err := contract.Transact(auth, "attest", assetHash, anchorHash, policyHash, wrapperAlg, riskLevel, new(big.Int).SetUint64(ts))
	if err != nil {
		return "", 0, err
	}

	rctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()
	rec, err := bind.WaitMined(rctx, a.client, tx)
	if err != nil {
		return tx.Hash().Hex(), 0, err
	}
	if rec.Status != types.ReceiptStatusSuccessful {
		return tx.Hash().Hex(), int64(rec.BlockNumber.Uint64()), errors.New("tx reverted")
	}

	return tx.Hash().Hex(), int64(rec.BlockNumber.Uint64()), nil
}

func (a *Attestor) buildAttestationInputs(ctx context.Context, assetID string) (assetFingerprint [32]byte, anchorIdHash [32]byte, policySnapshotHash [32]byte, wrapperAlg string, riskLevel uint8, timestamp uint64, err error) {
	// Gather asset + wrapper info.
	var locator, compliance, risk string
	var score int
	var metaRaw []byte
	if err := a.db.Pool.QueryRow(ctx, `SELECT locator,pqc_compliance,risk_level,quantum_risk_score,metadata FROM assets WHERE id=$1`, assetID).
		Scan(&locator, &compliance, &risk, &score, &metaRaw); err != nil {
		return [32]byte{}, [32]byte{}, [32]byte{}, "", 0, 0, err
	}
	meta := map[string]any{}
	_ = json.Unmarshal(metaRaw, &meta)
	anchorID, _ := meta["wrapped_anchor_id"].(string)
	if anchorID == "" {
		anchorID = "unwrapped"
	}
	wrapperAlg = "Kyber768+HKDF-SHA256+ChaCha20-Poly1305"

	// policy snapshot: stable list of policy ids matching asset.
	policyIDs := make([]string, 0)
	rows, _ := a.db.Pool.Query(ctx, `SELECT policy_id FROM policy_assets WHERE asset_id=$1`, assetID)
	if rows != nil {
		defer rows.Close()
		for rows.Next() {
			var pid string
			_ = rows.Scan(&pid)
			policyIDs = append(policyIDs, pid)
		}
	}
	sort.Strings(policyIDs)

	policySnapshotHash = sha256.Sum256([]byte(strings.Join(policyIDs, ",")))
	anchorIdHash = sha256.Sum256([]byte(anchorID))

	// fingerprint struct with stable ordering.
	fp := struct {
		AssetID      string   `json:"asset_id"`
		Locator      string   `json:"locator"`
		Compliance   string   `json:"pqc_compliance"`
		RiskLevel    string   `json:"risk_level"`
		RiskScore    int      `json:"risk_score"`
		WrapperAlg   string   `json:"wrapper_algorithm"`
		PolicyIDs    []string `json:"policy_ids"`
		AnchorID     string   `json:"anchor_id"`
	}{
		AssetID: assetID,
		Locator: locator,
		Compliance: compliance,
		RiskLevel: risk,
		RiskScore: score,
		WrapperAlg: wrapperAlg,
		PolicyIDs: policyIDs,
		AnchorID: anchorID,
	}
	b, _ := json.Marshal(fp)
	assetFingerprint = sha256.Sum256(b)

	switch risk {
	case "Low":
		riskLevel = 1
	case "Medium":
		riskLevel = 2
	case "High":
		riskLevel = 3
	case "Critical":
		riskLevel = 4
	default:
		riskLevel = 0
	}

	timestamp = uint64(time.Now().Unix())
	_ = hex.EncodeToString(assetFingerprint[:])
	return assetFingerprint, anchorIdHash, policySnapshotHash, wrapperAlg, riskLevel, timestamp, nil
}
