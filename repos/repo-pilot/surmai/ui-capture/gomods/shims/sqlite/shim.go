package sqlite

import (
	"database/sql/driver"
	"net/url"
	"strings"

	sqlite3 "github.com/mattn/go-sqlite3"
)

type shim struct{}

func (s *shim) Open(dsn string) (driver.Conn, error) {
	path, query, _ := strings.Cut(dsn, "?")
	var pragmas []string
	rest := url.Values{}
	if query != "" {
		vals, err := url.ParseQuery(query)
		if err != nil {
			return nil, err
		}
		for k, vs := range vals {
			for _, v := range vs {
				if k == "_pragma" {
					// name(value) -> name = value
					name, val, ok := strings.Cut(v, "(")
					if ok {
						pragmas = append(pragmas, "PRAGMA "+name+" = "+strings.TrimSuffix(val, ")"))
					} else {
						pragmas = append(pragmas, "PRAGMA "+v)
					}
				} else {
					rest.Add(k, v)
				}
			}
		}
	}
	d := &sqlite3.SQLiteDriver{ConnectHook: func(c *sqlite3.SQLiteConn) error {
		for _, p := range pragmas {
			if _, err := c.Exec(p, nil); err != nil {
				return err
			}
		}
		return nil
	}}
	full := path
	if enc := rest.Encode(); enc != "" {
		full += "?" + enc
	}
	return d.Open(full)
}
