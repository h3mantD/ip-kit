/**
 * IP address allocation classes.
 */

import { IP, IPv4, IPv6, IPVersion } from './ip';
import { CIDR } from './cidr';
import { IPRange } from './range';
import { RangeSet } from './rangeset';
import { ParseError } from '../core/errors';

export class Allocator<V extends IPVersion = IPVersion> {
  readonly parent: CIDR<V>;
  private _taken: RangeSet<V>;
  readonly version: V;

  constructor(parent: CIDR<V>, taken?: RangeSet<V>) {
    this.parent = parent;
    this._taken = taken || RangeSet.fromRanges<V>([]);
    this.version = parent.version;

    // Validate that all taken ranges are within the parent
    for (const range of this._taken.toArray()) {
      if (!parent.contains(range.start) || !parent.contains(range.end)) {
        throw new ParseError('Taken ranges must be within the parent CIDR');
      }
    }
  }

  get taken(): RangeSet<V> {
    return this._taken;
  }

  /**
   * Find the next available IP address starting from the given IP.
   */
  nextAvailable(from?: IP<V>): IP<V> | null {
    const startIp = from || this.parent.firstHost();

    // If the start IP is already taken, find the next one
    if (this._taken.contains(startIp as IP<V>)) {
      return this.findNextAvailable(startIp as IP<V>);
    }

    // Check if the start IP is within the parent range
    if (!this.parent.contains(startIp)) {
      return null;
    }

    return startIp as IP<V>;
  }

  /**
   * Allocate the next available IP address.
   */
  allocateNext(): IP<V> | null {
    const next = this.nextAvailable();
    if (next) {
      this.allocateIP(next);
    }
    return next;
  }

  /**
   * Allocate a specific IP address.
   */
  allocateIP(ip: IP<V>): boolean {
    if (!this.parent.contains(ip) || this._taken.contains(ip)) {
      return false;
    }

    let range: IPRange<V>;
    if (this.version === 4) {
      range = IPRange.from(ip as IPv4, ip as IPv4) as IPRange<V>;
    } else {
      range = IPRange.from(ip as IPv6, ip as IPv6) as IPRange<V>;
    }
    const newTakenRanges = [...this._taken.toArray(), range];
    this._taken = RangeSet.fromRanges(newTakenRanges);
    return true;
  }

  /**
   * Allocate a CIDR block.
   */
  allocateCIDR(cidr: CIDR<V>): boolean {
    if (cidr.version !== this.version || !this.parent.contains(cidr.network())) {
      return false;
    }

    // Check if the entire CIDR is available
    if (!this.isCIDRAvailable(cidr)) {
      return false;
    }

    const range = cidr.toRange();
    const newTakenRanges = [...this._taken.toArray(), range];
    this._taken = RangeSet.fromRanges(newTakenRanges);
    return true;
  }

  /**
   * Find all free blocks of at least the minimum prefix length.
   */
  freeBlocks(opts?: { minPrefix?: number; maxResults?: number }): CIDR<V>[] {
    const minPrefix = opts?.minPrefix ?? this.parent.prefix;
    const maxResults = opts?.maxResults ?? 100;

    const freeRanges = this.getFreeRanges();
    const result: CIDR<V>[] = [];

    for (const range of freeRanges) {
      if (result.length >= maxResults) break;

      const cidrs = range.toCIDRs();
      for (const cidr of cidrs) {
        if (cidr.prefix >= minPrefix) {
          result.push(cidr);
          if (result.length >= maxResults) break;
        }
      }
    }

    return result;
  }

  /**
   * Get the total number of available IP addresses.
   */
  availableCount(): bigint {
    const freeRanges = this.getFreeRanges();
    return freeRanges.reduce((sum, range) => sum + range.size(), 0n);
  }

  /**
   * Get the utilization percentage (0.0 to 1.0).
   */
  utilization(): number {
    const total = this.parent.size();
    let taken = this._taken.size();

    // If total is small enough, do a direct conversion.
    const maxSafe = BigInt(Number.MAX_SAFE_INTEGER);
    if (total <= maxSafe) {
      return Number(taken) / Number(total);
    }

    // Scale both down by right-shifting until total fits into Number.MAX_SAFE_INTEGER.
    // This preserves the ratio approximately and avoids converting huge BigInts to Number.
    let scaledTotal = total;
    let scaledTaken = taken;
    while (scaledTotal > maxSafe) {
      scaledTotal >>= 1n;
      scaledTaken >>= 1n;
    }

    if (scaledTotal === 0n) return 0;
    return Number(scaledTaken) / Number(scaledTotal);
  }

  // Private helper methods

  private findNextAvailable(from: IP<V>): IP<V> | null {
    // Efficient approach: iterate free ranges and pick first address after `from`.
    const fromVal = from.toBigInt();
    const freeRanges = this.getFreeRanges();
    for (const r of freeRanges) {
      const start = r.start.toBigInt();
      const end = r.end.toBigInt();
      if (end < fromVal) continue;
      const candidate = start >= fromVal ? start : fromVal + 1n;
      if (candidate <= end) {
        return this.version === 4
          ? (IPv4.fromBigInt(candidate) as IP<V>)
          : (IPv6.fromBigInt(candidate) as IP<V>);
      }
    }

    return null;
  }

  private isCIDRAvailable(cidr: CIDR<V>): boolean {
    const range = cidr.toRange();
    return !this.overlapsTaken(range);
  }

  private overlapsTaken(range: IPRange<V>): boolean {
    for (const takenRange of this._taken.toArray()) {
      if (takenRange.overlaps(range)) {
        return true;
      }
    }
    return false;
  }

  private getFreeRanges(): IPRange<V>[] {
    const parentRange = this.parent.toRange();
    const parentRangeSet = RangeSet.fromRanges([parentRange]);
    const freeSet = parentRangeSet.subtract(this._taken);
    return freeSet.toArray();
  }
}
