# Contributing to Dytallix SDK

Thank you for your interest in contributing to the Dytallix SDK! We welcome contributions from the community.

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ or 20+
- npm, yarn, or pnpm
- Git
- TypeScript knowledge

### Development Setup

1. **Fork the repository**
   ```bash
   # Click "Fork" on GitHub, then clone your fork
   git clone https://github.com/YOUR_USERNAME/dytallix-sdk.git
   cd dytallix-sdk
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the project**
   ```bash
   npm run build
   ```

4. **Run tests**
   ```bash
   npm test
   ```

## 🔨 Development Workflow

### Making Changes

1. **Create a branch**
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/bug-description
   ```

2. **Make your changes**
   - Write clean, readable code
   - Follow existing code style
   - Add comments for complex logic
   - Update documentation if needed

3. **Test your changes**
   ```bash
   npm run build
   npm test
   npm run lint
   ```

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add new feature description"
   ```

   Follow [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat:` - New feature
   - `fix:` - Bug fix
   - `docs:` - Documentation changes
   - `style:` - Code style changes (formatting)
   - `refactor:` - Code refactoring
   - `test:` - Adding or updating tests
   - `chore:` - Maintenance tasks

5. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Open a Pull Request**
   - Go to the main repository on GitHub
   - Click "New Pull Request"
   - Select your fork and branch
   - Describe your changes clearly
   - Link any related issues

## 📝 Code Style Guidelines

### TypeScript

- Use TypeScript for all new code
- Provide proper type annotations
- Avoid `any` types when possible
- Use interfaces for object shapes
- Document public APIs with JSDoc comments

### Code Quality

- Keep functions small and focused
- Use descriptive variable and function names
- Add error handling where appropriate
- Write self-documenting code
- Add comments for complex logic only

### Example

```typescript
/**
 * Sends tokens from one account to another
 * @param from - Sender's address
 * @param to - Recipient's address
 * @param amount - Amount to send in smallest unit
 * @param tokenType - Type of token ('DGT' or 'DRT')
 * @returns Transaction hash
 */
export async function sendTokens(
  from: string,
  to: string,
  amount: bigint,
  tokenType: 'DGT' | 'DRT'
): Promise<string> {
  // Implementation
}
```

## 🧪 Testing

- Write tests for new features
- Ensure existing tests pass
- Aim for good test coverage
- Test both success and error cases

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- wallet.test.ts
```

## 📚 Documentation

### Code Documentation

- Add JSDoc comments to all public APIs
- Include parameter descriptions
- Provide usage examples
- Document error cases

### README Updates

If your changes affect usage:
- Update the README.md
- Add new examples if needed
- Update the API reference
- Keep examples up-to-date

### Changelog

Add your changes to CHANGELOG.md under `[Unreleased]`:

```markdown
## [Unreleased]

### Added
- New feature description

### Fixed
- Bug fix description

### Changed
- Breaking change description
```

## 🐛 Reporting Bugs

### Before Submitting

1. Check existing issues
2. Test with the latest version
3. Gather relevant information

### Bug Report Template

```markdown
**Describe the bug**
A clear description of the bug.

**To Reproduce**
Steps to reproduce:
1. ...
2. ...

**Expected behavior**
What you expected to happen.

**Actual behavior**
What actually happened.

**Environment**
- OS: [e.g. macOS 14.0]
- Node.js version: [e.g. 20.10.0]
- SDK version: [e.g. 0.1.0]
- Browser (if applicable): [e.g. Chrome 120]

**Additional context**
Any other relevant information.
```

## 💡 Feature Requests

We welcome feature suggestions! Please:

1. Check if the feature already exists or is planned
2. Explain the use case clearly
3. Provide examples if possible
4. Consider implementation complexity

## 📋 Pull Request Checklist

Before submitting a PR, ensure:

- [ ] Code builds without errors (`npm run build`)
- [ ] All tests pass (`npm test`)
- [ ] New code has tests
- [ ] Documentation is updated
- [ ] CHANGELOG.md is updated
- [ ] Commit messages follow conventions
- [ ] Code follows project style
- [ ] No unnecessary changes included

## 🎯 Areas for Contribution

We especially welcome contributions in these areas:

- 📝 Documentation improvements
- 🧪 Additional test coverage
- 🐛 Bug fixes
- ✨ New features (discuss first via issue)
- 🌐 Internationalization
- 📦 Example applications
- 🚀 Performance improvements

## 💬 Communication

- **GitHub Issues**: Bug reports and feature requests
- **Pull Requests**: Code contributions
- **Discussions**: General questions and ideas
- **Twitter/X**: [@DytallixHQ](https://twitter.com/DytallixHQ) - Follow for updates
- **Telegram**: Coming soon

## 📜 Code of Conduct

Please be respectful and professional in all interactions. We're all here to build something great together!

## 🙏 Recognition

Contributors will be:
- Listed in the project README
- Mentioned in release notes
- Credited in relevant documentation

Thank you for contributing to Dytallix SDK! 🚀

---

**Questions?** Feel free to open an issue or reach out to the maintainers.
