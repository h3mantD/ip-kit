/**
 * RangeSet - Normalized interval set for IP ranges.
 * Provides set operations (union, intersect, subtract) on IP address ranges.
 */

import { IP, IPv4, IPv6, IPVersion } from './ip';
import { InvariantError } from '../core/errors';
import { CIDR } from './cidr';
import { IPRange } from './range';

export class RangeSet<V extends IPVersion = IPVersion> {
  private readonly ranges: IPRange<V>[] = [];

  private constructor(ranges: IPRange<V>[]) {
    this.ranges = ranges;
  }

  /**
   * Return a shallow copy of internal ranges array.
   */
  toArray(): IPRange<V>[] {
    return [...this.ranges];
  }

  /**
   * Create a RangeSet from CIDR blocks.
   */
  static fromCIDRs<V extends IPVersion>(cidrs: Array<CIDR<V> | string>): RangeSet<V> {
    if (!cidrs || cidrs.length === 0) return new RangeSet([]);
    const ranges: IPRange<V>[] = [];
    let version: V | undefined;
    for (const cidr of cidrs) {
      const cidrObj = typeof cidr === 'string' ? CIDR.parse(cidr) : cidr;
      if (version === undefined) {
        version = cidrObj.version as V;
      } else if (cidrObj.version !== version) {
        throw new InvariantError('Mixed IP versions in CIDR list');
      }
      ranges.push(cidrObj.toRange() as IPRange<V>);
    }
    return new RangeSet(this.normalize(ranges));
  }

  /**
   * Create a RangeSet from IP ranges.
   */
  static fromRanges<V extends IPVersion>(ranges: Array<IPRange<V>>): RangeSet<V> {
    if (!ranges || ranges.length === 0) return new RangeSet([]);
    const version = ranges[0].version;
    for (const r of ranges) {
      if (r.version !== version) throw new InvariantError('Mixed IP versions in ranges');
    }
    return new RangeSet(this.normalize([...ranges]));
  }

  /**
   * Check if the RangeSet is empty.
   */
  isEmpty(): boolean {
    return this.ranges.length === 0;
  }

  /**
   * Get the total size (number of addresses) in the RangeSet.
   */
  size(): bigint {
    return this.ranges.reduce((total, range) => total + range.size(), 0n);
  }

  /**
   * Union this RangeSet with another.
   */
  union(other: RangeSet<V>): RangeSet<V> {
    const allRanges = [...this.ranges, ...other.ranges];
    return new RangeSet(RangeSet.normalize(allRanges));
  }

  /**
   * Intersect this RangeSet with another.
   */
  intersect(other: RangeSet<V>): RangeSet<V> {
    const result: IPRange<V>[] = [];

    for (const rangeA of this.ranges) {
      for (const rangeB of other.ranges) {
        if (rangeA.overlaps(rangeB)) {
          const startValue =
            rangeA.start.toBigInt() > rangeB.start.toBigInt()
              ? rangeA.start.toBigInt()
              : rangeB.start.toBigInt();
          const endValue =
            rangeA.end.toBigInt() < rangeB.end.toBigInt()
              ? rangeA.end.toBigInt()
              : rangeB.end.toBigInt();

          if (startValue <= endValue) {
            const ipStart = this.createIPFromBigInt(startValue);
            const ipEnd = this.createIPFromBigInt(endValue);
            result.push(this.createRangeFromIPs(ipStart, ipEnd));
          }
        }
      }
    }

    return new RangeSet(RangeSet.normalize(result));
  }

  /**
   * Subtract another RangeSet from this one.
   */
  subtract(other: RangeSet<V>): RangeSet<V> {
    let result = [...this.ranges];

    for (const otherRange of other.ranges) {
      result = this.subtractSingleRange(result, otherRange);
    }

    return new RangeSet(RangeSet.normalize(result));
  }

  /**
   * Helper method to subtract a single range from a list of ranges.
   */
  private subtractSingleRange(ranges: IPRange<V>[], otherRange: IPRange<V>): IPRange<V>[] {
    const newResult: IPRange<V>[] = [];

    for (const currentRange of ranges) {
      if (!currentRange.overlaps(otherRange)) {
        newResult.push(currentRange);
      } else {
        // Split the current range around the other range
        const currentStart = currentRange.start.toBigInt();
        const currentEnd = currentRange.end.toBigInt();
        const otherStart = otherRange.start.toBigInt();
        const otherEnd = otherRange.end.toBigInt();

        // Left part: before other range
        if (currentStart < otherStart) {
          const leftEnd = otherStart - 1n;
          if (leftEnd >= currentStart) {
            const ipStart = this.createIPFromBigInt(currentStart);
            const ipEnd = this.createIPFromBigInt(leftEnd);
            newResult.push(this.createRangeFromIPs(ipStart, ipEnd));
          }
        }

        // Right part: after other range
        if (currentEnd > otherEnd) {
          const rightStart = otherEnd + 1n;
          if (rightStart <= currentEnd) {
            const ipStart = this.createIPFromBigInt(rightStart);
            const ipEnd = this.createIPFromBigInt(currentEnd);
            newResult.push(this.createRangeFromIPs(ipStart, ipEnd));
          }
        }
      }
    }

    return newResult;
  }

  /**
   * Helper method to create IP from BigInt based on version.
   */
  private createIPFromBigInt(value: bigint): IP<V> {
    return (
      this.ranges[0]?.version === 4 ? IPv4.fromBigInt(value) : IPv6.fromBigInt(value)
    ) as IP<V>;
  }

  /**
   * Helper method to create IPRange from IPs.
   */
  private createRangeFromIPs(start: IP<V>, end: IP<V>): IPRange<V> {
    if (start.version === 4) {
      return IPRange.from(start as IPv4, end as IPv4) as IPRange<V>;
    } else {
      return IPRange.from(start as IPv6, end as IPv6) as IPRange<V>;
    }
  }

  /**
   * Convert the RangeSet to minimal CIDR blocks.
   */
  toCIDRs(): CIDR<V>[] {
    const cidrs: CIDR<V>[] = [];

    for (const range of this.ranges) {
      cidrs.push(...range.toCIDRs());
    }

    return cidrs;
  }

  /**
   * Check if this RangeSet contains an IP address.
   */
  contains(ip: IP<V>): boolean {
    return this.ranges.some((range) => range.contains(ip));
  }

  /**
   * Check if this RangeSet contains a CIDR block.
   */
  containsCIDR(cidr: CIDR<V>): boolean {
    const cidrRange = cidr.toRange();
    // Check if every IP in the CIDR is contained in this RangeSet
    const cidrStart = cidrRange.start.toBigInt();
    const cidrEnd = cidrRange.end.toBigInt();

    for (const range of this.ranges) {
      const rangeStart = range.start.toBigInt();
      const rangeEnd = range.end.toBigInt();

      // If the CIDR is completely within this range, return true
      if (cidrStart >= rangeStart && cidrEnd <= rangeEnd) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get all IP addresses in the RangeSet (with optional limit).
   */
  *ips(limit?: number): Generator<IP<V>, void, unknown> {
    let count = 0;
    for (const range of this.ranges) {
      for (const ip of range.ips(limit ? limit - count : undefined)) {
        if (limit !== undefined && count >= limit) {
          return;
        }
        yield ip as IP<V>;
        count++;
      }
    }
  }

  /**
   * Normalize ranges by merging overlapping/adjacent ranges.
   */
  private static normalize<V extends IPVersion>(ranges: IPRange<V>[]): IPRange<V>[] {
    if (ranges.length === 0) return [];

    // Sort ranges by start IP
    const sorted = [...ranges].sort((a, b) => {
      const aStart = a.start.toBigInt();
      const bStart = b.start.toBigInt();
      if (aStart < bStart) return -1;
      if (aStart > bStart) return 1;
      return 0;
    });

    const result: IPRange<V>[] = [sorted[0]];

    for (let i = 1; i < sorted.length; i++) {
      const current = sorted[i];
      const last = result[result.length - 1];

      if (current.overlaps(last) || current.start.toBigInt() === last.end.toBigInt() + 1n) {
        // Merge overlapping or adjacent ranges
        const mergedEnd =
          current.end.toBigInt() > last.end.toBigInt()
            ? current.end.toBigInt()
            : last.end.toBigInt();
        const ipEnd =
          current.version === 4 ? IPv4.fromBigInt(mergedEnd) : IPv6.fromBigInt(mergedEnd);

        if (current.version === 4) {
          result[result.length - 1] = IPRange.from(last.start as IPv4, ipEnd as IPv4) as IPRange<V>;
        } else {
          result[result.length - 1] = IPRange.from(last.start as IPv6, ipEnd as IPv6) as IPRange<V>;
        }
      } else {
        result.push(current);
      }
    }

    return result;
  }

  /**
   * Get string representation of the RangeSet.
   */
  toString(): string {
    return this.ranges.map((range) => range.toString()).join(', ');
  }
}
