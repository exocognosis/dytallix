//go:build dytallix_dev_unguarded

package ownerguard

import (
	"errors"
	"fmt"
	"os"
	"sync/atomic"
)

var devStarted atomic.Bool

// Run skips owner admission. It exists only in development builds made with
// -tags dytallix_dev_unguarded, for local multi-validator testing, and still
// requires DYTALLIX_DEV_UNGUARDED=1. Release builds never include this file.
func Run(role Role, work func() error) error {
	if work == nil || !devStarted.CompareAndSwap(false, true) {
		return errAdmission
	}
	if os.Getenv("DYTALLIX_DEV_UNGUARDED") != "1" {
		return errors.New("unguarded development build requires DYTALLIX_DEV_UNGUARDED=1")
	}
	fmt.Fprintf(os.Stderr, "WARNING: owner startup guard disabled for role %d (development build)\n", role)
	return work()
}
