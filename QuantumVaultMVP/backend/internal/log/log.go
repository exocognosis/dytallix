package log

import (
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

func New(env string) (*zap.Logger, error) {
	cfg := zap.NewProductionConfig()
	cfg.EncoderConfig.TimeKey = "ts"
	cfg.EncoderConfig.EncodeTime = zapcore.ISO8601TimeEncoder
	if env == "dev" {
		cfg = zap.NewDevelopmentConfig()
		cfg.EncoderConfig.TimeKey = "ts"
		cfg.EncoderConfig.EncodeTime = zapcore.ISO8601TimeEncoder
	}
	return cfg.Build()
}
