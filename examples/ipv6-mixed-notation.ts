/**
 * IPv6 Mixed Notation Examples
 *
 * Demonstrates parsing and formatting of IPv6 addresses with dotted-decimal
 * IPv4 tails (RFC 4291 §2.5.5.2), including IPv4-mapped and IPv4-compatible
 * IPv6 addresses.
 *
 * Run with: npx tsx examples/ipv6-mixed-notation.ts
 */

import { ip, IPv6, CIDR } from '../src/index';

console.log('=== IPv6 Mixed Notation Examples ===\n');

// ============================================================================
// 1. IPv4-Mapped IPv6 Addresses (::ffff:0:0/96)
// ============================================================================
console.log('1. IPv4-Mapped IPv6 Addresses (::ffff:x.x.x.x)');
console.log('   Used for dual-stack applications to represent IPv4 as IPv6\n');

// Parse various forms - all result in the same address
const mapped1 = ip('::ffff:192.0.2.128');
const mapped2 = ip('::FFFF:192.0.2.128'); // Case insensitive
const mapped3 = ip('0:0:0:0:0:ffff:192.0.2.128'); // Full form

console.log(`  Compressed:    ${mapped1.toString()}`);
console.log(`  Uppercase:     ${mapped2.toString()}`);
console.log(`  Full form:     ${mapped3.toString()}`);
console.log(`  All equal:     ${mapped1.equals(mapped2) && mapped2.equals(mapped3)}`);
console.log();

// Conversion to other formats
const mappedIP = ip('::ffff:192.168.1.100');
console.log(`  Address:       ${mappedIP.toString()}`);
console.log(`  BigInt:        ${mappedIP.toBigInt()}n`);
console.log(`  Bytes:         [${Array.from(mappedIP.toBytes()).join(', ')}]`);
console.log();

// Edge cases
const mappedMin = ip('::ffff:0.0.0.0');
const mappedMax = ip('::ffff:255.255.255.255');
console.log(`  Min (0.0.0.0):        ${mappedMin.toString()}`);
console.log(`  Max (255.255.255.255): ${mappedMax.toString()}`);
console.log();

// ============================================================================
// 2. IPv4-Compatible IPv6 Addresses (::/96, deprecated but supported)
// ============================================================================
console.log('2. IPv4-Compatible IPv6 Addresses (::x.x.x.x)');
console.log('   Deprecated (RFC 4291), but still parsed and formatted\n');

const compatible = ip('::192.0.2.1');
console.log(`  Address:       ${compatible.toString()}`);
console.log(`  BigInt:        ${compatible.toBigInt()}n`);
console.log();

// Special cases - preserve standard notation
const loopback = ip('::1');
const unspecified = ip('::');
console.log(`  ::1 (loopback):       ${loopback.toString()}`);
console.log(`  :: (unspecified):     ${unspecified.toString()}`);
console.log('  (Not displayed as ::0.0.0.1 or ::0.0.0.0)\n');

// ============================================================================
// 3. Custom Prefixes with Mixed Notation
// ============================================================================
console.log('3. Custom Prefixes with Mixed Notation');
console.log('   Parsed correctly, but output as standard hex\n');

const custom1 = ip('2001:db8:1:1:1:1:192.168.0.10');
const custom2 = ip('64:ff9b::192.0.2.1'); // Well-Known Prefix for IPv4/IPv6 translation

console.log(`  Input:  2001:db8:1:1:1:1:192.168.0.10`);
console.log(`  Output: ${custom1.toString()} (hex notation)`);
console.log();
console.log(`  Input:  64:ff9b::192.0.2.1`);
console.log(`  Output: ${custom2.toString()} (hex notation)`);
console.log();

// ============================================================================
// 4. CIDR Operations with Mixed Notation
// ============================================================================
console.log('4. CIDR Operations with IPv4-Mapped Addresses\n');

const mappedNetwork = CIDR.parse('::ffff:192.168.1.0/120');
console.log(`  Network:       ${mappedNetwork.toString()}`);
console.log(`  Network addr:  ${mappedNetwork.network().toString()}`);
console.log(`  Size:          ${mappedNetwork.size()} addresses`);
console.log();

// Check containment
const testIP1 = ip('::ffff:192.168.1.50');
const testIP2 = ip('::ffff:192.168.2.1');
console.log(`  Contains ::ffff:192.168.1.50? ${mappedNetwork.contains(testIP1)}`);
console.log(`  Contains ::ffff:192.168.2.1?  ${mappedNetwork.contains(testIP2)}`);
console.log();

// Iterate first few hosts
console.log('  First 5 hosts:');
let count = 0;
for (const host of mappedNetwork.hosts()) {
  console.log(`    ${host.toString()}`);
  if (++count >= 5) break;
}
console.log();

// ============================================================================
// 5. Validation Examples
// ============================================================================
console.log('5. Validation - Invalid Input Examples\n');

const invalidCases = [
  ['::ffff:256.1.1.1', 'Octet > 255'],
  ['::192.168.1', 'Incomplete IPv4 (3 octets)'],
  ['::192.168.1.1.1', 'Too many octets (5)'],
  ['::192.168.01.1', 'Leading zeros not allowed'],
  ['::192.168.-1.1', 'Negative octet'],
  ['::192.168..1.1', 'Double dot'],
  [':::192.168.1.1', 'Triple colon'],
  ['::1::192.168.1.1', 'Multiple :: compressions'],
  ['1:2:3:4:5:6:7:192.168.1.1', 'Too many groups (7+2=9)'],
];

invalidCases.forEach(([input, reason]) => {
  try {
    ip(input as string);
    console.log(`  ✗ ${input.padEnd(30)} - Should have failed (${reason})`);
  } catch (e: any) {
    console.log(`  ✓ ${input.padEnd(30)} - Rejected: ${reason}`);
  }
});
console.log();

// ============================================================================
// 6. Practical Use Case: Dual-Stack Server
// ============================================================================
console.log('6. Practical Use Case: Dual-Stack Server Connection Mapping\n');

interface Connection {
  clientIP: string;
  ipVersion: number;
  originalIPv4?: string;
}

function analyzeConnection(ipStr: string): Connection {
  const addr = ip(ipStr);
  const conn: Connection = {
    clientIP: addr.toString(),
    ipVersion: addr.version,
  };

  // Check if it's an IPv4-mapped IPv6 address
  if (addr.version === 6) {
    const bigintVal = addr.toBigInt();
    const ipv4MappedPrefix = 0x0000_0000_0000_0000_0000_ffff_0000_0000n;
    const prefixMask = 0xffff_ffff_ffff_ffff_ffff_ffff_0000_0000n;

    if ((bigintVal & prefixMask) === ipv4MappedPrefix) {
      // Extract IPv4 part
      const ipv4Val = Number(bigintVal & 0xffffffffn);
      const oct1 = (ipv4Val >>> 24) & 0xff;
      const oct2 = (ipv4Val >>> 16) & 0xff;
      const oct3 = (ipv4Val >>> 8) & 0xff;
      const oct4 = ipv4Val & 0xff;
      conn.originalIPv4 = `${oct1}.${oct2}.${oct3}.${oct4}`;
    }
  }

  return conn;
}

// Test the function
const connections = [
  '192.168.1.100',
  '::ffff:192.168.1.100',
  '2001:db8::1',
  '::ffff:203.0.113.42',
];

connections.forEach((addr) => {
  const conn = analyzeConnection(addr);
  console.log(`  Client: ${conn.clientIP.padEnd(25)} IPv${conn.ipVersion}${conn.originalIPv4 ? ` (from IPv4: ${conn.originalIPv4})` : ''}`);
});
console.log();

// ============================================================================
// 7. Round-Trip Integrity
// ============================================================================
console.log('7. Round-Trip Integrity (parse → toString → parse)\n');

const testAddresses = [
  '::ffff:192.0.2.128',
  '::13.1.68.3',
  '0:0:0:0:0:ffff:129.144.52.38',
  '::FFFF:255.255.255.255',
];

testAddresses.forEach((addr) => {
  const parsed1 = ip(addr);
  const str = parsed1.toString();
  const parsed2 = ip(str);

  const match = parsed1.equals(parsed2);
  console.log(`  ${addr.padEnd(35)} → ${str.padEnd(25)} → ${match ? '✓' : '✗'}`);
});
console.log();

console.log('=== All examples completed successfully! ===');
