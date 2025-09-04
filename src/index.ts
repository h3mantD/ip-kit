// Public exports for IP Toolkit

export { IP, IPv4, IPv6, IPVersion } from './domain/ip';
export { CIDR } from './domain/cidr';
export { IPRange } from './domain/range';
export { RangeSet } from './domain/rangeset';
export { Allocator } from './domain/allocator';
export { RadixTrie } from './domain/trie';

// Factory functions
import { IP, IPv4, IPv6 } from './domain/ip';
import { CIDR } from './domain/cidr';

export function ip(input: string | number | bigint | Uint8Array): IPv4 | IPv6 {
  if (typeof input === 'string') {
    if (IP.isIPv4(input)) return IPv4.parse(input);
    if (IP.isIPv6(input)) return IPv6.parse(input);
  }
  // For other types, try IPv4 first
  try {
    return IPv4.parse(input as any);
  } catch {
    return IPv6.parse(input as any);
  }
}

export function cidr(input: string): CIDR<4> | CIDR<6> {
  return CIDR.parse(input);
}
