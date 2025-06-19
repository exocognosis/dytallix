# Dytallix Community & Documentation Interfaces

## Proposal System (Markdown/JSON)
```json
{
  "proposal_id": "string",
  "title": "string",
  "description": "string",
  "proposer": "address",
  "status": "open | closed | executed",
  "votes": [
    {"voter": "address", "vote": "yes | no | abstain"}
  ]
}
```

## Documentation Generation (Markdown)
- All Rust/Python/TypeScript code should be documented with docstrings/comments
- Use tools like rustdoc, pdoc, or TypeDoc for auto-generating docs
