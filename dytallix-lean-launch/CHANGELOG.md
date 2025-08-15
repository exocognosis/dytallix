# Changelog (mv-testnet scope)

All notable changes for the mv-testnet workstream.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Scaffold: Standardized directory layout, README overhaul, mv-testnet branching model established
- Directory structure: node/, faucet/, explorer/, web/, ops/, scripts/, docs/, reports/, artifacts/
- Environment configuration template (.env.example)
- Legacy documentation migration to docs/ directory
- Docker ignore configuration for container builds
- Security-focused .gitignore patterns

### Changed
- README.md: Complete overhaul with monorepo layout and branching overview
- Project structure: Standardized to support lean launch environment
- Branching model: Established mv-testnet as long-lived development branch

### Security
- Enhanced .gitignore patterns to prevent secret commits
- .env.example template without sensitive data
- Documentation on security best practices

---

*Date format: YYYY-MM-DD*