/**
 * CIDR (Classless Inter-Domain Routing) classes.
 */

import { IP, IPv4, IPv6, IPVersion } from './ip';
import { IPRange } from './range';
import { ParseError, InvariantError } from '../core/errors';
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
      throw new InvariantError('Broadcast not supported for IPv6');
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
      throw new InvariantError('No hosts available');
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
      throw new InvariantError('No hosts available');
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
      throw new InvariantError('New prefix must be greater than current prefix');
    }
    if (newPrefix > this.bits()) {
      throw new InvariantError('New prefix exceeds address size');
    }
    const diff = newPrefix - this.prefix;
    const count = 1n << BigInt(diff);
    const net = this.network().toBigInt();
    const step = 1n << BigInt(this.bits() - newPrefix);
    for (let i = 0n; i < count; i++) {
      const subnetNet = net + i * step;
      if (this.version === 4) {
        const ip = IPv4.fromBigInt(subnetNet);
        yield CIDR.from(ip, newPrefix) as CIDR<V>;
      } else {
        const ip = IPv6.fromBigInt(subnetNet);
        yield CIDR.from(ip, newPrefix) as CIDR<V>;
      }
    }
  }

  split(parts: number): CIDR<V>[] {
    if (parts <= 1) return [this];
    if (parts <= 0) throw new InvariantError('parts must be > 0');
    // compute smallest power-of-two >= parts using BigInt to avoid JS number limits
    let power = 1n;
    let bits = 0;
    while (power < BigInt(parts)) {
      power <<= 1n;
      bits += 1;
    }
    const newPrefix = this.prefix + bits;
    if (newPrefix > this.bits()) {
      throw new InvariantError('Cannot split beyond address space');
    }
    const subnets = Array.from(this.subnets(newPrefix));
    return subnets.slice(0, parts);
  }

  move(n: number): CIDR<V> {
    const currentNet = this.network().toBigInt();
    const step = 1n << BigInt(this.bits() - this.prefix);
    const newNet = currentNet + BigInt(n) * step;
    if (this.version === 4) {
      const ip = IPv4.fromBigInt(newNet);
      return CIDR.from(ip, this.prefix) as CIDR<V>;
    } else {
      const ip = IPv6.fromBigInt(newNet);
      return CIDR.from(ip, this.prefix) as CIDR<V>;
    }
  }

  toRange(): IPRange<V> {
    const start = this.firstHost({ includeEdges: true });
    const end = this.lastHost({ includeEdges: true });
    if (this.version === 4) {
      return IPRange.from(start as IPv4, end as IPv4) as IPRange<V>;
    } else {
      return IPRange.from(start as IPv6, end as IPv6) as IPRange<V>;
    }
  }

  toPtr(): string[] {
    return ptrZonesForCIDR(this.ip.toBigInt(), this.prefix, this.bits());
  }

  toString(): string {
    return `${this.ip.toString()}/${this.prefix}`;
  }
}
