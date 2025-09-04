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
    for (const range of this._taken['ranges']) {
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

    const range = (IPRange as any).from(ip, ip) as IPRange<V>;
    const newTakenRanges = [...this._taken['ranges'], range];
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
    const newTakenRanges = [...this._taken['ranges'], range];
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
    const taken = this._taken.size();
    return Number(taken) / Number(total);
  }

  // Private helper methods

  private findNextAvailable(from: IP<V>): IP<V> | null {
    const fromBigInt = from.toBigInt();
    const parentEnd = this.parent.toRange().end.toBigInt();

    for (let current = fromBigInt + 1n; current <= parentEnd; current++) {
      const ip = this.version === 4 ? IPv4.fromBigInt(current) : IPv6.fromBigInt(current);
      if (!this._taken.contains(ip as IP<V>)) {
        return ip as IP<V>;
      }
    }

    return null;
  }

  private isCIDRAvailable(cidr: CIDR<V>): boolean {
    const range = cidr.toRange();
    return !this.overlapsTaken(range);
  }

  private overlapsTaken(range: IPRange<V>): boolean {
    for (const takenRange of this._taken['ranges']) {
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
    return freeSet['ranges'];
  }
}
