package statsvizextension

import (
	"context"

	"go.opentelemetry.io/collector/component"
	"go.opentelemetry.io/collector/extension"

	"github.com/graphql-hive/console/docker/configs/otel-collector/extension-statsviz/internal/metadata"
)

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
		Endpoint: "0.0.0.0:8081",
	}
}

func createExtension(_ context.Context, params extension.Settings, cfg component.Config) (extension.Extension, error) {
	return newStatsvizExtension(params.Logger, cfg.(*Config))
}
