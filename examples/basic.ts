#!/usr/bin/env tsx

/**
 * Basic IP Toolkit Examples
 *
 * Run with: pnpm tsx examples/basic.ts
 */

import { ip, cidr, IPv4, CIDR, IPRange, Allocator } from '../src/index';

console.log('=== IP Toolkit Basic Examples ===\n');

// 1. IP Parsing
console.log('1. IP Parsing:');
const ipv4 = ip('192.168.1.1');
const ipv6 = ip('2001:db8::1');
console.log(`IPv4: ${ipv4.toString()} (version: ${ipv4.version})`);
console.log(`IPv6: ${ipv6.toString()} (version: ${ipv6.version})`);
console.log(`IPv4 as BigInt: ${ipv4.toBigInt()}`);
console.log(`IPv6 as BigInt: ${ipv6.toBigInt()}\n`);

// 2. CIDR Operations
console.log('2. CIDR Operations:');
const network = cidr('192.168.1.0/24');
console.log(`CIDR: ${network.toString()}`);
console.log(`Network: ${network.network().toString()}`);
console.log(`Broadcast: ${network.broadcast().toString()}`);
console.log(`Size: ${network.size()} addresses`);
console.log(`Contains 192.168.1.50: ${network.contains(ip('192.168.1.50'))}`);
console.log(`Contains 192.168.2.1: ${network.contains(ip('192.168.2.1'))}\n`);

// 3. Host Iteration
console.log('3. Host Iteration (first 5 hosts):');
let count = 0;
for (const host of network.hosts()) {
  console.log(`Host: ${host.toString()}`);
  if (++count >= 5) break;
}
console.log('...\n');

// 4. Subnetting
console.log('4. Subnetting /24 into /26 subnets (generator):');
const ipv4Network = network as CIDR<4>;
let idx = 0;
for (const subnet of ipv4Network.subnets(26)) {
  console.log(`Subnet ${++idx}: ${subnet.toString()}`);
}
// Avoid Array.from(...) on very large networks — prefer the generator above.
console.log();

// 5. IP Ranges
console.log('5. IP Ranges:');
const ipv4Range = IPRange.parse('192.168.1.10 - 192.168.1.20') as IPRange<4>;
console.log(`Range: ${ipv4Range.toString()}`);
console.log(`Size: ${ipv4Range.size()}`);
console.log(`Contains 192.168.1.15: ${ipv4Range.contains(ip('192.168.1.15'))}`);
console.log(
  `To CIDRs: ${ipv4Range
    .toCIDRs()
    .map((c) => c.toString())
    .join(', ')}\n`
);

// 6. IPv6 Examples
console.log('6. IPv6 Examples:');
const v6cidr = cidr('2001:db8::/32');
console.log(`IPv6 CIDR: ${v6cidr.toString()}`);
console.log(`Size: ${v6cidr.size()} addresses`);
console.log(`Network: ${v6cidr.network().toString()}\n`);
console.log();

// Demonstrate firstHost()/lastHost() semantics (IPv4)
console.log('First/Last host semantics for IPv4 /24:');
console.log(`First host (default): ${ipv4Network.firstHost().toString()}`);
console.log(`Last host (default): ${ipv4Network.lastHost().toString()}`);
console.log(
  `First host (includeEdges=true): ${ipv4Network.firstHost({ includeEdges: true }).toString()}`
);
console.log();

// 8. Allocator demonstration
console.log('8. Allocator demonstration:');
const allocator = new Allocator(ipv4Network);
const allocated = allocator.allocateNext();
console.log(`Allocated IP: ${allocated?.toString()}`);
console.log(`Available IPs: ${allocator.availableCount()}`);
console.log(`Utilization: ${(allocator.utilization() * 100).toFixed(1)}%`);
console.log();

// 7. Error Handling
console.log('7. Error Handling:');
try {
  IPv4.parse('256.1.1.1'); // Invalid
} catch (error) {
  if (error instanceof Error) {
    console.log(`Parse error: ${error.message}`);
  } else {
    console.log('Parse error:', error);
  }
}

try {
  CIDR.parse('192.168.1.0/33'); // Invalid prefix
} catch (error) {
  if (error instanceof Error) {
    console.log(`CIDR error: ${error.message}`);
  } else {
    console.log('CIDR error:', error);
  }
}

console.log('\n=== Examples Complete ===');
