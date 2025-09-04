/**
 * IP address classes: IPv4 and IPv6.
 */

import { ParseError, VersionMismatchError } from '../core/errors';
import { normalizeV6Groups } from '../core/normalize';
import { MAX4, MAX6 } from '../core/bigint';

export type IPVersion = 4 | 6;

export abstract class IP<V extends IPVersion = IPVersion> {
  protected readonly _value: bigint;
  readonly version: V;

  protected constructor(value: bigint, version: V) {
    this._value = value;
    this.version = version;
  }

  toBigInt(): bigint {
    return this._value;
  }

  abstract toBytes(): Uint8Array;

  abstract toString(): string;

  equals(other: IP): boolean {
    return this.version === other.version && this._value === other._value;
  }

  compare(other: IP<V>): -1 | 0 | 1 {
    if (this.version !== other.version) {
      throw new VersionMismatchError('Cannot compare IPs of different versions');
    }
    if (this._value < other._value) return -1;
    if (this._value > other._value) return 1;
    return 0;
  }

  static isIPv4(s: string): boolean {
    return (
      /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(s) &&
      s.split('.').every((octet) => {
        const num = parseInt(octet, 10);
        return num >= 0 && num <= 255;
      })
    );
  }

  static isIPv6(s: string): boolean {
    // Basic check for IPv6 format
    return /:/.test(s) && s.split(':').length <= 8;
  }
}

export class IPv4 extends IP<4> {
  static parse(input: string | number | bigint | Uint8Array): IPv4 {
    if (typeof input === 'string') {
      if (!IP.isIPv4(input)) {
        throw new ParseError(`Invalid IPv4 address: ${input}`);
      }
      const octets = input.split('.').map((o) => parseInt(o, 10));
      const value =
        (BigInt(octets[0]) << 24n) |
        (BigInt(octets[1]) << 16n) |
        (BigInt(octets[2]) << 8n) |
        BigInt(octets[3]);
      return new IPv4(value, 4);
    }
    if (typeof input === 'number') {
      if (input < 0 || input > Number(MAX4)) {
        throw new ParseError(`IPv4 number out of range: ${input}`);
      }
      return new IPv4(BigInt(input), 4);
    }
    if (typeof input === 'bigint') {
      if (input < 0n || input > MAX4) {
        throw new ParseError(`IPv4 bigint out of range: ${input}`);
      }
      return new IPv4(input, 4);
    }
    if (input instanceof Uint8Array) {
      if (input.length !== 4) {
        throw new ParseError(`IPv4 bytes must be 4 bytes, got ${input.length}`);
      }
      const value =
        (BigInt(input[0]) << 24n) |
        (BigInt(input[1]) << 16n) |
        (BigInt(input[2]) << 8n) |
        BigInt(input[3]);
      return new IPv4(value, 4);
    }
    throw new ParseError(`Unsupported input type for IPv4: ${typeof input}`);
  }

  static fromBigInt(v: bigint): IPv4 {
    return new IPv4(v, 4);
  }

  toBytes(): Uint8Array {
    const bytes = new Uint8Array(4);
    bytes[0] = Number((this._value >> 24n) & 0xffn);
    bytes[1] = Number((this._value >> 16n) & 0xffn);
    bytes[2] = Number((this._value >> 8n) & 0xffn);
    bytes[3] = Number(this._value & 0xffn);
    return bytes;
  }

  toString(): string {
    const bytes = this.toBytes();
    return `${bytes[0]}.${bytes[1]}.${bytes[2]}.${bytes[3]}`;
  }
}

export class IPv6 extends IP<6> {
  static parse(input: string | bigint | Uint8Array): IPv6 {
    if (typeof input === 'string') {
      // Parse IPv6 string, handle compression
      const groups = IPv6.expandGroups(input);
      const value = groups.reduce(
        (acc, group, i) => acc | (BigInt(group) << BigInt(112 - i * 16)),
        0n
      );
      return new IPv6(value, 6);
    }
    if (typeof input === 'bigint') {
      if (input < 0n || input > MAX6) {
        throw new ParseError(`IPv6 bigint out of range: ${input}`);
      }
      return new IPv6(input, 6);
    }
    if (input instanceof Uint8Array) {
      if (input.length !== 16) {
        throw new ParseError(`IPv6 bytes must be 16 bytes, got ${input.length}`);
      }
      let value = 0n;
      for (let i = 0; i < 16; i++) {
        value |= BigInt(input[i]) << BigInt(120 - i * 8);
      }
      return new IPv6(value, 6);
    }
    throw new ParseError(`Unsupported input type for IPv6: ${typeof input}`);
  }

  private static expandGroups(s: string): number[] {
    // Expand :: and split into 8 groups
    let parts = s.split(':');
    const doubleColonIndex = parts.indexOf('');
    if (doubleColonIndex !== -1) {
      const missing = 8 - (parts.length - 1);
      parts.splice(doubleColonIndex, 1, ...Array(missing).fill('0'));
    }
    if (parts.length !== 8) {
      throw new ParseError(`Invalid IPv6 format: ${s}`);
    }
    return parts.map((p) => parseInt(p || '0', 16));
  }

  static fromBigInt(v: bigint): IPv6 {
    return new IPv6(v, 6);
  }

  toBytes(): Uint8Array {
    const bytes = new Uint8Array(16);
    for (let i = 0; i < 16; i++) {
      bytes[i] = Number((this._value >> BigInt(120 - i * 8)) & 0xffn);
    }
    return bytes;
  }

  toString(): string {
    const groups: number[] = [];
    for (let i = 0; i < 8; i++) {
      groups.push(Number((this._value >> BigInt(112 - i * 16)) & 0xffffn));
    }
    const { text } = normalizeV6Groups(groups);
    return text;
  }
}
