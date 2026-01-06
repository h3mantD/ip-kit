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
    // Check for mixed IPv6/IPv4 notation pattern
    const possibleMixedMatch = s.match(/^(.*):([^:]+)$/);
    if (possibleMixedMatch) {
      const [, ipv6Part, lastPart] = possibleMixedMatch;

      // Check if the last part looks like an IPv4 address (contains dots)
      if (lastPart.includes('.')) {
        // Validate IPv4 part
        const ipv4Octets = lastPart.split('.');
        if (
          ipv4Octets.length !== 4 ||
          !ipv4Octets.every((octet) => {
            if (octet === '' || !/^\d+$/.test(octet) || (octet.length > 1 && octet[0] === '0'))
              return false;
            const num = parseInt(octet, 10);
            return !isNaN(num) && num >= 0 && num <= 255;
          })
        ) {
          return false;
        }

        // Validate IPv6 part (should have at most 6 colon-separated groups)
        if (!/:/.test(ipv6Part)) return false;
        const parts = ipv6Part.split(':');
        if (parts.length > 6) return false; // too many groups for mixed notation

        // Check for valid hex groups and double colon
        let hasDoubleColon = false;
        for (const part of parts) {
          if (part === '') {
            hasDoubleColon = true;
          } else if (!/^[0-9a-fA-F]{1,4}$/.test(part)) {
            return false;
          }
        }

        // If no double colon, should have exactly 6 groups
        if (!hasDoubleColon && parts.length !== 6) return false;

        return true;
      }
    }

    // Basic check for standard IPv6 format
    if (!/:/.test(s)) return false;
    const parts = s.split(':');
    if (parts.length > 8) return false;

    let hasDoubleColon = false;
    for (const part of parts) {
      if (part === '') {
        hasDoubleColon = true;
      } else if (!/^[0-9a-fA-F]{1,4}$/.test(part)) {
        return false;
      }
    }

    // If no double colon, should have exactly 8 groups
    if (!hasDoubleColon && parts.length !== 8) return false;

    return true;
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

  /**
   * Validates that there is at most one `::` compression in the address.
   * Rejects invalid formats like `:::`, `::1::2`, etc.
   */
  private static validateSingleCompression(parts: string[], originalInput: string): void {
    let compressionFound = false;
    let i = 0;

    while (i < parts.length) {
      if (parts[i] === '') {
        if (compressionFound) {
          // Found a second compression sequence
          throw new ParseError(`Invalid IPv6 format (multiple :: compressions): ${originalInput}`);
        }
        compressionFound = true;

        // Skip all consecutive empty strings (the :: compression)
        while (i < parts.length && parts[i] === '') {
          i++;
        }
      } else {
        i++;
      }
    }
  }

  private static expandGroups(s: string): number[] {
    // Reject invalid formats with 3+ consecutive colons (:::, ::::, etc.)
    if (/:{3,}/.test(s)) {
      throw new ParseError(`Invalid IPv6 format (too many consecutive colons): ${s}`);
    }

    // Check for mixed IPv6/IPv4 notation pattern (colon followed by what looks like IPv4)
    // More permissive pattern to catch malformed cases for proper error handling
    const possibleMixedMatch = s.match(/^(.*):([^:]+)$/);
    if (possibleMixedMatch) {
      const [, ipv6Part, lastPart] = possibleMixedMatch;

      // Check if the last part looks like an IPv4 address (contains dots)
      if (lastPart.includes('.')) {
        // Validate IPv4 part strictly
        const ipv4Octets = lastPart.split('.');
        if (ipv4Octets.length !== 4) {
          throw new ParseError(`Invalid IPv4 part in mixed notation: ${lastPart}`);
        }

        const parsedOctets = ipv4Octets.map((octet) => {
          // Check for invalid formats like empty string, negative numbers, leading zeros (except "0"), etc.
          if (octet === '' || !/^\d+$/.test(octet) || (octet.length > 1 && octet[0] === '0')) {
            throw new ParseError(`Invalid IPv4 part in mixed notation: ${lastPart}`);
          }
          const num = parseInt(octet, 10);
          if (isNaN(num) || num < 0 || num > 255) {
            throw new ParseError(`Invalid IPv4 part in mixed notation: ${lastPart}`);
          }
          return num;
        });

        // Convert IPv4 to two 16-bit groups
        const ipv4High = (parsedOctets[0] << 8) | parsedOctets[1];
        const ipv4Low = (parsedOctets[2] << 8) | parsedOctets[3];

        // Parse IPv6 part (should result in 6 groups when expanded)
        let ipv6Parts = ipv6Part.split(':');

        // Validate single compression
        IPv6.validateSingleCompression(ipv6Parts, s);

        const doubleColonIndex = ipv6Parts.indexOf('');
        if (doubleColonIndex !== -1) {
          const missing = 6 - (ipv6Parts.length - 1); // 6 groups for IPv6 part in mixed notation
          if (missing < 0) {
            throw new ParseError(`Invalid IPv6 part in mixed notation: ${ipv6Part}`);
          }
          ipv6Parts.splice(doubleColonIndex, 1, ...Array(missing).fill('0'));
        }

        if (ipv6Parts.length !== 6) {
          throw new ParseError(`Invalid IPv6 part in mixed notation: ${ipv6Part}`);
        }

        // Validate hex groups
        const ipv6Groups = ipv6Parts.map((p) => {
          if (p === '') p = '0';
          if (!/^[0-9a-fA-F]{1,4}$/.test(p)) {
            throw new ParseError(`Invalid IPv6 part in mixed notation: ${ipv6Part}`);
          }
          return parseInt(p, 16);
        });

        return [...ipv6Groups, ipv4High, ipv4Low];
      }
    }

    // Standard IPv6 notation - expand :: and split into 8 groups
    let parts = s.split(':');

    // Validate single compression
    IPv6.validateSingleCompression(parts, s);

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
