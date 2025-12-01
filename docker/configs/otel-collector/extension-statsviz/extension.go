package statsvizextension

import (
	"context"
	"errors"
	"net/http"

	"github.com/arl/statsviz"
	"go.opentelemetry.io/collector/component"
	"go.uber.org/zap"
)

type statsvizExtension struct {
	config *Config
	logger *zap.Logger
	server *http.Server
}

func (s *statsvizExtension) Start(_ context.Context, host component.Host) error {
	s.logger.Info("Starting statsviz extension", zap.String("endpoint", s.config.Endpoint))

	mux := http.NewServeMux()

	if err := statsviz.Register(mux); err != nil {
		s.logger.Error("Failed to register statsviz", zap.Error(err))
		return err
	}

	s.server = &http.Server{
		Addr:    s.config.Endpoint,
		Handler: mux,
	}

	go func() {
		if err := s.server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			s.logger.Error("Statsviz server error", zap.Error(err))
		}
	}()

	s.logger.Info("Statsviz available at", zap.String("url", "http://"+s.config.Endpoint+"/debug/statsviz"))
	return nil
}

func (s *statsvizExtension) Shutdown(ctx context.Context) error {
	s.logger.Info("Shutting down statsviz extension")
	if s.server != nil {
		return s.server.Shutdown(ctx)
	}
	return nil
}

func newStatsvizExtension(logger *zap.Logger, cfg *Config) (*statsvizExtension, error) {
	if cfg == nil {
		return nil, errors.New("config cannot be nil")
	}

	if err := cfg.Validate(); err != nil {
		return nil, err
	}

	return &statsvizExtension{
		config: cfg,
		logger: logger,
	}, nil
}
