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
	"go.opentelemetry.io/collector/extension/extensionauth"
	"go.uber.org/zap"
	"golang.org/x/sync/singleflight"
)

var _ extensionauth.Server = (*hiveAuthExtension)(nil)

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
}

func (h *hiveAuthExtension) Start(_ context.Context, _ component.Host) error {
	h.logger.Info("Starting hive auth extension", zap.String("endpoint", h.config.Endpoint), zap.Duration("timeout", h.config.Timeout))
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

func (e *AuthStatusError) Error() string {
	return fmt.Sprintf("authentication failed: status %d, %s", e.Code, e.Msg)
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
			return result.TargetId, nil
		}

		// For 5XX responses, retry.
		if resp.StatusCode >= 500 && resp.StatusCode < 600 {
			h.logger.Warn("received 5xx response, retrying",
				zap.Int("attempt", attempt+1),
				zap.String("status", resp.Status))
			resp.Body.Close()

			select {
			case <-time.After(retryDelay * time.Duration(attempt + 1)):
				// Continue to next attempt.
			case <-ctx.Done():
				return "", ctx.Err()
			}
			continue
		}

		// For non-retryable errors.
		errMsg := fmt.Sprintf("authentication failed: received status %s", resp.Status)
		h.logger.Warn(errMsg)
		resp.Body.Close()
		return "", &AuthStatusError{
			Code: resp.StatusCode,
			Msg:  "non-retryable error",
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
		return ctx, errors.New("No auth provided")
	}

	if targetRef == "" {
		return ctx, errors.New("No target ref provided")
	}

	cacheKey := fmt.Sprintf("%s|%s", auth, targetRef)

	if cached, found := h.cache.Get(cacheKey); found {
		res := cached.(authResult)

		if res.err == nil {
			cl := client.FromContext(ctx)
			cl.Auth = &authData{targetId: res.targetId}
			return client.NewContext(ctx, cl), nil
		}

		return ctx, res.err
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

	return ctx, err
}

func newHiveAuthExtension(
	logger *zap.Logger,
	cfg component.Config,
) (extensionauth.Server, error) {
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
		cache: cache.New(30*time.Second, time.Minute),
	}, nil
}
