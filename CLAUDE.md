# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**@h3mantd/ip-kit** is a TypeScript library for IPv4/IPv6 address manipulation, CIDR operations, IP ranges, address allocation, and radix trie lookups. It's designed for production use in IPAM/CMDB systems with strict immutability, BigInt-based calculations, and generator-driven iteration for memory efficiency.

## Common Commands

### Development
```bash
# Install dependencies (use npm or pnpm)
npm ci

# Type checking
npm run typecheck

# Build library (tsup → dual ESM/CJS + .d.ts)
npm run build

# Development build with watch mode
npm run dev
```

### Testing
```bash
# Run all tests (vitest)
npm test

# Run with coverage (c8)
npm test:coverage

# Run specific test file
npx vitest tests/domain/cidr.test.ts

# Watch mode
npx vitest --watch
```

### Code Quality
```bash
# Lint (ESLint with @typescript-eslint)
npm run lint

# Format (Prettier)
npm run format
```

### Publishing
```bash
# Create changeset
npm run changeset

# Version packages
npm run version-packages

# Release (publish to npm)
npm run release
```

## Architecture

### Core Design Principles

1. **BigInt-Only Arithmetic**: All IP address calculations use `bigint` to ensure precision. NEVER use floating-point arithmetic for address math. See `docs/IP_CALCULATIONS.md` for mathematical foundations.

2. **Immutability**: All classes are immutable. Methods return new instances rather than modifying state. No public setters.

3. **Generator-Driven Iteration**: Use generators (`function*`) for host enumeration, subnet iteration, and IP ranges to handle large address spaces efficiently without materializing millions of objects in memory.

4. **Type Safety**: Strict TypeScript with generics (`V extends 4|6`) ensures version-specific operations are type-checked at compile time.

5. **Tree-Shakeable**: Package is marked with `"sideEffects": false` for optimal bundling.

### Module Structure

```
src/
├── core/                    # Low-level utilities (no domain dependencies)
│   ├── bigint.ts           # Masks, alignment, MSB bit ops, constants (BITS4/BITS6/MAX4/MAX6)
│   ├── normalize.ts        # IPv6 RFC5952 normalization (longest zero run compression)
│   ├── ptr.ts              # Reverse DNS helpers (v4/v6 PTR records, CIDR zones)
│   └── errors.ts           # Custom errors: ParseError, VersionMismatchError, OutOfRangeError, InvariantError
├── domain/                  # Domain models (business logic)
│   ├── ip.ts               # IP (abstract), IPv4, IPv6 classes
│   ├── cidr.ts             # CIDR<V> with network/broadcast/hosts/subnets
│   ├── range.ts            # IPRange<V> with toCIDRs() for minimal covering
│   ├── rangeset.ts         # RangeSet<V> with union/intersect/subtract
│   ├── allocator.ts        # Allocator<V> for free block finding + first-fit allocation
│   └── trie.ts             # RadixTrie<V,T> for longest-prefix matching (routing tables)
└── index.ts                 # Public exports + factory functions (ip(), cidr())

tests/                       # Vitest specs mirroring src/ structure
├── core/                    # Test coverage target: ≥95% for core modules
└── domain/                  # Test coverage target: ≥95% for domain modules
```

### Key Data Flow

1. **Parsing**: String/number/bytes → BigInt → IP/CIDR classes
2. **Calculations**: BigInt masks + bitwise ops → new BigInt values
3. **Formatting**: BigInt → String/bytes (IPv6 uses RFC5952 normalization)
4. **Iteration**: Generator functions yield values lazily

## Critical Implementation Details

### IPv6 RFC 5952 Normalization (`src/core/normalize.ts`)

- Lowercase hex digits
- Remove leading zeros from groups
- Compress **longest** consecutive zero run with `::`
- Ties → compress **leftmost** run
- NEVER compress single zero group
- Example: `2001:0db8:0000:0000:0000:0000:0000:0001` → `2001:db8::1`

### Edge Case Handling

**IPv4 /31 and /32 Networks** (`src/domain/cidr.ts`):
- `/31`: Point-to-point links. By default, `hosts()` excludes network/broadcast unless `includeEdges: true`
- `/32`: Single host. `hosts()` returns the single address

**IPv6 /127 and /128 Networks**:
- Similar handling to IPv4 /31 and /32
- IPv6 has no traditional broadcast, but edge semantics apply

**firstHost Calculation** (`src/domain/cidr.ts:firstHost()`):
- For `/31` and `/127`, when `includeEdges` is false, returns network address + 1
- For other prefixes, excludes network address unless `includeEdges: true`
- Edge case bug fix: Ensure `/31` with `includeEdges: false` doesn't skip to broadcast

### Performance Patterns

**DO**:
```typescript
// Use generators for large ranges
for (const host of cidr.hosts()) {
  if (condition) break; // Can exit early
}

// Lazy subnet iteration
for (const subnet of cidr.subnets(26)) {
  process(subnet);
}
```

**DON'T**:
```typescript
// Avoid materializing huge arrays
const hosts = Array.from(cidr.hosts()); // BAD for large prefixes!

// Avoid split() on large IPv6 ranges
const subnets = cidr.split(1000000); // Can exhaust memory!
```

### Error Handling

Throw specific custom errors from `src/core/errors.ts`:

```typescript
// Parse failures
throw new ParseError('Invalid IPv4 format: octets must be 0-255');

// Version mismatches
throw new VersionMismatchError('Cannot compare IPv4 with IPv6');

// Out-of-range values
throw new OutOfRangeError(`Prefix must be 0-32 for IPv4, got ${prefix}`);

// Internal invariants
throw new InvariantError('Unexpected state in maxAlignedBlock');
```

### Range to CIDR Conversion Algorithm

The `rangeToCIDRs()` method in `src/domain/range.ts` converts arbitrary IP ranges to minimal CIDR sets:

1. Find largest **aligned** block that fits in `[start, end]`
2. If network < start, advance to next aligned boundary
3. Emit CIDR block
4. Advance `current` by block size
5. Repeat until `current > end`

Uses `maxAlignedBlock()` from `src/core/bigint.ts` to find power-of-two aligned blocks.

## Testing Requirements

### Coverage Targets
- Core modules (`src/core/`): ≥95% lines/branches
- Domain modules (`src/domain/`): ≥95% lines/branches
- Overall: ≥90%

### Golden Fixtures to Test
- IPv6 RFC5952 normalization edge cases
- `/31` and `/127` host semantics with `includeEdges`
- Range → minimal CIDR covering (e.g., `192.168.1.10-20`)
- RangeSet set algebra: `(A \ B) ∩ B = ∅`
- Allocator free block finding with holes
- Trie longest-prefix matching with overlapping prefixes

## Common Tasks

### Adding a New IP Operation

1. Identify if it's core utility (goes in `src/core/`) or domain logic (`src/domain/`)
2. Use BigInt for all address arithmetic
3. Add corresponding test in `tests/` with same file structure
4. Ensure strict TypeScript types with generics if version-specific
5. Document with TSDoc including `@example` blocks

### Modifying CIDR Calculations

1. Read `docs/IP_CALCULATIONS.md` for mathematical background
2. Update `src/core/bigint.ts` for low-level mask/alignment changes
3. Update `src/domain/cidr.ts` for high-level CIDR operations
4. Add tests covering edge cases (especially /31, /32, /127, /128)
5. Run `npm run typecheck && npm test` before committing

### Working with RangeSet Operations

RangeSet maintains **normalized intervals** (sorted, merged, non-overlapping):

1. Intervals are inclusive `[start, end]`
2. Adjacent intervals coalesce automatically
3. Operations (union/intersect/subtract) preserve normalization
4. Conversions to/from CIDRs use minimal covering sets

## Code Style Standards

### TypeScript
- Strict mode enabled (`tsconfig.json`)
- NO `any` types (prefer `unknown` with type guards)
- Prefer precise generics over union types
- Explicit return types on public methods

### Naming
- Classes: `PascalCase` (e.g., `IPv4`, `CIDR`)
- Methods/functions: `camelCase` (e.g., `toString()`, `parse()`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `BITS4`, `MAX6`)
- Type parameters: `V extends IPVersion` (version), `T` (generic data)

### Iteration
Always prefer generators over arrays for sequences:
```typescript
// Good
*hosts(): Generator<IP<V>> { ... }

// Bad
hosts(): IP<V>[] { ... }
```

### Documentation
All public APIs require TSDoc with:
- Description of what it does
- `@param` for each parameter
- `@returns` for return value
- `@throws` for exceptions
- `@example` with code snippet

## Package Configuration

- **Type**: ESM (`"type": "module"`)
- **Exports**: Dual ESM/CJS with TypeScript declarations
- **Build**: `tsup` handles bundling (see `tsup.config.ts`)
- **Node**: Requires ≥18 (BigInt support)
- **Side Effects**: None (`"sideEffects": false`)

## CI/CD

GitHub Actions workflow tests on Node 18/20/22:
1. Lint (`npm run lint`)
2. Type check (`npm run typecheck`)
3. Tests (`npm test`)
4. Build (`npm run build`)

Use Changesets for versioning (`npm run changeset`).

## Common Gotchas

1. **Don't use regular numbers for IP math** - Always BigInt
2. **Don't materialize large ranges** - Use generators
3. **Don't skip RFC5952 normalization for IPv6** - Always normalize output
4. **Don't forget includeEdges parameter** - Affects /31, /32, /127, /128 behavior
5. **Don't use floating-point for prefix calculations** - Use bit shifts on BigInt
6. **Don't mix IPv4/IPv6 operations** - Type system prevents this, but watch for runtime checks

## References

- **README.md**: User-facing API documentation with examples
- **CONTRIBUTING.md**: Development workflow, testing guidelines, PR process
- **docs/IP_CALCULATIONS.md**: Mathematical foundations, BigInt usage, algorithm explanations
- **.github/copilot-instructions.md**: Additional implementation guidance and API signatures
