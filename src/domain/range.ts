/**
 * IP range classes.
 */

import { IP, IPv4, IPv6, IPVersion } from './ip';
import { CIDR } from './cidr';
import { ParseError, VersionMismatchError } from '../core/errors';

export class IPRange<V extends IPVersion = IPVersion> {
  readonly start: V extends 4 ? IPv4 : IPv6;
  readonly end: V extends 4 ? IPv4 : IPv6;
  readonly version: V;

  private constructor(
    start: V extends 4 ? IPv4 : IPv6,
    end: V extends 4 ? IPv4 : IPv6,
    version: V
  ) {
    this.start = start;
    this.end = end;
    this.version = version;
  }

  static parse(s: string): IPRange<4> | IPRange<6> {
    const parts = s.split('-');
    if (parts.length !== 2) {
      throw new ParseError(`Invalid range format: ${s}`);
    }
    const startStr = parts[0].trim();
    const endStr = parts[1].trim();
    if (IP.isIPv4(startStr) && IP.isIPv4(endStr)) {
      const start = IPv4.parse(startStr);
      const end = IPv4.parse(endStr);
      if (start.toBigInt() > end.toBigInt()) {
        throw new ParseError('Start IP must be less than or equal to end IP');
      }
      return new IPRange(start, end, 4);
    } else if (IP.isIPv6(startStr) && IP.isIPv6(endStr)) {
      const start = IPv6.parse(startStr);
      const end = IPv6.parse(endStr);
      if (start.toBigInt() > end.toBigInt()) {
        throw new ParseError('Start IP must be less than or equal to end IP');
      }
      return new IPRange(start, end, 6);
    } else {
      throw new ParseError(`Mismatched IP versions in range: ${s}`);
    }
  }

  static from(start: IPv4, end: IPv4): IPRange<4>;
  static from(start: IPv6, end: IPv6): IPRange<6>;
  static from(start: IP, end: IP): IPRange {
    if (start.version !== end.version) {
      throw new VersionMismatchError('IP versions must match');
    }
    if (start.toBigInt() > end.toBigInt()) {
      throw new ParseError('Start IP must be less than or equal to end IP');
    }
    if (start instanceof IPv4) {
      return new IPRange(start, end as IPv4, 4);
    } else {
      return new IPRange(start as IPv6, end as IPv6, 6);
    }
  }

  size(): bigint {
    return this.end.toBigInt() - this.start.toBigInt() + 1n;
  }

  overlaps(other: IPRange<V>): boolean {
    if (other.version !== this.version) return false;
    return !(
      this.end.toBigInt() < other.start.toBigInt() || this.start.toBigInt() > other.end.toBigInt()
    );
  }

  contains(ip: IP): boolean {
    if (ip.version !== this.version) return false;
    const ipVal = ip.toBigInt();
    return ipVal >= this.start.toBigInt() && ipVal <= this.end.toBigInt();
  }

  *ips(limit?: number): Generator<typeof this.start, void, unknown> {
    let addr = this.start.toBigInt();
    const end = this.end.toBigInt();
    let count = 0;
    while (addr <= end) {
      if (limit !== undefined && count >= limit) break;
      if (this.version === 4) {
        yield IPv4.fromBigInt(addr) as typeof this.start;
      } else {
        yield IPv6.fromBigInt(addr) as typeof this.start;
      }
      addr++;
      count++;
    }
  }

  toCIDRs(): CIDR<V>[] {
    // Simple implementation: return a single CIDR if possible, else multiple
    // For now, just return the minimal CIDR that covers the range
    // This is a placeholder; full implementation would find minimal cover
    const start = this.start.toBigInt();
    const end = this.end.toBigInt();
    const size = end - start + 1n;
    // Find the largest power of 2 that fits
    let prefix = 0;
    let blockSize = 1n;
    while (blockSize * 2n <= size) {
      blockSize *= 2n;
      prefix++;
    }
    const bits = this.version === 4 ? 32 : 128;
    const cidrPrefix = bits - prefix;
    // Align start to the block
    const alignedStart = (start / blockSize) * blockSize;
    const ip = this.version === 4 ? IPv4.fromBigInt(alignedStart) : IPv6.fromBigInt(alignedStart);
    return [CIDR.from(ip as any, cidrPrefix) as CIDR<V>];
  }

  toString(): string {
    return `${this.start.toString()}-${this.end.toString()}`;
  }
}
