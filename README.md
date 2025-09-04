# IP Toolkit

TypeScript IP Toolkit for IPv4/IPv6 math, CIDR operations, ranges, allocation, and trie lookups.

[![CI](https://github.com/h3mantD/ip-kit/actions/workflows/ci.yml/badge.svg)](https://github.com/h3mantD/ip-kit/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@h3mantd/ip-kit.svg)](https://www.npmjs.com/package/@h3mantd/ip-kit)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

## Quick Start

```typescript
import { ip, cidr, IPv4, CIDR } from 'ip-kit';

// Parse IPs
const ipv4 = ip('192.168.1.1');
const ipv6 = ip('2001:db8::1');

// Parse CIDRs
const network = cidr('192.168.1.0/24');

// Get network info
console.log(network.network().toString()); // 192.168.1.0
console.log(network.broadcast().toString()); // 192.168.1.255
console.log(network.size()); // 256n

// Check containment
console.log(network.contains(ip('192.168.1.50'))); // true

// Iterate hosts
for (const host of network.hosts()) {
  console.log(host.toString());
}

// Subnetting
const subnets = Array.from(network.subnets(26));
console.log(subnets.length); // 4
```

> 💡 **See more examples** in the [`examples/`](./examples/) directory!

## Installation

### Prerequisites

- Node.js 18 or higher
- npm or pnpm

### Install

```bash
# Using npm
npm install @h3mantd/ip-kit

# Using pnpm
pnpm add @h3mantd/ip-kit

# Using yarn
yarn add @h3mantd/ip-kit
```

### Build from Source

```bash
git clone https://github.com/h3mantD/ip-kit.git
cd ip-kit
npm install
npm run build
```

## Features

- ✅ IPv4/IPv6 parsing and formatting (string, number, bigint, bytes)
- ✅ CIDR operations (network, broadcast, contains, overlaps)
- ✅ Host iteration with proper /31 and /127 handling
- ✅ Subnetting and splitting
- ✅ IP ranges and CIDR conversion
- ✅ **Range set operations** (union, intersect, subtract)
- ✅ **IP address allocation** with conflict detection
- ✅ **Radix trie** for longest-prefix matching
- ✅ BigInt-based math for precision
- ✅ Lazy iterators for memory efficiency
- ✅ TypeScript strict mode with full type safety
- ✅ Dual ESM/CJS builds with TypeScript declarations
- ✅ Comprehensive test coverage (106+ tests)

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

### RangeSet Classes

```typescript
class RangeSet<V extends IPVersion = IPVersion> {
  // Static methods
  static fromCIDRs<V extends IPVersion>(cidrs: Array<CIDR<V> | string>): RangeSet<V>;
  static fromRanges<V extends IPVersion>(ranges: Array<IPRange<V>>): RangeSet<V>;

  // Instance methods
  isEmpty(): boolean;
  size(): bigint;
  union(other: RangeSet<V>): RangeSet<V>;
  intersect(other: RangeSet<V>): RangeSet<V>;
  subtract(other: RangeSet<V>): RangeSet<V>;
  contains(ip: IP<V>): boolean;
  containsCIDR(cidr: CIDR<V>): boolean;
  *ips(limit?: number): Generator<IP<V>>;
  toCIDRs(): CIDR<V>[];
  toString(): string;
}
```

### Allocator Classes

```typescript
class Allocator<V extends IPVersion = IPVersion> {
  readonly parent: CIDR<V>;
  readonly taken: RangeSet<V>;
  readonly version: V;

  constructor(parent: CIDR<V>, taken?: RangeSet<V>);

  // Allocation methods
  nextAvailable(from?: IP<V>): IP<V> | null;
  allocateNext(): IP<V> | null;
  allocateIP(ip: IP<V>): boolean;
  allocateCIDR(cidr: CIDR<V>): boolean;

  // Query methods
  freeBlocks(opts?: { minPrefix?: number; maxResults?: number }): CIDR<V>[];
  availableCount(): bigint;
  utilization(): number;
}
```

### RadixTrie Classes

```typescript
class RadixTrie<V extends IPVersion = IPVersion, T = unknown> {
  readonly version: V;

  constructor(version: V);

  // Core methods
  insert(cidr: CIDR<V>, value?: T): this;
  remove(cidr: CIDR<V>): this;
  longestMatch(ip: IP<V>): { cidr: CIDR<V>; value?: T } | null;

  // Utility methods
  isEmpty(): boolean;
  size(): number;
  getCIDRs(): CIDR<V>[];
}
```

## Usage Examples

### IPv4 Operations

```typescript
import { IPv4, CIDR } from 'ip-kit';

// Parse different formats
const ip1 = IPv4.parse('192.168.1.1');
const ip2 = IPv4.parse(3232235777); // number
const ip3 = IPv4.parse(3232235777n); // bigint
const ip4 = IPv4.parse(new Uint8Array([192, 168, 1, 1])); // bytes

// CIDR operations
const cidr = CIDR.parse('192.168.1.0/24');
console.log(cidr.network().toString()); // '192.168.1.0'
console.log(cidr.broadcast().toString()); // '192.168.1.255'
console.log(cidr.size()); // 256n

// Check containment
console.log(cidr.contains(IPv4.parse('192.168.1.100'))); // true

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
import { IPv6, CIDR } from 'ip-kit';

// Parse with compression
const ip = IPv6.parse('2001:0db8:0000:0000:0000:0000:0000:0001');
console.log(ip.toString()); // '2001:db8::1'

// CIDR operations
const cidr = CIDR.parse('2001:db8::/32');
console.log(cidr.size()); // 79228162514264337593543950336n

// IPv6 always includes all addresses in hosts()
const hosts = Array.from(cidr.hosts({ includeEdges: true }));
console.log(hosts.length); // Very large, use with limit
```

### IP Ranges

```typescript
import { IPRange, IPv4 } from 'ip-kit';

// Parse range
const range = IPRange.parse('192.168.1.10 - 192.168.1.20');
console.log(range.size()); // 11n

// Check containment
console.log(range.contains(IPv4.parse('192.168.1.15'))); // true

// Iterate IPs
for (const ip of range.ips()) {
  console.log(ip.toString());
}

// Convert to minimal CIDRs
const cidrs = range.toCIDRs();
console.log(cidrs.map((c) => c.toString()));
```

### Range Set Operations

```typescript
import { RangeSet, CIDR, IPv4 } from 'ip-kit';

// Create range sets from CIDRs
const set1 = RangeSet.fromCIDRs(['192.168.1.0/25', '192.168.2.0/24']);
const set2 = RangeSet.fromCIDRs(['192.168.1.128/25', '192.168.3.0/24']);

// Union (combine ranges)
const union = set1.union(set2);
console.log(union.size()); // 512n + 256n = 768n

// Intersection (overlapping ranges)
const intersection = set1.intersect(set2);
console.log(intersection.size()); // 0n (no overlap)

// Subtraction (remove ranges)
const difference = set1.subtract(set2);
console.log(difference.size()); // 512n

// Check containment
console.log(set1.contains(IPv4.parse('192.168.1.50'))); // true
console.log(set1.containsCIDR(CIDR.parse('192.168.1.64/26'))); // true

// Convert to minimal CIDRs
const minimalCIDRs = union.toCIDRs();
console.log(minimalCIDRs.map((c) => c.toString()));
// ['192.168.1.0/24', '192.168.2.0/24', '192.168.3.0/24']
```

### IP Address Allocation

```typescript
import { Allocator, CIDR, IPv4 } from 'ip-kit';

// Create allocator for a /24 network
const parent = CIDR.parse('192.168.1.0/24');
const allocator = new Allocator(parent);

// Allocate next available IP
const ip1 = allocator.allocateNext();
console.log(ip1?.toString()); // '192.168.1.1'

// Allocate specific IP
const success = allocator.allocateIP(IPv4.parse('192.168.1.10'));
console.log(success); // true

// Allocate CIDR block
const cidrSuccess = allocator.allocateCIDR(CIDR.parse('192.168.1.64/26'));
console.log(cidrSuccess); // true

// Find next available IP
const next = allocator.nextAvailable();
console.log(next?.toString()); // '192.168.1.2'

// Get free blocks
const freeBlocks = allocator.freeBlocks({ minPrefix: 27 });
console.log(freeBlocks.map((b) => b.toString()));

// Check utilization
console.log(`Utilization: ${(allocator.utilization() * 100).toFixed(1)}%`);

// Get available count
console.log(`Available IPs: ${allocator.availableCount()}`);
```

### Longest-Prefix Matching (Routing)

```typescript
import { RadixTrie, CIDR, IPv4 } from 'ip-kit';

// Create routing table
const routingTable = new RadixTrie<4, string>(4);

// Add routes with associated interface/gateway info
routingTable
  .insert(CIDR.parse('0.0.0.0/0'), 'default-gateway')
  .insert(CIDR.parse('192.168.0.0/16'), 'lan-interface')
  .insert(CIDR.parse('192.168.1.0/24'), 'server-subnet')
  .insert(CIDR.parse('192.168.1.128/25'), 'dmz-subnet');

// Find best route for destination IP
const destIP = IPv4.parse('192.168.1.150');
const route = routingTable.longestMatch(destIP);

if (route) {
  console.log(`Route: ${route.cidr.toString()}`);
  console.log(`Next hop: ${route.value}`);
  // Output: Route: 192.168.1.128/25, Next hop: dmz-subnet
}

// Remove a route
routingTable.remove(CIDR.parse('192.168.1.128/25'));

// Get all routes
const allRoutes = routingTable.getCIDRs();
console.log(`Total routes: ${routingTable.size()}`);
```

### Error Handling

```typescript
import { IPv4, CIDR, ParseError } from 'ip-kit';

try {
  const ip = IPv4.parse('256.1.1.1'); // Invalid
} catch (error) {
  if (error instanceof ParseError) {
    console.log('Parse error:', error.message);
  }
}

try {
  const cidr = CIDR.parse('192.168.1.0/33'); // Invalid prefix
} catch (error) {
  console.log('Invalid CIDR:', error.message);
}
```

## Advanced Examples

### IPAM (IP Address Management) System

```typescript
import { Allocator, RangeSet, CIDR, IPv4 } from 'ip-kit';

// Simulate IPAM for a data center
class IPAMSystem {
  private allocators: Map<string, Allocator<4>> = new Map();

  addSubnet(name: string, cidr: string, takenRanges: string[] = []) {
    const parent = CIDR.parse(cidr) as CIDR<4>;
    const taken = RangeSet.fromCIDRs(takenRanges);
    this.allocators.set(name, new Allocator(parent, taken));
  }

  allocateIP(subnetName: string): IPv4 | null {
    const allocator = this.allocators.get(subnetName);
    return allocator?.allocateNext() || null;
  }

  getUtilization(subnetName: string): number {
    const allocator = this.allocators.get(subnetName);
    return allocator?.utilization() || 0;
  }

  findFreeBlocks(subnetName: string, minPrefix = 24) {
    const allocator = this.allocators.get(subnetName);
    return allocator?.freeBlocks({ minPrefix }) || [];
  }
}

// Usage
const ipam = new IPAMSystem();
ipam.addSubnet('web-servers', '10.0.1.0/24', ['10.0.1.1/32', '10.0.1.2/32']);
ipam.addSubnet('database', '10.0.2.0/24');

const webIP = ipam.allocateIP('web-servers');
console.log(`Allocated web server IP: ${webIP?.toString()}`);

console.log(`Web subnet utilization: ${(ipam.getUtilization('web-servers') * 100).toFixed(1)}%`);

const freeBlocks = ipam.findFreeBlocks('database', 25);
console.log(`Available /25 blocks in database subnet: ${freeBlocks.length}`);
```

### Routing Table Implementation

```typescript
import { RadixTrie, CIDR, IPv4 } from 'ip-kit';

interface RouteInfo {
  interface: string;
  gateway?: string;
  metric: number;
}

class RoutingTable {
  private ipv4Routes: RadixTrie<4, RouteInfo> = new RadixTrie(4);

  addRoute(cidrStr: string, info: RouteInfo) {
    const cidr = CIDR.parse(cidrStr);
    if (cidr.version === 4) {
      this.ipv4Routes.insert(cidr as CIDR<4>, info);
    }
  }

  lookupRoute(destination: string): RouteInfo | null {
    const ip = IPv4.parse(destination);
    const result = this.ipv4Routes.longestMatch(ip);
    return result?.value || null;
  }

  getAllRoutes(): Array<{ cidr: string; info: RouteInfo }> {
    const routes: Array<{ cidr: string; info: RouteInfo }> = [];

    for (const cidr of this.ipv4Routes.getCIDRs()) {
      const result = this.ipv4Routes.longestMatch(cidr.network() as IPv4);
      if (result?.value) {
        routes.push({ cidr: cidr.toString(), info: result.value });
      }
    }

    return routes;
  }
}

// Usage
const routing = new RoutingTable();
routing.addRoute('0.0.0.0/0', { interface: 'eth0', gateway: '192.168.1.1', metric: 100 });
routing.addRoute('192.168.1.0/24', { interface: 'eth1', metric: 10 });
routing.addRoute('10.0.0.0/8', { interface: 'eth2', metric: 20 });

const route = routing.lookupRoute('192.168.1.50');
console.log(`Route to 192.168.1.50: ${route?.interface} (metric: ${route?.metric})`);

const allRoutes = routing.getAllRoutes();
console.log('All routes:', allRoutes);
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
git clone https://github.com/h3mantD/ip-kit.git
cd ip-kit
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

# Run examples
node examples/basic.js
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
│   ├── range.ts    # IP range classes
│   ├── rangeset.ts # IP range set operations
│   ├── allocator.ts # IP address allocation
│   └── trie.ts     # Radix trie for LPM
└── index.ts        # Public exports

tests/              # Test files (106+ tests)
├── core/
│   ├── bigint.test.ts
│   └── ...
└── domain/
    ├── ip.test.ts
    ├── cidr.test.ts
    ├── range.test.ts
    ├── rangeset.test.ts
    ├── allocator.test.ts
    └── trie.test.ts
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines and contribution process.

## License

MIT

## Roadmap

- [x] **Advanced range set operations** (union, intersect, subtract) ✅
- [x] **IP allocation and free block finding** ✅
- [x] **Radix trie for longest-prefix matching** ✅
- [ ] Performance benchmarks
- [ ] WASM backend for high-performance operations
- [ ] CLI tool for common operations
- [ ] ASN/Geo lookups
- [ ] Database integration adapters
