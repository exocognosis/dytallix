.PHONY: dev build start migrate seed test lint typecheck backup clean

dev:
	npm run dev

build:
	npm run build

start:
	npm run start

migrate:
	npm run migrate

seed:
	npm run seed

test:
	npm run test

lint:
	npm run lint

typecheck:
	npm run typecheck

backup:
	npm run backup

clean:
	rm -rf dist node_modules data/*.db backups

install:
	npm install

setup: install migrate seed
	@echo "Setup complete!"
