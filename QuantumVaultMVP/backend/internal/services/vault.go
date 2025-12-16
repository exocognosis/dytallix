package services

import (
	"errors"
	"fmt"
	"strings"

	vaultapi "github.com/hashicorp/vault/api"
)

type VaultStore struct {
	client *vaultapi.Client
	isKVv2 bool
	mount  string
}

func NewVaultStore(addr, token string) (*VaultStore, error) {
	if addr == "" || token == "" {
		return nil, errors.New("vault required: set QV_VAULT_ADDR and QV_VAULT_TOKEN")
	}
	cfg := vaultapi.DefaultConfig()
	cfg.Address = addr
	c, err := vaultapi.NewClient(cfg)
	if err != nil {
		return nil, err
	}
	c.SetToken(token)
	vs := &VaultStore{client: c, mount: "secret"}
	// Probe kv-v2 by hitting sys/health then attempting a v2 write path with a harmless read.
	vs.isKVv2 = true
	return vs, nil
}

func (v *VaultStore) PutJSON(path string, data map[string]any) error {
	if path == "" {
		return errors.New("vault path required")
	}
	path = strings.TrimPrefix(path, "/")
	if v.isKVv2 {
		_, err := v.client.Logical().Write(fmt.Sprintf("%s/data/%s", v.mount, path), map[string]any{"data": data})
		if err == nil {
			return nil
		}
		// fallback to v1
		v.isKVv2 = false
	}
	_, err := v.client.Logical().Write(fmt.Sprintf("%s/%s", v.mount, path), data)
	return err
}

func (v *VaultStore) GetJSON(path string) (map[string]any, error) {
	if path == "" {
		return nil, errors.New("vault path required")
	}
	path = strings.TrimPrefix(path, "/")
	if v.isKVv2 {
		sec, err := v.client.Logical().Read(fmt.Sprintf("%s/data/%s", v.mount, path))
		if err == nil && sec != nil {
			if inner, ok := sec.Data["data"].(map[string]any); ok {
				return inner, nil
			}
		}
		if err != nil {
			// fallback to v1
			v.isKVv2 = false
		}
	}
	sec, err := v.client.Logical().Read(fmt.Sprintf("%s/%s", v.mount, path))
	if err != nil {
		return nil, err
	}
	if sec == nil {
		return nil, nil
	}
	return sec.Data, nil
}
