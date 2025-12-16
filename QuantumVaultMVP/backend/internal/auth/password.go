package auth

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/base64"
	"fmt"
	"strconv"
	"strings"

	"golang.org/x/crypto/argon2"
)

type PasswordHasher struct {
	Time    uint32
	Memory  uint32
	Threads uint8
	KeyLen  uint32
}

func DefaultPasswordHasher() PasswordHasher {
	return PasswordHasher{Time: 1, Memory: 64 * 1024, Threads: 4, KeyLen: 32}
}

func (h PasswordHasher) Hash(password string) (string, error) {
	salt := make([]byte, 16)
	if _, err := rand.Read(salt); err != nil {
		return "", err
	}
	key := argon2.IDKey([]byte(password), salt, h.Time, h.Memory, h.Threads, h.KeyLen)
	return fmt.Sprintf("argon2id$v=19$t=%d$m=%d$p=%d$%s$%s",
		h.Time,
		h.Memory,
		h.Threads,
		base64.RawStdEncoding.EncodeToString(salt),
		base64.RawStdEncoding.EncodeToString(key),
	), nil
}

func (h PasswordHasher) Verify(password, encoded string) (bool, error) {
	parts := strings.Split(encoded, "$")
	if len(parts) != 7 {
		return false, fmt.Errorf("invalid password hash format")
	}
	if parts[0] != "argon2id" {
		return false, fmt.Errorf("unsupported password hash scheme")
	}
	if !strings.HasPrefix(parts[1], "v=") || !strings.HasPrefix(parts[2], "t=") || !strings.HasPrefix(parts[3], "m=") || !strings.HasPrefix(parts[4], "p=") {
		return false, fmt.Errorf("invalid password hash parameters")
	}
	_, err := strconv.Atoi(strings.TrimPrefix(parts[1], "v="))
	if err != nil {
		return false, fmt.Errorf("invalid argon2 version")
	}
	t64, err := strconv.ParseUint(strings.TrimPrefix(parts[2], "t="), 10, 32)
	if err != nil {
		return false, fmt.Errorf("invalid argon2 t")
	}
	m64, err := strconv.ParseUint(strings.TrimPrefix(parts[3], "m="), 10, 32)
	if err != nil {
		return false, fmt.Errorf("invalid argon2 m")
	}
	p64, err := strconv.ParseUint(strings.TrimPrefix(parts[4], "p="), 10, 8)
	if err != nil {
		return false, fmt.Errorf("invalid argon2 p")
	}
	saltB64 := parts[5]
	keyB64 := parts[6]

	t := uint32(t64)
	m := uint32(m64)
	p := uint8(p64)

	salt, err := base64.RawStdEncoding.DecodeString(saltB64)
	if err != nil {
		return false, err
	}
	expected, err := base64.RawStdEncoding.DecodeString(keyB64)
	if err != nil {
		return false, err
	}
	key := argon2.IDKey([]byte(password), salt, t, m, p, uint32(len(expected)))
	ok := subtle.ConstantTimeCompare(key, expected) == 1
	return ok, nil
}
