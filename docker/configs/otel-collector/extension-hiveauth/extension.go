// Copyright The OpenTelemetry Authors
// SPDX-License-Identifier: Apache-2.0

package hiveauthextension

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/patrickmn/go-cache"
	"go.opentelemetry.io/collector/client"
	"go.opentelemetry.io/collector/component"
	"go.opentelemetry.io/collector/extension"
	"go.opentelemetry.io/collector/extension/extensionauth"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/metric"
	"go.uber.org/zap"
	"golang.org/x/sync/singleflight"
)

var (
	_                       extension.Extension  = (*hiveAuthExtension)(nil)
	_                       extensionauth.Server = (*hiveAuthExtension)(nil)
	errUnauthorized                              = errors.New("unauthorized")
	errMissingAuthorization                      = errors.New("missing Authorization header")
	errMissingHiveTargetRef                      = errors.New("missing X-Hive-Target-Ref header")
)

var _ client.AuthData = (*authData)(nil)

type authData struct {
	targetId string
}

func (a *authData) GetAttribute(name string) any {
	switch name {
	case "targetId":
		return a.targetId
	default:
		return nil
	}
}

func (*authData) GetAttributeNames() []string {
	return []string{"targetId"}
}

type hiveAuthExtension struct {
	logger *zap.Logger
	config *Config
	client *http.Client
	group  singleflight.Group
	cache  *cache.Cache

	telemetrySettings component.TelemetrySettings
	requestDuration   metric.Int64Histogram
	requestCount      metric.Int64Counter
}

func (h *hiveAuthExtension) Start(_ context.Context, _ component.Host) error {
	h.logger.Info("Starting hive auth extension", zap.String("endpoint", h.config.Endpoint), zap.Duration("timeout", h.config.Timeout))
	meter := h.telemetrySettings.MeterProvider.Meter("hiveauth")

	h.requestDuration, _ = meter.Int64Histogram(
		"hive_auth_request_duration_milliseconds",
		metric.WithDescription("Duration of outbound authentication requests"),
	)

	h.requestCount, _ = meter.Int64Counter(
		"hive_auth_requests_total",
		metric.WithDescription("Total number of authentication requests"),
	)

	return nil
}

func (h *hiveAuthExtension) Shutdown(_ context.Context) error {
	h.logger.Info("Shutting down hive auth extension")
	return nil
}

type AuthStatusError struct {
	Code int
	Msg  string
}

func (*AuthStatusError) Error() string {
	return errUnauthorized.Error()
}

func getHeader(h map[string][]string, headerKey string, metadataKey string) string {
	headerValues, ok := h[headerKey]

	if !ok {
		headerValues, ok = h[metadataKey]
	}

	if !ok {
		for k, v := range h {
			if strings.EqualFold(k, metadataKey) {
				headerValues = v
				break
			}
		}
	}

	if len(headerValues) == 0 {
		return ""
	}

	return headerValues[0]
}

func getAuthHeader(h map[string][]string) string {
	const (
		canonicalHeaderKey = "Authorization"
		metadataKey        = "authorization"
	)

	return getHeader(h, canonicalHeaderKey, metadataKey)
}

func getTargetRefHeader(h map[string][]string) string {
	const (
		canonicalHeaderKey = "X-Hive-Target-Ref"
		metadataKey        = "x-hive-target-ref"
	)

	return getHeader(h, canonicalHeaderKey, metadataKey)
}

type authResult struct {
	err      error
	targetId string
}

func (h *hiveAuthExtension) doAuthRequest(ctx context.Context, auth string, targetRef string) (string, error) {
	h.logger.Debug("authenticate token for target",
		zap.String("targetRef", targetRef))

	start := time.Now()
	statusLabel := "error"

	defer func() {
		h.requestDuration.Record(ctx, time.Since(start).Milliseconds(),
			metric.WithAttributes(attribute.String("status", statusLabel)))
		h.requestCount.Add(ctx, 1, metric.WithAttributes(attribute.String("status", statusLabel)))
	}()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, h.config.Endpoint, nil)
	if err != nil {
		h.logger.Error("failed to create auth request", zap.Error(err))
		return "", err
	}
	req.Header.Set("Authorization", auth)
	req.Header.Set("X-Hive-Target-Ref", targetRef)

	// Retry parameters.
	const maxRetries = 3
	const retryDelay = 100 * time.Millisecond
	var lastStatus int

	for attempt := 0; attempt < maxRetries; attempt++ {
		resp, err := h.client.Do(req)
		if err != nil {
			h.logger.Error("error calling authentication service", zap.Error(err))
			return "", err
		}
		lastStatus = resp.StatusCode

		// Success.
		if resp.StatusCode == http.StatusOK {
			var result struct {
				TargetId string `json:"targetId"`
			}
			body, err := io.ReadAll(resp.Body)
			resp.Body.Close()
			if err != nil {
				return "", err
			}
			if err := json.Unmarshal(body, &result); err != nil {
				return "", err
			}
			h.logger.Debug("authentication succeeded", zap.String("targetId", result.TargetId))
			statusLabel = "success"
			return result.TargetId, nil
		}

		// For 5XX responses, retry.
		if resp.StatusCode >= 500 && resp.StatusCode < 600 {
			h.logger.Warn("received 5xx response, retrying",
				zap.Int("attempt", attempt+1),
				zap.String("status", resp.Status))
			resp.Body.Close()

			select {
			case <-time.After(retryDelay * time.Duration(attempt+1)):
				// Continue to next attempt.
			case <-ctx.Done():
				return "", ctx.Err()
			}
			continue
		}

		// For non-retryable errors.
		body, readErr := io.ReadAll(io.LimitReader(resp.Body, 64*1024))
		resp.Body.Close()
		if readErr != nil {
			return "", fmt.Errorf("failed to read authentication error response: %w", readErr)
		}

		errMsg := strings.TrimSpace(string(body))
		var result struct {
			Message string `json:"message"`
		}
		if json.Unmarshal(body, &result) == nil && result.Message != "" {
			errMsg = result.Message
		}
		if errMsg == "" {
			errMsg = resp.Status
		}

		h.logger.Warn("authentication failed",
			zap.Int("status", resp.StatusCode),
			zap.String("message", errMsg))
		return "", &AuthStatusError{
			Code: resp.StatusCode,
			Msg:  errMsg,
		}
	}

	return "", &AuthStatusError{
		Code: lastStatus,
		Msg:  "authentication failed after retries",
	}
}

func (h *hiveAuthExtension) Authenticate(ctx context.Context, headers map[string][]string) (context.Context, error) {
	auth := getAuthHeader(headers)
	targetRef := getTargetRefHeader(headers)
	if auth == "" {
		return ctx, errMissingAuthorization
	}

	if targetRef == "" {
		return ctx, errMissingHiveTargetRef
	}

	cacheKey := fmt.Sprintf("%s|%s", auth, targetRef)

	if cached, found := h.cache.Get(cacheKey); found {
		res := cached.(authResult)

		if res.err == nil {
			cl := client.FromContext(ctx)
			cl.Auth = &authData{targetId: res.targetId}
			return client.NewContext(ctx, cl), nil
		}

		return ctx, errUnauthorized
	}

	// Deduplicate concurrent calls.
	targetId, err, _ := h.group.Do(cacheKey, func() (any, error) {
		return h.doAuthRequest(ctx, auth, targetRef)
	})

	var ttl time.Duration
	if err == nil {
		ttl = 30 * time.Second
	} else {
		ttl = 10 * time.Second
	}
	h.cache.Set(cacheKey, authResult{err: err, targetId: targetId.(string)}, ttl)

	if err == nil {
		cl := client.FromContext(ctx)
		cl.Auth = &authData{targetId: targetId.(string)}
		return client.NewContext(ctx, cl), nil
	}

	return ctx, errUnauthorized
}

func newHiveAuthExtension(
	logger *zap.Logger,
	cfg component.Config,
	telemetrySettings component.TelemetrySettings,
) (extension.Extension, error) {
	c, ok := cfg.(*Config)
	if !ok {
		return nil, errors.New("invalid configuration")
	}

	if err := c.Validate(); err != nil {
		return nil, err
	}

	return &hiveAuthExtension{
		logger: logger,
		config: c,
		client: &http.Client{
			Timeout: c.Timeout,
		},
		cache:             cache.New(500*time.Second, time.Minute),
		telemetrySettings: telemetrySettings,
	}, nil
}
