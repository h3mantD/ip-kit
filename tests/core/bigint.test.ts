import { describe, it, expect } from 'vitest';
import {
  BITS4,
  BITS6,
  MAX4,
  MAX6,
  prefixMask,
  hostMask,
  networkOf,
  broadcastOf,
  bitAtMSB,
  maxAlignedBlock,
} from '../../src/core/bigint';

describe('bigint utils', () => {
  it('constants', () => {
    expect(BITS4).toBe(32n);
    expect(BITS6).toBe(128n);
    expect(MAX4).toBe((1n << 32n) - 1n);
    expect(MAX6).toBe((1n << 128n) - 1n);
  });

  it('prefixMask', () => {
    expect(prefixMask(24, 32)).toBe(0xffffff00n);
    expect(prefixMask(64, 128)).toBe(((1n << 64n) - 1n) << 64n);
  });

  it('hostMask', () => {
    expect(hostMask(24, 32)).toBe(0xffn);
  });

  it('networkOf', () => {
    const ip = 0xc0a80101n; // 192.168.1.1
    expect(networkOf(ip, 24, 32)).toBe(0xc0a80100n);
  });

  it('broadcastOf', () => {
    const ip = 0xc0a80101n;
    expect(broadcastOf(ip, 24, 32)).toBe(0xc0a801ffn);
  });

  it('bitAtMSB', () => {
    expect(bitAtMSB(0x80000000n, 0, 32)).toBe(true);
    expect(bitAtMSB(0x40000000n, 0, 32)).toBe(false);
  });

  it('maxAlignedBlock - aligned start', () => {
    // range 0..255 should yield /24 at 0
    const res = maxAlignedBlock(0n, 255n, 32);
    expect(res).not.toBeNull();
  // /24 == prefix 24 for a 256-address block
  expect(res!.prefix).toBe(24);
    expect(res!.block).toBe(0n);
  });

  it('maxAlignedBlock - unaligned start but larger block fits later', () => {
    // start 5, end 20 -> largest aligned block of size 8 is at 8..15 => prefix 29 (32-3)
    const res = maxAlignedBlock(5n, 20n, 32);
    expect(res).not.toBeNull();
    expect(res!.block).toBe(8n);
  });

  it('maxAlignedBlock - single address', () => {
    const res = maxAlignedBlock(1000n, 1000n, 32);
    expect(res).not.toBeNull();
    expect(res!.prefix).toBe(32);
    expect(res!.block).toBe(1000n);
  });
});
