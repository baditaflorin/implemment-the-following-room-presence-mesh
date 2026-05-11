.DEFAULT_GOAL := help
SHELL := /bin/bash

.PHONY: help install install-hooks dev build pages-preview test test-watch smoke lint fmt fmt-check typecheck clean release hooks-pre-commit hooks-commit-msg hooks-pre-push

help: ## list targets
	@awk 'BEGIN {FS = ":.*##"; printf "Usage:\n"} /^[a-zA-Z_-]+:.*?##/ { printf "  %-18s %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

install: ## install npm deps
	npm install

install-hooks: ## wire .githooks via core.hooksPath
	git config core.hooksPath .githooks
	chmod +x .githooks/* || true
	@echo "hooks installed (core.hooksPath=.githooks)"

dev: ## run vite dev server
	npm run dev

build: ## build into docs/ (targeted clean — preserves docs/adr/ and docs/*.md)
	rm -rf docs/assets
	rm -f docs/index.html docs/404.html docs/favicon.svg docs/manifest.webmanifest docs/sw.js
	npm run build
	@test -f docs/index.html || (echo "build did not produce docs/index.html"; exit 1)

pages-preview: build ## serve docs/ as Pages would
	npm run pages-preview

test: ## run unit tests
	npm run test

test-watch:
	npm run test:watch

smoke: build ## build + serve docs/ + headless check
	bash scripts/smoke.sh

lint: ## eslint
	npm run lint

fmt: ## autoformat
	npm run fmt

fmt-check:
	npm run fmt:check

typecheck:
	npm run typecheck

clean:
	rm -rf docs dist node_modules/.vite coverage

release:
	@echo "tag a semver, push, Pages publishes from docs/ on main"
	@echo "git tag vX.Y.Z && git push --tags"

hooks-pre-commit:
	bash .githooks/pre-commit

hooks-commit-msg:
	@echo "run as: bash .githooks/commit-msg <path-to-msg-file>"

hooks-pre-push:
	bash .githooks/pre-push
