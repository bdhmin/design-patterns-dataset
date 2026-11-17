// Copyright 2025 The Go Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

//go:build linux || (darwin && !ios) || dragonfly || freebsd || solaris

package net

// Capture-sandbox overlay: the macOS sandbox the app runs under rejects the
// sendfile(2) syscall, which makes net/http abort file responses right after the
// first 512 sniffed bytes (ERR_CONTENT_LENGTH_MISMATCH in the browser). Reporting
// sendfile as unsupported makes Go fall back to a plain read/write copy.
func supportsSendfile() bool {
	return false
}
