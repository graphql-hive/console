package metadata

import (
	"go.opentelemetry.io/collector/component"
)

var (
	Type      = component.MustNewType("statsviz")
	ScopeName = "statsvizextension"
)

const (
	ExtensionStability = component.StabilityLevelDevelopment
)
