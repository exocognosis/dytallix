# Contributing to Dytallix

Thank you for interest in contributing to Dytallix! This document provides guidelines and instructions for contributing to the project.

## Code of Conduct

We are committed to providing a welcoming and inclusive environment. All contributors must adhere to our Code of Conduct:

- Be respectful and professional
- Provide constructive feedback
- Focus on the code, not the person
- Report harassment or violations to the maintainers

## Getting Started

### 1. Fork and Clone

```bash
git clone https://github.com/YOUR_USERNAME/Dytallix.git
cd Dytallix
git remote add upstream https://github.com/DytallixHQ/Dytallix.git
```

### 2. Set Up Development Environment

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"

# Add WASM target
rustup target add wasm32-unknown-unknown

# Install development dependencies
cargo install cargo-clippy cargo-fmt
```

### 3. Build and Test

```bash
cargo build
cargo test --all
cargo clippy -- -D warnings
```

## Contributing Areas

### SDK Development (TypeScript / Rust)

- Bug fixes in client libraries
- New API methods
- Performance improvements
- Documentation and examples
- Test coverage improvements

**Location**: `sdk/typescript/` and `sdk/rust/`

### Smart Contracts

- Example contracts
- Contract libraries
- Testing utilities
- Documentation

**Location**: `contracts/`

### Blockchain Core

- Consensus algorithm improvements
- State management optimizations
- Networking enhancements
- Cryptography implementations
- Performance optimizations

**Location**: `blockchain-core/` and `dytallix-fast-launch/`

### Documentation

- README improvements
- API documentation
- Architecture guides
- Tutorial and guides
- Examples

**Location**: Root-level markdown files and `docs/` folder

### Testing

- E2E test improvements
- Integration tests
- Unit test coverage
- Performance benchmarks

**Location**: Test files throughout codebase

## Development Workflow

### Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/issue-number
```

Branch naming:
- Features: `feature/description`
- Bug fixes: `fix/description` or `fix/issue-123`
- Docs: `docs/description`

### Make Your Changes

- Write clean, idiomatic code
- Follow existing code style
- Add tests for new functionality
- Update documentation

### Code Style

**Rust:**
```bash
cargo fmt --all
cargo clippy -- -D warnings
```

**TypeScript:**
```bash
npm run lint
npm run format
```

**General:**
- Use meaningful variable/function names
- Keep functions focused and small
- Add comments for complex logic
- Write clear commit messages

### Run Tests

```bash
# Full test suite
cargo test --all

# Specific package
cargo test -p dytallix-sdk-rust

# With output
cargo test -- --nocapture
```

### Commit Guidelines

```
<type>(<scope>): <subject>

<body>

<footer>
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code style (formatting, missing semicolons, etc)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Build, dependencies, tooling

Examples:
```
feat(sdk): Add contract state query methods
fix(wallet): Handle UTF-8 encoding in signatures
docs(README): Add network configuration guide
```

### Push and Create Pull Request

```bash
git push origin feature/your-feature-name
```

Then open a PR on GitHub:
- Use descriptive title
- Reference related issues: `Fixes #123`
- Describe changes and motivation
- Link to any relevant discussions

## Pull Request Process

### Before Submission

- [ ] Code follows project style
- [ ] All tests pass: `cargo test --all`
- [ ] No clippy warnings: `cargo clippy -- -D warnings`
- [ ] Code is formatted: `cargo fmt --all`
- [ ] Commit messages are clear
- [ ] Documentation is updated
- [ ] CHANGELOG.md is updated (if applicable)

### Review Process

1. **Automated checks**: CI pipeline must pass
   - Tests
   - Linting
   - Code coverage (where applicable)
   
2. **Code review**: At least one maintainer review
   - Correctness
   - Performance
   - Security
   - API design (for public APIs)
   - Documentation quality

3. **Approval and merge**: Maintainer approval required

### Feedback and Iteration

- Be responsive to review comments
- Discuss disagreements constructively
- Push new commits (don't force-push after review starts)
- Re-request review when ready

## Testing Requirements

### For Features

- [ ] Unit tests for core logic
- [ ] Integration tests where applicable
- [ ] E2E tests for user-facing features
- [ ] Backward compatibility tests (if applicable)

### For Bug Fixes

- [ ] Test that reproduces the issue
- [ ] Fix that makes test pass
- [ ] Regression tests to prevent reoccurrence

### Test Coverage

```bash
# Generate coverage report (requires cargo-tarpaulin)
cargo install cargo-tarpaulin
cargo tarpaulin --all --out Html
```

Target: >80% coverage for new code

## Documentation

### Code Comments

```rust
/// Brief description.
///
/// Detailed explanation if needed.
///
/// # Examples
///
/// ```
/// let result = my_function();
/// ```
///
/// # Errors
///
/// Returns error if...
///
/// # Panics
///
/// Panics if...
pub fn my_function() -> Result<T, E> {
    // Implementation
}
```

### README Files

Each module should have a README explaining:
- Purpose and scope
- Quick start guide
- API overview
- Examples
- Architecture (for complex modules)

### Changelog

Update `CHANGELOG.md` for user-facing changes:

```markdown
## [0.2.1] - 2026-01-07

### Added
- New feature X

### Fixed
- Bug with Y

### Changed
- API Z behavior
```

## Reporting Issues

### Bug Reports

```markdown
**Description**
Clear description of the issue.

**Reproduction Steps**
1. Step 1
2. Step 2

**Expected Behavior**
What should happen.

**Actual Behavior**
What actually happened.

**Environment**
- OS: macOS 14.2
- Rust: 1.70.0
- SDK version: 0.2.0
```

### Feature Requests

```markdown
**Description**
Clear description of the feature.

**Motivation**
Why this is needed.

**Proposed Solution**
How you think it should work.

**Alternatives**
Other approaches considered.
```

## Performance Considerations

### Benchmarking

```bash
# Run benchmarks
cargo bench --all

# Specific benchmark
cargo bench -p dytallix-sdk-rust -- wallet_generation
```

### Profiling

```bash
# Flamegraph profiling
cargo install flamegraph
cargo flamegraph --bin dytallix-fast-node
```

### Optimization Checklist

- [ ] Profile before optimizing
- [ ] Measure improvements with benchmarks
- [ ] Document performance trade-offs
- [ ] Consider maintainability vs performance

## Security

### Reporting Security Issues

**Do not open a public issue for security vulnerabilities.**

Email security concerns to: security@dytallix.com

Include:
- Description of vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if available)

We aim to respond within 48 hours.

### Security Guidelines

- Never hardcode secrets or private keys
- Use proper error handling (don't leak sensitive info in errors)
- Validate all inputs
- Use secure cryptographic libraries
- Review dependencies for vulnerabilities: `cargo audit`

## Release Process

Releases are managed by project maintainers. To propose a release:

1. Update version numbers in `Cargo.toml` and `package.json`
2. Update `CHANGELOG.md`
3. Create a release PR
4. After merge, maintainers create a GitHub release

Version numbering follows [Semantic Versioning](https://semver.org/).

## Community

### Communication Channels

- **Discord**: [https://discord.gg/N8Q4A2KE](https://discord.gg/N8Q4A2KE)
- **GitHub Issues**: For bug reports and features
- **GitHub Discussions**: For questions and ideas
- **Email**: contact@dytallix.com

### Recognition

Contributors are recognized in:
- `CONTRIBUTORS.md` file
- GitHub contributors page
- Release notes for significant contributions

## Resources

- **Architecture**: [docs/architecture/](docs/architecture/)
- **Design Docs**: [docs/design/](docs/design/)
- **API Reference**: [SDK README files](sdk/)
- **Testing Guide**: [docs/testing.md](docs/testing.md)
- **Deployment**: [BUILDING.md](BUILDING.md)

## Questions?

- Ask in Discord: [#developers](https://discord.gg/N8Q4A2KE)
- Open a discussion: [GitHub Discussions](https://github.com/DytallixHQ/Dytallix/discussions)
- Email: developers@dytallix.com

Thank you for contributing to Dytallix! 🚀
