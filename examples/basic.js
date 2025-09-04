#!/usr/bin/env node

/**
 * IP Toolkit Examples
 * Run with: node examples/basic.js
 *
 * For detailed explanations of the underlying mathematics and BigInt calculations,
 * see: ../docs/IP_CALCULATIONS.md
 */

import { IPv4, IPv6, CIDR, IPRange, RangeSet, Allocator, RadixTrie } from '../dist/index.js';

console.log('=== IP Toolkit Examples ===\n');

// Basic IP operations
console.log('1. Basic IP Operations:');
const ipv4 = IPv4.parse('192.168.1.100');
const ipv6 = IPv6.parse('2001:db8::1');
console.log(`IPv4: ${ipv4.toString()}`);
console.log(`IPv6: ${ipv6.toString()}\n`);

// CIDR operations
console.log('2. CIDR Operations:');
const cidr = CIDR.parse('192.168.1.0/24');
console.log(`CIDR: ${cidr.toString()}`);
console.log(`Network: ${cidr.network().toString()}`);
console.log(`Broadcast: ${cidr.broadcast().toString()}`);
console.log(`Size: ${cidr.size()} addresses`);
console.log(`Contains 192.168.1.50: ${cidr.contains(IPv4.parse('192.168.1.50'))}\n`);

// Subnetting (generator example)
console.log('4a. Subnetting /24 into /26 subnets (generator):');
let idx = 0;
for (const s of cidr.subnets(26)) {
  console.log(`Subnet ${++idx}: ${s.toString()}`);
}
console.log();

// Range operations
console.log('3. IP Range Operations:');
const range = IPRange.parse('192.168.1.10 - 192.168.1.20');
console.log(`Range: ${range.toString()}`);
console.log(`Size: ${range.size()} addresses`);
console.log(`Contains 192.168.1.15: ${range.contains(IPv4.parse('192.168.1.15'))}`);
console.log(
  `Minimal CIDRs: ${range
    .toCIDRs()
    .map((c) => c.toString())
    .join(', ')}\n`
);

// Range set operations
console.log('4. Range Set Operations:');
const set1 = RangeSet.fromCIDRs(['192.168.1.0/25', '192.168.2.0/24']);
const set2 = RangeSet.fromCIDRs(['192.168.1.128/25']);
const union = set1.union(set2);
console.log(`Set 1 size: ${set1.size()}`);
console.log(`Set 2 size: ${set2.size()}`);
console.log(`Union size: ${union.size()}`);
console.log(
  `Union as CIDRs: ${union
    .toCIDRs()
    .map((c) => c.toString())
    .join(', ')}\n`
);

// IP allocation
console.log('5. IP Address Allocation:');
const parent = CIDR.parse('192.168.1.0/24');
const allocator = new Allocator(parent);
const allocatedIP = allocator.allocateNext();
const freeBlocks = allocator.freeBlocks({ minPrefix: 25 });
console.log(`Parent CIDR: ${parent.toString()}`);
console.log(`Allocated IP: ${allocatedIP?.toString()}`);
console.log(`Available IPs: ${allocator.availableCount()}`);
console.log(`Utilization: ${(allocator.utilization() * 100).toFixed(1)}%`);
console.log(`Free /25 blocks: ${freeBlocks.length}\n`);

// Demonstrate first/last host semantics for the parent CIDR
console.log('First host (default):', parent.firstHost().toString());
console.log('Last host (default):', parent.lastHost().toString());
console.log('First host (includeEdges=true):', parent.firstHost({ includeEdges: true }).toString());

// Longest prefix matching
console.log('6. Longest Prefix Matching:');
const trie = new RadixTrie(4);
trie.insert(CIDR.parse('0.0.0.0/0'), 'default');
trie.insert(CIDR.parse('192.168.0.0/16'), 'private');
trie.insert(CIDR.parse('192.168.1.0/24'), 'subnet-1');

const lookupIP = IPv4.parse('192.168.1.50');
const match = trie.longestMatch(lookupIP);
console.log(`Lookup IP: ${lookupIP.toString()}`);
console.log(`Best match: ${match?.cidr.toString()} -> ${match?.value}`);
console.log(`Total routes: ${trie.size()}\n`);

console.log('=== All Examples Completed Successfully! ===');
