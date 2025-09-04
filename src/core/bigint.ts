/**
 * BigInt utilities for IP address math.
 */
import { OutOfRangeError } from './errors';

export const BITS4 = 32n;
export const BITS6 = 128n;
export const MAX4 = (1n << BITS4) - 1n;
export const MAX6 = (1n << BITS6) - 1n;

/**
 * Returns the network mask for a given prefix length.
 */
export function prefixMask(prefix: number, bits: 32 | 128): bigint {
  if (bits !== 32 && bits !== 128) {
    throw new OutOfRangeError(`bits must be 32 or 128, got ${bits}`);
  }
  const max = bits === 32 ? MAX4 : MAX6;
  if (prefix < 0 || prefix > bits) {
    throw new OutOfRangeError(`prefix must be between 0 and ${bits}, got ${prefix}`);
  }
  if (prefix === 0) return 0n;
  if (prefix === bits) return max;
  return (((1n << BigInt(prefix)) - 1n) << BigInt(bits - prefix)) & max;
}

/**
 * Returns the host mask for a given prefix length.
 */
export function hostMask(prefix: number, bits: 32 | 128): bigint {
  if (bits !== 32 && bits !== 128) {
    throw new OutOfRangeError(`bits must be 32 or 128, got ${bits}`);
  }
  const mask = bits === 32 ? MAX4 : MAX6;
  return (~prefixMask(prefix, bits)) & mask;
}

/**
 * Returns the network address of an IP within a CIDR.
 */
export function networkOf(ip: bigint, prefix: number, bits: 32 | 128): bigint {
  return ip & prefixMask(prefix, bits);
}

/**
 * Returns the broadcast address of an IP within a CIDR.
 */
export function broadcastOf(ip: bigint, prefix: number, bits: 32 | 128): bigint {
  return ip | hostMask(prefix, bits);
}

/**
 * Checks if the bit at the specified position from MSB is set.
 */
export function bitAtMSB(value: bigint, bit: number, bits: 32 | 128): boolean {
  if (bits !== 32 && bits !== 128) {
    throw new OutOfRangeError(`bits must be 32 or 128, got ${bits}`);
  }
  if (bit < 0 || bit >= bits) {
    throw new OutOfRangeError(`bit index out of range 0..${bits - 1}: ${bit}`);
  }
  return (value & (1n << BigInt(bits - 1 - bit))) !== 0n;
}

/**
 * Finds the largest aligned power-of-two block within [start, end].
 */
export function maxAlignedBlock(
  start: bigint,
  end: bigint,
  bits: 32 | 128
): { prefix: number; block: bigint } | null {
  if (bits !== 32 && bits !== 128) {
    throw new OutOfRangeError(`bits must be 32 or 128, got ${bits}`);
  }
  if (end < start) return null;

  const size = end - start + 1n;
  if (size <= 0n) return null;

  // Find largest exponent p such that 2^p <= size
  let maxExp = 0n;
  let blockSize = 1n;
  while (blockSize * 2n <= size) {
    blockSize *= 2n;
    maxExp++;
  }

  // Try from largest block down to smallest. For each block size, align up from `start`
  // to the next boundary and check if the block fits inside [start, end].
  for (let p = maxExp; p >= 0n; p--) {
    const bs = 1n << p; // block size
    // align up: first address >= start that is multiple of bs
    const firstAligned = ((start + bs - 1n) / bs) * bs;
    if (firstAligned + bs - 1n <= end) {
      const prefix = bits - Number(p);
      return { prefix, block: firstAligned };
    }
    if (p === 0n) break;
  }

  return null;
}
