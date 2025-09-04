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
});
