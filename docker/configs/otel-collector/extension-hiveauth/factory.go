// Copyright The OpenTelemetry Authors
// SPDX-License-Identifier: Apache-2.0

package hiveauthextension // import "github.com/graphql-hive/opentelemetry-collector-contrib/extension/hiveauthextension"

import (
	"context"
	"time"

	"go.opentelemetry.io/collector/component"
	"go.opentelemetry.io/collector/extension"

	"github.com/graphql-hive/opentelemetry-collector-contrib/extension/hiveauthextension/internal/metadata"
)

// NewFactory creates a factory for the static bearer token Authenticator extension.
func NewFactory() extension.Factory {
	return extension.NewFactory(
		metadata.Type,
		createDefaultConfig,
		createExtension,
		metadata.ExtensionStability,
	)
}

func createDefaultConfig() component.Config {
	return &Config{
		Endpoint: "http://localhost:3000/",
		Timeout:  5 * time.Second,
	}
}

func createExtension(_ context.Context, params extension.Settings, cfg component.Config) (extension.Extension, error) {
	return newHiveAuthExtension(params.Logger, cfg.(*Config))
}
