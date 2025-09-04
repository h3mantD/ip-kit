/**
 * CIDR (Classless Inter-Domain Routing) classes.
 */

import { IP, IPv4, IPv6, IPVersion } from './ip';
import { IPRange } from './range';
import { ParseError } from '../core/errors';
import { networkOf, broadcastOf, prefixMask } from '../core/bigint';
import { ptrZonesForCIDR } from '../core/ptr';

export class CIDR<V extends IPVersion = IPVersion> {
  readonly ip: V extends 4 ? IPv4 : IPv6;
  readonly prefix: number;
  readonly version: V;

  private constructor(ip: V extends 4 ? IPv4 : IPv6, prefix: number, version: V) {
    this.ip = ip;
    this.prefix = prefix;
    this.version = version;
  }

  static parse(s: string): CIDR<4> | CIDR<6> {
    const parts = s.split('/');
    if (parts.length !== 2) {
      throw new ParseError(`Invalid CIDR format: ${s}`);
    }
    const ipStr = parts[0];
    const prefix = parseInt(parts[1], 10);
    if (isNaN(prefix)) {
      throw new ParseError(`Invalid prefix: ${parts[1]}`);
    }
    if (IP.isIPv4(ipStr)) {
      const ip = IPv4.parse(ipStr);
      if (prefix < 0 || prefix > 32) {
        throw new ParseError(`IPv4 prefix must be 0-32: ${prefix}`);
      }
      return new CIDR(ip, prefix, 4);
    } else if (IP.isIPv6(ipStr)) {
      const ip = IPv6.parse(ipStr);
      if (prefix < 0 || prefix > 128) {
        throw new ParseError(`IPv6 prefix must be 0-128: ${prefix}`);
      }
      return new CIDR(ip, prefix, 6);
    } else {
      throw new ParseError(`Invalid IP address: ${ipStr}`);
    }
  }

  static from(ip: IPv4, p: number): CIDR<4>;
  static from(ip: IPv6, p: number): CIDR<6>;
  static from(ip: IP, p: number): CIDR {
    if (ip instanceof IPv4) {
      if (p < 0 || p > 32) {
        throw new ParseError(`IPv4 prefix must be 0-32: ${p}`);
      }
      return new CIDR(ip, p, 4);
    } else if (ip instanceof IPv6) {
      if (p < 0 || p > 128) {
        throw new ParseError(`IPv6 prefix must be 0-128: ${p}`);
      }
      return new CIDR(ip, p, 6);
    } else {
      throw new ParseError('Invalid IP type');
    }
  }

  bits(): 32 | 128 {
    return this.version === 4 ? 32 : 128;
  }

  network(): typeof this.ip {
    const netValue = networkOf(this.ip.toBigInt(), this.prefix, this.bits());
    if (this.version === 4) {
      return IPv4.fromBigInt(netValue) as typeof this.ip;
    } else {
      return IPv6.fromBigInt(netValue) as typeof this.ip;
    }
  }

  broadcast(): IPv4 {
    if (this.version === 6) {
      throw new Error('Broadcast not supported for IPv6');
    }
    const bcValue = broadcastOf(this.ip.toBigInt(), this.prefix, 32);
    return IPv4.fromBigInt(bcValue);
  }

  size(): bigint {
    return 1n << BigInt(this.bits() - this.prefix);
  }

  firstHost(opts?: { includeEdges?: boolean }): typeof this.ip {
    const includeEdges = opts?.includeEdges ?? (this.version === 6 || this.prefix >= 31);
    if (!includeEdges && this.prefix >= (this.version === 4 ? 31 : 127)) {
      throw new Error('No hosts available');
    }
    const net = this.network().toBigInt();
    const first = includeEdges ? net : net + 1n;
    if (this.version === 4) {
      return IPv4.fromBigInt(first) as typeof this.ip;
    } else {
      return IPv6.fromBigInt(first) as typeof this.ip;
    }
  }

  lastHost(opts?: { includeEdges?: boolean }): typeof this.ip {
    const includeEdges = opts?.includeEdges ?? (this.version === 6 || this.prefix >= 31);
    if (!includeEdges && this.prefix >= (this.version === 4 ? 31 : 127)) {
      throw new Error('No hosts available');
    }
    const bc =
      this.version === 4
        ? this.broadcast().toBigInt()
        : broadcastOf(this.ip.toBigInt(), this.prefix, 128);
    const last = includeEdges ? bc : bc - 1n;
    if (this.version === 4) {
      return IPv4.fromBigInt(last) as typeof this.ip;
    } else {
      return IPv6.fromBigInt(last) as typeof this.ip;
    }
  }

  contains(x: IP | CIDR): boolean {
    if (x instanceof IP) {
      if (x.version !== this.version) return false;
      const net = this.network().toBigInt();
      const mask = prefixMask(this.prefix, this.bits());
      return (x.toBigInt() & mask) === net;
    } else if (x instanceof CIDR) {
      if (x.version !== this.version) return false;
      return this.contains(x.network()) && this.contains(x.lastHost({ includeEdges: true }));
    } else {
      return false;
    }
  }

  overlaps(other: CIDR<V>): boolean {
    if (other.version !== this.version) return false;
    const thisNet = this.network().toBigInt();
    const otherNet = other.network().toBigInt();
    const thisMask = prefixMask(this.prefix, this.bits());
    const otherMask = prefixMask(other.prefix, other.bits());
    return (thisNet & otherMask) === otherNet || (otherNet & thisMask) === thisNet;
  }

  *hosts(opts?: { includeEdges?: boolean }): Generator<typeof this.ip, void, unknown> {
    const includeEdges = opts?.includeEdges ?? (this.version === 6 || this.prefix >= 31);
    const start = this.firstHost({ includeEdges }).toBigInt();
    const end = this.lastHost({ includeEdges }).toBigInt();
    for (let addr = start; addr <= end; addr++) {
      if (this.version === 4) {
        yield IPv4.fromBigInt(addr) as typeof this.ip;
      } else {
        yield IPv6.fromBigInt(addr) as typeof this.ip;
      }
    }
  }

  *subnets(newPrefix: number): Generator<CIDR<V>, void, unknown> {
    if (newPrefix <= this.prefix) {
      throw new Error('New prefix must be greater than current prefix');
    }
    const subnetsPer = 1 << (newPrefix - this.prefix);
    const net = this.network().toBigInt();
    const step = 1n << BigInt(this.bits() - newPrefix);
    for (let i = 0; i < subnetsPer; i++) {
      const subnetNet = net + BigInt(i) * step;
      const ip = this.version === 4 ? IPv4.fromBigInt(subnetNet) : IPv6.fromBigInt(subnetNet);
      yield CIDR.from(ip as any, newPrefix) as CIDR<V>;
    }
  }

  split(parts: number): CIDR<V>[] {
    if (parts <= 1) return [this];
    const newPrefix = this.prefix + Math.ceil(Math.log2(parts));
    const subnets = Array.from(this.subnets(newPrefix));
    return subnets.slice(0, parts);
  }

  move(n: number): CIDR<V> {
    const currentNet = this.network().toBigInt();
    const step = 1n << BigInt(this.bits() - this.prefix);
    const newNet = currentNet + BigInt(n) * step;
    const ip = this.version === 4 ? IPv4.fromBigInt(newNet) : IPv6.fromBigInt(newNet);
    return CIDR.from(ip as any, this.prefix) as CIDR<V>;
  }

  toRange(): IPRange<V> {
    const start = this.firstHost({ includeEdges: true });
    const end = this.lastHost({ includeEdges: true });
    return IPRange.from(start as any, end as any) as IPRange<V>;
  }

  toPtr(): string[] {
    return ptrZonesForCIDR(this.ip.toBigInt(), this.prefix, this.bits());
  }

  toString(): string {
    return `${this.ip.toString()}/${this.prefix}`;
  }
}
