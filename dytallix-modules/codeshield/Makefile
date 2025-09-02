SHELL := /bin/bash
VERSION ?= v0.1.0
IMAGE_REPO ?= ghcr.io/<org>/dytallix-codeshield
IMAGE := $(IMAGE_REPO):$(VERSION)
CHART_DIR := deploy/helm/codeshield
RELEASE_DIR := release

.PHONY: all build run helm-package helm-dry-run sbom checksums sign release clean

all: build helm-package sbom checksums

build:
	bash scripts/build.sh $(VERSION)

run:
	PORT=8080 bash scripts/run_local.sh

helm-package:
	bash scripts/helm_install.sh --package

helm-dry-run:
	bash scripts/helm_install.sh --dry-run

sbom:
	bash scripts/build.sh $(VERSION) --sbom-only

checksums:
	bash scripts/build.sh $(VERSION) --checksums-only

sign:
	bash scripts/sign_artifacts.sh $(VERSION)

release: all sign

clean:
	rm -f $(RELEASE_DIR)/*.tgz $(RELEASE_DIR)/SHA256SUMS $(RELEASE_DIR)/SBOM.cyclonedx.json

