package db

import (
	"context"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

func Migrate(ctx context.Context, pool interface {
	Exec(ctx context.Context, sql string, arguments ...any) (pgconn.CommandTag, error)
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
}, migrationsDir string) error {
	if err := ensureMigrationsTable(ctx, pool); err != nil {
		return err
	}

	entries := make([]string, 0)
	err := filepath.WalkDir(migrationsDir, func(path string, d fs.DirEntry, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}
		if d.IsDir() {
			return nil
		}
		base := filepath.Base(path)
		if !strings.HasSuffix(base, ".sql") {
			return nil
		}
		entries = append(entries, path)
		return nil
	})
	if err != nil {
		return err
	}
	sort.Strings(entries)

	for _, path := range entries {
		name := filepath.Base(path)
		var exists bool
		if err := pool.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE name=$1)", name).Scan(&exists); err != nil {
			return err
		}
		if exists {
			continue
		}
		b, err := os.ReadFile(path)
		if err != nil {
			return err
		}
		sql := strings.TrimSpace(string(b))
		if sql == "" {
			continue
		}
		if _, err := pool.Exec(ctx, sql); err != nil {
			return fmt.Errorf("apply migration %s: %w", name, err)
		}
		if _, err := pool.Exec(ctx, "INSERT INTO schema_migrations(name) VALUES($1)", name); err != nil {
			return fmt.Errorf("record migration %s: %w", name, err)
		}
	}
	return nil
}

func ensureMigrationsTable(ctx context.Context, pool interface {
	Exec(ctx context.Context, sql string, arguments ...any) (pgconn.CommandTag, error)
}) error {
	_, err := pool.Exec(ctx, `CREATE TABLE IF NOT EXISTS schema_migrations (
		name text PRIMARY KEY,
		applied_at timestamptz NOT NULL DEFAULT now()
	)`)
	return err
}
