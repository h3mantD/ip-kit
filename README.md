# IP Toolkit

TypeScript IP Toolkit for IPv4/IPv6 math, CIDR operations, ranges, allocation, and trie lookups.

[![npm version](https://badge.fury.io/js/ip-toolkit.svg)](https://badge.fury.io/js/ip-toolkit)
[![Node.js CI](https://github.com/h3mantD/ip-toolkit/actions/workflows/ci.yml/badge.svg)](https://github.com/h3mantD/ip-toolkit/actions/workflows/ci.yml)
[![Coverage](https://coveralls.io/repos/github/h3mantD/ip-toolkit/badge.svg)](https://coveralls.io/github/h3mantD/ip-toolkit)

## Quick Start

```typescript
import { ip, cidr, IPv4, CIDR } from "ip-toolkit";

// Parse IPs
const ipv4 = ip("192.168.1.1");
const ipv6 = ip("2001:db8::1");

// Parse CIDRs
const network = cidr("192.168.1.0/24");

// Get network info
console.log(network.network().toString()); // 192.168.1.0
console.log(network.broadcast().toString()); // 192.168.1.255
console.log(network.size()); // 256n

// Check containment
console.log(network.contains(ip("192.168.1.50"))); // true

// Iterate hosts
for (const host of network.hosts()) {
  console.log(host.toString());
}

// Subnetting
const subnets = Array.from(network.subnets(26));
console.log(subnets.length); // 4
```

## Installation

### Prerequisites

- Node.js 18 or higher
- npm or pnpm

### Install

```bash
# Using npm
npm install ip-toolkit

# Using pnpm
pnpm add ip-toolkit

# Using yarn
yarn add ip-toolkit
```

### Build from Source

```bash
git clone https://github.com/h3mantD/ip-toolkit.git
cd ip-toolkit
npm install
npm run build
```

## Features

- ✅ IPv4/IPv6 parsing and formatting (string, number, bigint, bytes)
- ✅ CIDR operations (network, broadcast, contains, overlaps)
- ✅ Host iteration with proper /31 and /127 handling
- ✅ Subnetting and splitting
- ✅ IP ranges and CIDR conversion
- ✅ BigInt-based math for precision
- ✅ Lazy iterators for memory efficiency
- ✅ TypeScript strict mode with full type safety
- ✅ Dual ESM/CJS builds with TypeScript declarations

## API Reference

### Core Types

```typescript
type IPVersion = 4 | 6;
```

### IP Classes

#### IPv4

```typescript
class IPv4 extends IP<4> {
  // Static methods
  static parse(input: string | number | bigint | Uint8Array): IPv4;
  static fromBigInt(value: bigint): IPv4;

  // Instance methods
  toBigInt(): bigint;
  toBytes(): Uint8Array;
  toString(): string;
  equals(other: IP): boolean;
  compare(other: IPv4): -1 | 0 | 1;
}
```

#### IPv6

```typescript
class IPv6 extends IP<6> {
  // Static methods
  static parse(input: string | number | bigint | Uint8Array): IPv6;
  static fromBigInt(value: bigint): IPv6;

  // Instance methods
  toBigInt(): bigint;
  toBytes(): Uint8Array;
  toString(): string; // RFC 5952 normalized
  equals(other: IP): boolean;
  compare(other: IPv6): -1 | 0 | 1;
}
```

#### Factory Functions

```typescript
function ip(input: string | number | bigint | Uint8Array): IPv4 | IPv6;
function cidr(input: string): CIDR<4> | CIDR<6>;
```

### CIDR Classes

```typescript
class CIDR<V extends IPVersion = IPVersion> {
  readonly ip: V extends 4 ? IPv4 : IPv6;
  readonly prefix: number;
  readonly version: V;

  // Static methods
  static parse(s: string): CIDR<4> | CIDR<6>;
  static from(ip: IPv4, prefix: number): CIDR<4>;
  static from(ip: IPv6, prefix: number): CIDR<6>;

  // Instance methods
  bits(): 32 | 128;
  network(): typeof this.ip;
  broadcast(): IPv4; // IPv4 only
  size(): bigint;
  firstHost(opts?: { includeEdges?: boolean }): typeof this.ip;
  lastHost(opts?: { includeEdges?: boolean }): typeof this.ip;
  contains(x: IP | CIDR): boolean;
  overlaps(other: CIDR<V>): boolean;
  *hosts(opts?: { includeEdges?: boolean }): Generator<typeof this.ip>;
  *subnets(newPrefix: number): Generator<CIDR<V>>;
  split(parts: number): CIDR<V>[];
  move(n: number): CIDR<V>;
  toRange(): IPRange<V>;
  toPtr(): string[];
  toString(): string;
}
```

### Range Classes

```typescript
class IPRange<V extends IPVersion = IPVersion> {
  readonly start: V extends 4 ? IPv4 : IPv6;
  readonly end: V extends 4 ? IPv4 : IPv6;
  readonly version: V;

  // Static methods
  static parse(s: string): IPRange<4> | IPRange<6>;
  static from(start: IPv4, end: IPv4): IPRange<4>;
  static from(start: IPv6, end: IPv6): IPRange<6>;

  // Instance methods
  size(): bigint;
  overlaps(other: IPRange<V>): boolean;
  contains(ip: IP): boolean;
  *ips(limit?: number): Generator<typeof this.start>;
  toCIDRs(): CIDR<V>[];
  toString(): string;
}
```

### Error Classes

```typescript
class ParseError extends Error {}
class VersionMismatchError extends Error {}
class OutOfRangeError extends Error {}
class InvariantError extends Error {}
```

## Usage Examples

### IPv4 Operations

```typescript
import { IPv4, CIDR } from "ip-toolkit";

// Parse different formats
const ip1 = IPv4.parse("192.168.1.1");
const ip2 = IPv4.parse(3232235777); // number
const ip3 = IPv4.parse(3232235777n); // bigint
const ip4 = IPv4.parse(new Uint8Array([192, 168, 1, 1])); // bytes

// CIDR operations
const cidr = CIDR.parse("192.168.1.0/24");
console.log(cidr.network().toString()); // '192.168.1.0'
console.log(cidr.broadcast().toString()); // '192.168.1.255'
console.log(cidr.size()); // 256n

// Check containment
console.log(cidr.contains(IPv4.parse("192.168.1.100"))); // true

// Iterate hosts (excludes network/broadcast for /24)
for (const host of cidr.hosts()) {
  console.log(host.toString());
}

// Subnet into /26 networks
const subnets = Array.from(cidr.subnets(26));
console.log(subnets.map((s) => s.toString()));
// ['192.168.1.0/26', '192.168.1.64/26', '192.168.1.128/26', '192.168.1.192/26']
```

### IPv6 Operations

```typescript
import { IPv6, CIDR } from "ip-toolkit";

// Parse with compression
const ip = IPv6.parse("2001:0db8:0000:0000:0000:0000:0000:0001");
console.log(ip.toString()); // '2001:db8::1'

// CIDR operations
const cidr = CIDR.parse("2001:db8::/32");
console.log(cidr.size()); // 79228162514264337593543950336n

// IPv6 always includes all addresses in hosts()
const hosts = Array.from(cidr.hosts({ includeEdges: true }));
console.log(hosts.length); // Very large, use with limit
```

### IP Ranges

```typescript
import { IPRange, IPv4 } from "ip-toolkit";

// Parse range
const range = IPRange.parse("192.168.1.10 - 192.168.1.20");
console.log(range.size()); // 11n

// Check containment
console.log(range.contains(IPv4.parse("192.168.1.15"))); // true

// Iterate IPs
for (const ip of range.ips()) {
  console.log(ip.toString());
}

// Convert to minimal CIDRs
const cidrs = range.toCIDRs();
console.log(cidrs.map((c) => c.toString()));
```

### Error Handling

```typescript
import { IPv4, CIDR, ParseError } from "ip-toolkit";

try {
  const ip = IPv4.parse("256.1.1.1"); // Invalid
} catch (error) {
  if (error instanceof ParseError) {
    console.log("Parse error:", error.message);
  }
}

try {
  const cidr = CIDR.parse("192.168.1.0/33"); // Invalid prefix
} catch (error) {
  console.log("Invalid CIDR:", error.message);
}
```

## Caveats and Design Decisions

- **BigInt Usage**: All IP math uses BigInt to avoid floating-point precision issues with large IPv6 addresses.
- **Lazy Iterators**: Methods like `hosts()`, `subnets()`, and `ips()` return generators to handle large ranges efficiently without memory issues.
- **IPv4 /31 and /32 Handling**: For point-to-point links (/31) and single-host (/32), `hosts()` includes all addresses by default. Use `{ includeEdges: false }` to exclude network/broadcast.
- **IPv6 Edge Inclusion**: IPv6 ranges always include network and broadcast addresses in iterations, as there's no traditional broadcast concept.
- **RFC 5952 Normalization**: IPv6 addresses are automatically normalized to the canonical compressed form.
- **Type Safety**: Strict TypeScript with generics ensures version-specific operations are type-checked.

## Development

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm

### Setup

```bash
git clone https://github.com/h3mantD/ip-toolkit.git
cd ip-toolkit
pnpm install
```

### Available Scripts

```bash
# Build the library
pnpm build

# Run tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Lint code
pnpm lint

# Format code
pnpm format

# Type check
pnpm typecheck

# Development build with watch
pnpm dev
```

### Project Structure

```
src/
├── core/           # Core utilities
│   ├── bigint.ts   # BigInt math helpers
│   ├── errors.ts   # Custom error classes
│   ├── normalize.ts # IPv6 normalization
│   └── ptr.ts      # Reverse DNS utilities
├── domain/         # Domain models
│   ├── ip.ts       # IP address classes
│   ├── cidr.ts     # CIDR classes
│   └── range.ts    # IP range classes
└── index.ts        # Public exports

tests/              # Test files
├── core/
└── domain/
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines and contribution process.

## License

MIT

## Roadmap

- [ ] Advanced range set operations (union, intersect, subtract)
- [ ] IP allocation and free block finding
- [ ] Radix trie for longest-prefix matching
- [ ] Performance benchmarks
- [ ] WASM backend for high-performance operations
- [ ] CLI tool for common operations
