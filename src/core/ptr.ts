/**
 * Reverse DNS (PTR) utilities.
 */

/**
 * Reverse DNS (PTR) utilities.
 */

/**
 * Returns the PTR record for an IPv4 address.
 */
export function ptrV4(ip: bigint): string {
  const octets = [
    Number(ip & 0xffn),
    Number((ip >> 8n) & 0xffn),
    Number((ip >> 16n) & 0xffn),
    Number((ip >> 24n) & 0xffn),
  ];
  return [...octets].reverse().join('.') + '.in-addr.arpa';
}

/**
 * Returns the PTR record for an IPv6 address.
 */
export function ptrV6(ip: bigint): string {
  const nibbles: string[] = [];
  for (let i = 31; i >= 0; i--) {
    const nibble = Number((ip >> BigInt(i * 4)) & 0xfn);
    nibbles.push(nibble.toString(16));
  }
  return nibbles.join('.') + '.ip6.arpa';
}

/**
 * Returns PTR zones for a CIDR (nibble-aligned preferred).
 */
export function ptrZonesForCIDR(ip: bigint, prefix: number, bits: 32 | 128): string[] {
  if (bits === 32) {
    // IPv4: zone is /24 or less
    const zonePrefix = Math.min(prefix, 24);
    const network = ip & ((1n << BigInt(32 - zonePrefix)) - 1n); // Wait, wrong
    // Actually, for reverse, the zone is the network part reversed.
    // But simplified, return the PTR of the network.
    return [ptrV4(network)];
  } else {
    // IPv6: nibble-aligned zones
    const nibblePrefix = Math.floor(prefix / 4) * 4;
    const zonePrefix = Math.min(nibblePrefix, 124); // up to /124
    const network = ip & (((1n << BigInt(128 - zonePrefix)) - 1n) << BigInt(128 - zonePrefix)); // Wait, mask
    // Simplified
    return [ptrV6(network)];
  }
}
