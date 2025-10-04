// Copyright The OpenTelemetry Authors
// SPDX-License-Identifier: Apache-2.0

package hiveauthextension // import "github.com/graphql-hive/opentelemetry-collector-contrib/extension/hiveauthextension"

import (
	"errors"
	"time"
)

type Config struct {
	// Endpoint is the address of the authentication server
	Endpoint string `mapstructure:"endpoint"`
	// Timeout is the timeout for the HTTP request to the auth service
	Timeout time.Duration `mapstructure:"timeout"`
}

func (cfg *Config) Validate() error {
	if cfg.Endpoint == "" {
		return errors.New("missing endpoint")
	}

	if cfg.Timeout <= 0 {
		return errors.New("timeout must be a positive value")
	}

	return nil
}
