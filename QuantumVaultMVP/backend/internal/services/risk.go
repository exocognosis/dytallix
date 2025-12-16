package services

import (
	"strings"
	"time"
)

type RiskInputs struct {
	PQCCompliance      string
	Algorithms         []string
	Exposure           string
	DataSensitivity    string
	BusinessCriticality string
	AssetType          string
	LastScannedAt      *time.Time
}

type RiskResult struct {
	Score     int
	RiskLevel string
}

type RiskEngine struct{}

func NewRiskEngine() *RiskEngine { return &RiskEngine{} }

func (r *RiskEngine) Compute(in RiskInputs) RiskResult {
	score := 0

	switch in.PQCCompliance {
	case "NON_PQC":
		score += 40
	case "UNKNOWN":
		score += 20
	case "HYBRID":
		score += 10
	case "PQC":
		score += 0
	}

	for _, a := range in.Algorithms {
		alg := strings.ToUpper(a)
		switch {
		case strings.Contains(alg, "RSA"):
			score += 15
		case strings.Contains(alg, "ECDSA"):
			score += 12
		case strings.Contains(alg, "ECDH"):
			score += 10
		case strings.Contains(alg, "SECP") || strings.Contains(alg, "P-256") || strings.Contains(alg, "P-384"):
			score += 8
		case strings.Contains(alg, "KYBER") || strings.Contains(alg, "DILITHIUM") || strings.Contains(alg, "FALCON"):
			score -= 10
		}
	}

	switch in.Exposure {
	case "EXTERNAL":
		score += 15
	case "INTERNAL":
		score += 5
	}

	switch in.DataSensitivity {
	case "HIGH":
		score += 15
	case "MEDIUM":
		score += 8
	case "LOW":
		score += 3
	}

	switch in.BusinessCriticality {
	case "HIGH":
		score += 15
	case "MEDIUM":
		score += 8
	case "LOW":
		score += 3
	}

	switch in.AssetType {
	case "POSTGRES_DB":
		score += 5
	case "TLS_ENDPOINT", "HTTP_SERVICE":
		score += 8
	case "SECRET_MATERIAL":
		score += 12
	}

	if in.LastScannedAt == nil {
		score += 10
	} else {
		age := time.Since(*in.LastScannedAt)
		if age > 30*24*time.Hour {
			score += 10
		} else if age > 7*24*time.Hour {
			score += 5
		}
	}

	if score < 0 {
		score = 0
	}
	if score > 100 {
		score = 100
	}

	level := "Low"
	switch {
	case score >= 85:
		level = "Critical"
	case score >= 70:
		level = "High"
	case score >= 40:
		level = "Medium"
	}

	return RiskResult{Score: score, RiskLevel: level}
}
