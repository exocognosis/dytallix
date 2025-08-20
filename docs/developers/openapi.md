---
title: OpenAPI Reference
---

# OpenAPI Reference

The full OpenAPI specification is maintained at `openapi/openapi.yaml`.

## Spec File

[Download YAML](/openapi/openapi.yaml)

## Redoc (Embed)

To serve an interactive Redoc locally run:

```bash
npx redocly preview-docs openapi/openapi.yaml
```

Then open the reported local URL.

## Structure

- Paths: REST endpoints grouped by resource
- Components: Schemas for request/response bodies
- Security: (Planned) API key / token mechanisms

## Linting

CI runs:
```bash
npm run openapi:lint
```

Return: [API Reference](api-reference.md)
