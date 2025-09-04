/**
 * Reverse DNS (PTR) utilities.
 */

/**
 * Reverse DNS (PTR) utilities.
 */

/**
 * Returns the PTR record for an IPv4 address.
 */
import { prefixMask } from './bigint';

export function ptrV4(ip: bigint): string {
  const octets = [
    Number(ip & 0xffn),
    Number((ip >> 8n) & 0xffn),
    Number((ip >> 16n) & 0xffn),
    Number((ip >> 24n) & 0xffn),
  ];
  // Least significant octet first (already in LSB..MSB order)
  return octets.join('.') + '.in-addr.arpa';
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
    // IPv4: prefer /24 zone or the prefix specified
    const zonePrefix = Math.min(prefix, 24);
    // Compute network for the zone
    const zoneMask = prefixMask(zonePrefix, 32);
    const network = ip & zoneMask;
    // For an IPv4 zone, ptrV4(network) returns the full reverse; caller can interpret
    return [ptrV4(network)];
  } else {
    // IPv6: nibble-aligned zones. Round prefix down to a multiple of 4
    const nibblePrefix = Math.floor(prefix / 4) * 4;
    const zonePrefix = Math.min(nibblePrefix, 124); // up to /124 usually
    // Build nibbles for the network and truncate to zonePrefix nibbles
    const nibbles: string[] = [];
    for (let i = 0; i < 32; i++) {
      const nib = Number((ip >> BigInt((31 - i) * 4)) & 0xfn);
      nibbles.push(nib.toString(16));
    }
    const usedNibbles = Math.floor(zonePrefix / 4); // number of nibbles covered by zonePrefix
    const zone =
      (usedNibbles === 0 ? '' : nibbles.slice(0, usedNibbles).reverse().join('.') + '.') +
      'ip6.arpa';
    return [zone];
  }
}
