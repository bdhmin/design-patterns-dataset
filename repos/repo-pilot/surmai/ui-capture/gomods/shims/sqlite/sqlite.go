// Package sqlite is a capture-only stand-in for modernc.org/sqlite.
//
// modernc.org/libc, mathutil and memory have no GitHub mirror, so they can't be
// fetched inside the capture sandbox. This registers a "sqlite" database/sql
// driver backed by github.com/mattn/go-sqlite3 (cgo) instead, translating the
// modernc-style `_pragma=name(value)` DSN parameters PocketBase uses into
// PRAGMA statements run on every new connection.
package sqlite

import "database/sql"

func init() {
	sql.Register("sqlite", &shim{})
}
