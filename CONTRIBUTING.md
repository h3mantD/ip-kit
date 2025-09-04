# Contributing to IP Toolkit

Thank you for your interest in contributing to IP Toolkit! This document provides guidelines and information for contributors.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Code Style](#code-style)
- [Pull Request Process](#pull-request-process)
- [Reporting Issues](#reporting-issues)

## Code of Conduct

This project follows a code of conduct to ensure a welcoming environment for all contributors. By participating, you agree to:

- Be respectful and inclusive
- Focus on constructive feedback
- Accept responsibility for mistakes
- Show empathy towards other contributors
- Help create a positive community

## Getting Started

### Prerequisites

- **Node.js**: Version 18 or higher
- **Package Manager**: pnpm (recommended), npm, or yarn
- **Git**: For version control

### Quick Setup

```bash
# Fork and clone the repository
git clone https://github.com/h3mantD/ip-kit.git
cd ip-kit

# Install dependencies
pnpm install

# Run tests to ensure everything works
pnpm test

# Build the project
pnpm build
```

## Development Setup

### Environment Setup

1. **Install Node.js 18+**

   ```bash
   # Using nvm (recommended)
   nvm install 18
   nvm use 18
   ```

2. **Install pnpm**

   ```bash
   npm install -g pnpm
   ```

3. **Clone and setup**
   ```bash
   git clone https://github.com/h3mantD/ip-kit.git
   cd ip-kit
   pnpm install
   ```

### Available Scripts

```bash
# Development
pnpm dev          # Build with watch mode
pnpm build        # Production build
pnpm typecheck    # TypeScript type checking

# Testing
pnpm test         # Run all tests
pnpm test:coverage # Run tests with coverage report

# Code Quality
pnpm lint         # Run ESLint
pnpm format       # Format code with Prettier

# All checks
pnpm ci           # Run all CI checks (lint, typecheck, test, build)
```

## Project Structure

```
ip-kit/
├── src/                    # Source code
│   ├── core/              # Core utilities
│   │   ├── bigint.ts      # BigInt math operations
│   │   ├── errors.ts      # Custom error classes
│   │   ├── normalize.ts   # IPv6 normalization (RFC 5952)
│   │   └── ptr.ts         # Reverse DNS utilities
│   ├── domain/            # Domain models
│   │   ├── ip.ts          # IPv4/IPv6 classes
│   │   ├── cidr.ts        # CIDR operations
│   │   └── range.ts       # IP range operations
│   └── index.ts           # Public API exports
├── tests/                 # Test files
│   ├── core/              # Core utility tests
│   └── domain/            # Domain model tests
├── docs/                  # Documentation
│   └── IP_CALCULATIONS.md # IP math and BigInt calculations guide
├── .github/               # GitHub configuration
│   ├── workflows/         # CI/CD workflows
│   └── prompts/           # Development prompts
├── dist/                  # Built output (generated)
├── package.json           # Package configuration
├── tsconfig.json          # TypeScript configuration
├── tsup.config.ts         # Build configuration
└── README.md              # Documentation
```

### Architecture Principles

- **Type Safety**: Strict TypeScript with generics for version-specific operations
- **BigInt Math**: All IP calculations use BigInt for precision (see [IP Calculations Guide](../docs/IP_CALCULATIONS.md))
- **Lazy Evaluation**: Generators for memory-efficient iteration
- **Error Handling**: Custom error classes for specific failure modes
- **Modular Design**: Clear separation between core utilities and domain logic

## Development Workflow

### 1. Choose an Issue

- Check [GitHub Issues](https://github.com/h3mantD/ip-kit/issues) for open tasks
- Look for issues labeled `good first issue` or `help wanted`
- Comment on the issue to indicate you're working on it

### 2. Create a Branch

```bash
# Create and switch to a new branch
git checkout -b feature/your-feature-name
# or
git checkout -b fix/issue-number-description
```

### 3. Implement Changes

- Write code following the established patterns
- Add tests for new functionality
- Update documentation if needed
- Ensure all tests pass: `pnpm test`
- Check code style: `pnpm lint && pnpm format`

### 4. Commit Changes

```bash
# Stage your changes
git add .

# Commit with a clear message
git commit -m "feat: add new feature description

- What was changed
- Why it was changed
- Any breaking changes
"
```

#### Commit Message Format

This project uses [Conventional Commits](https://conventionalcommits.org/):

```
type(scope): description

[optional body]

[optional footer]
```

Types:

- `feat`: New features
- `fix`: Bug fixes
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Test additions/changes
- `chore`: Maintenance tasks

### 5. Push and Create PR

```bash
# Push your branch
git push origin feature/your-feature-name

# Create a Pull Request on GitHub
```

## Testing

### Test Structure

- **Unit Tests**: Test individual functions and methods
- **Integration Tests**: Test interactions between components
- **Edge Cases**: Test boundary conditions and error scenarios

### Writing Tests

```typescript
import { describe, it, expect } from 'vitest';
import { IPv4 } from '../../src/domain/ip';

describe('IPv4', () => {
  describe('parse', () => {
    it('should parse valid IPv4 string', () => {
      const ip = IPv4.parse('192.168.1.1');
      expect(ip.toString()).toBe('192.168.1.1');
    });

    it('should throw on invalid input', () => {
      expect(() => IPv4.parse('256.1.1.1')).toThrow();
    });
  });
});
```

### Running Tests

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test:coverage

# Run specific test file
pnpm test tests/domain/ip.test.ts

# Run tests in watch mode
pnpm test --watch
```

### Test Coverage Goals

- **Core modules**: ≥90% coverage
- **Domain modules**: ≥95% coverage
- **Overall project**: ≥90% coverage

## Code Style

### TypeScript

- **Strict Mode**: All TypeScript strict checks enabled
- **Type Annotations**: Explicit types for all public APIs
- **Generics**: Use generics for version-specific operations
- **Interfaces**: Prefer interfaces over types for object shapes

### Naming Conventions

- **Classes**: PascalCase (e.g., `IPv4`, `CIDR`)
- **Methods**: camelCase (e.g., `toString()`, `parse()`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `BITS4`, `MAX6`)
- **Files**: kebab-case for directories, camelCase for files

### Code Patterns

```typescript
// Good: Explicit error handling
try {
  const ip = IPv4.parse(input);
} catch (error) {
  if (error instanceof ParseError) {
    // Handle parse error
  }
}

// Good: Type guards
function isIPv4String(s: string): boolean {
  return /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(s);
}

// Good: Generator functions for large datasets
function* hosts(cidr: CIDR): Generator<IP> {
  // Lazy evaluation
}
```

### Documentation

- **JSDoc**: All public APIs should have JSDoc comments
- **Examples**: Include usage examples in doc comments
- **Parameters**: Document all parameters and return types

````typescript
/**
 * Parses an IPv4 address from various input formats.
 *
 * @param input - The input to parse (string, number, bigint, or bytes)
 * @returns The parsed IPv4 address
 * @throws {ParseError} If the input is invalid
 *
 * @example
 * ```typescript
 * const ip = IPv4.parse("192.168.1.1");
 * console.log(ip.toString()); // "192.168.1.1"
 * ```
 */
static parse(input: string | number | bigint | Uint8Array): IPv4
````

## Pull Request Process

### Before Submitting

1. **Update Tests**: Ensure all tests pass and add new tests for changes
2. **Update Documentation**: Update README.md or docs for API changes
3. **Code Review**: Self-review your code for:
   - Code style compliance
   - Test coverage
   - Documentation completeness
   - Performance implications

### PR Template

When creating a PR, include:

- **Title**: Clear, descriptive title following conventional commit format
- **Description**:
  - What changes were made
  - Why they were made
  - Any breaking changes
  - Testing instructions
- **Screenshots**: If UI changes (not applicable for this library)
- **Checklist**:
  - [ ] Tests pass
  - [ ] Code linted
  - [ ] Documentation updated
  - [ ] Breaking changes documented

### Review Process

1. **Automated Checks**: CI will run linting, type checking, and tests
2. **Code Review**: Maintainers will review code for:
   - Code quality and style
   - Test coverage
   - Documentation
   - Performance
   - Security implications
3. **Approval**: PR requires approval from at least one maintainer
4. **Merge**: Maintainers will merge approved PRs

## Reporting Issues

### Bug Reports

When reporting bugs, please include:

- **Clear Title**: Describe the issue concisely
- **Steps to Reproduce**: Minimal code example that reproduces the issue
- **Expected Behavior**: What should happen
- **Actual Behavior**: What actually happens
- **Environment**: Node.js version, OS, package manager
- **Additional Context**: Screenshots, stack traces, related issues

### Feature Requests

For feature requests, please include:

- **Clear Title**: Describe the desired feature
- **Use Case**: Why this feature would be useful
- **Proposed API**: If applicable, suggest how it should work
- **Alternatives**: Other solutions you've considered

### Security Issues

For security-related issues:

- **DO NOT** create a public GitHub issue
- Email maintainers directly with details
- Allow time for investigation before public disclosure

## Recognition

Contributors will be recognized in:

- GitHub's contributor insights
- Release notes for significant contributions
- Special mentions for major features or fixes

Thank you for contributing to IP Toolkit! 🎉
