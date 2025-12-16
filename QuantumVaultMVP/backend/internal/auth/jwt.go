package auth

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type TokenManager struct {
	Issuer     string
	Secret     []byte
	AccessTTL  time.Duration
	RefreshTTL time.Duration
}

type Claims struct {
	UserID string `json:"uid"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

func (m TokenManager) MintAccessToken(userID, role string) (string, time.Time, error) {
	exp := time.Now().Add(m.AccessTTL)
	claims := Claims{
		UserID: userID,
		Role:   role,
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    m.Issuer,
			Subject:   userID,
			ExpiresAt: jwt.NewNumericDate(exp),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	t := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	s, err := t.SignedString(m.Secret)
	return s, exp, err
}

func (m TokenManager) ParseAccessToken(raw string) (*Claims, error) {
	tok, err := jwt.ParseWithClaims(raw, &Claims{}, func(token *jwt.Token) (any, error) {
		return m.Secret, nil
	}, jwt.WithIssuer(m.Issuer))
	if err != nil {
		return nil, err
	}
	c, ok := tok.Claims.(*Claims)
	if !ok || !tok.Valid {
		return nil, jwt.ErrTokenInvalidClaims
	}
	return c, nil
}

func (m TokenManager) NewRefreshToken() (plaintext string, hash string, expiresAt time.Time, err error) {
	raw := make([]byte, 32)
	if _, err := rand.Read(raw); err != nil {
		return "", "", time.Time{}, err
	}
	plaintext = base64.RawURLEncoding.EncodeToString(raw)
	sum := sha256.Sum256([]byte(plaintext))
	hash = base64.RawStdEncoding.EncodeToString(sum[:])
	expiresAt = time.Now().Add(m.RefreshTTL)
	return plaintext, hash, expiresAt, nil
}

func HashRefreshToken(plaintext string) string {
	sum := sha256.Sum256([]byte(plaintext))
	return base64.RawStdEncoding.EncodeToString(sum[:])
}
