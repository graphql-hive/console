package statsvizextension

import (
	"errors"

	"go.opentelemetry.io/collector/component"
)

type Config struct {
	Endpoint string `mapstructure:"endpoint"`
}

var _ component.Config = (*Config)(nil)

func (cfg *Config) Validate() error {
	if cfg.Endpoint == "" {
		return errors.New("endpoint must be specified")
	}
	return nil
}
