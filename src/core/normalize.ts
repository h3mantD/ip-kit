/**
 * IPv6 normalization utilities per RFC 5952.
 */
import { ParseError } from './errors';

/**
 * Finds the start and length of the longest zero run (at least 2 zeros).
 */
function findLongestZeroRun(groups: number[]): { start: number; len: number } | null {
  let longestStart = -1;
  let longestLen = 0;
  let i = 0;
  while (i < 8) {
    if (groups[i] === 0) {
      const start = i;
      while (i < 8 && groups[i] === 0) i++;
      const len = i - start;
      if (len > 1 && len > longestLen) {
        longestLen = len;
        longestStart = start;
      }
    } else {
      i++;
    }
  }
  return longestStart !== -1 ? { start: longestStart, len: longestLen } : null;
}

/**
 * Normalizes IPv6 groups to RFC 5952 format.
 */
export function normalizeV6Groups(groups: number[]): { text: string; mappedV4?: string } {
  if (groups.length !== 8) {
    throw new ParseError('IPv6 must have 8 groups');
  }

  // Check for IPv4-mapped: ::ffff:w.x.y.z -> groups[0..4]==0 and groups[5]==0xffff
  let mappedV4: string | undefined;
  if (groups.slice(0, 5).every((g) => g === 0) && groups[5] === 0xffff) {
    // last 32 bits are in groups[6] (high 16) and groups[7] (low 16)
    const high = groups[6] & 0xffff;
    const low = groups[7] & 0xffff;
    const v4num = (high << 16) | low;
    mappedV4 = `${(v4num >>> 24) & 0xff}.${(v4num >>> 16) & 0xff}.${(v4num >>> 8) & 0xff}.${v4num & 0xff}`;

    // Return mixed notation for IPv4-mapped addresses
    return { text: `::ffff:${mappedV4}`, mappedV4 };
  }

  // Check for IPv4-compatible: ::w.x.y.z -> groups[0..5]==0
  // But exclude unspecified (::) and loopback (::1) addresses
  if (groups.slice(0, 6).every((g) => g === 0)) {
    const high = groups[6] & 0xffff;
    const low = groups[7] & 0xffff;
    const v4num = (high << 16) | low;

    // Special cases that should NOT use mixed notation:
    // - Unspecified address (::) - all zeros
    // - Loopback address (::1)
    if (v4num === 0 || v4num === 1) {
      // Let normal IPv6 formatting handle these
    } else {
      // Use mixed notation for other IPv4-compatible addresses
      const ipv4Str = `${(v4num >>> 24) & 0xff}.${(v4num >>> 16) & 0xff}.${(v4num >>> 8) & 0xff}.${v4num & 0xff}`;
      return { text: `::${ipv4Str}` };
    }
  }

  const zeroRun = findLongestZeroRun(groups);

  // Build parts
  const parts: string[] = [];
  let i = 0;
  while (i < 8) {
    if (zeroRun && i === zeroRun.start) {
      parts.push('');
      i += zeroRun.len;
    } else {
      parts.push(groups[i].toString(16));
      i++;
    }
  }

  let text: string;
  if (zeroRun) {
    if (parts[0] === '') {
      text = '::' + parts.slice(1).join(':');
    } else if (parts[parts.length - 1] === '') {
      text = parts.slice(0, -1).join(':') + '::';
    } else {
      text = parts.join(':').replace(/::+/, '::');
    }
  } else {
    text = parts.join(':');
  }

  return { text, mappedV4 };
}
