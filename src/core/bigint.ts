/**
 * BigInt utilities for IP address math.
 */

export const BITS4 = 32n;
export const BITS6 = 128n;
export const MAX4 = (1n << BITS4) - 1n;
export const MAX6 = (1n << BITS6) - 1n;

/**
 * Returns the network mask for a given prefix length.
 */
export function prefixMask(prefix: number, bits: 32 | 128): bigint {
  return ((1n << BigInt(prefix)) - 1n) << BigInt(bits - prefix);
}

/**
 * Returns the host mask for a given prefix length.
 */
export function hostMask(prefix: number, bits: 32 | 128): bigint {
  return ~prefixMask(prefix, bits) & ((1n << BigInt(bits)) - 1n);
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
  const size = end - start + 1n;
  if (size <= 0n) return null;

  // Find largest power of 2 <= size
  let prefixLen = 0;
  let blockSize = 1n;
  while (blockSize * 2n <= size) {
    blockSize *= 2n;
    prefixLen++;
  }

  // Check if start is aligned to blockSize
  const alignedStart = (start / blockSize) * blockSize;
  if (alignedStart >= start && alignedStart + blockSize - 1n <= end) {
    return { prefix: bits - prefixLen, block: alignedStart };
  }

  return null;
}
