import { describe, it, expect } from 'vitest';
import { IPRange } from '../../src/domain/range';

describe('IPRange toCIDRs', () => {
  it('single-aligned range /24', () => {
    const r = IPRange.parse('192.168.0.0-192.168.0.255');
    const cidrs = r.toCIDRs();
    expect(cidrs.length).toBe(1);
    expect(cidrs[0].prefix).toBe(24);
  });

  it('small range that needs multiple cidrs', () => {
    const r = IPRange.parse('192.168.0.5-192.168.0.20');
    const cidrs = r.toCIDRs();
    // Coverage size should equal original range size
    const covered = cidrs.reduce((sum, c) => sum + c.size(), 0n);
    expect(covered).toBe(r.size());
  });

  it('single IP becomes /32', () => {
    const r = IPRange.parse('10.0.0.1-10.0.0.1');
    const cidrs = r.toCIDRs();
    expect(cidrs.length).toBeGreaterThan(0);
    expect(cidrs[0].prefix).toBe(32);
  });
});
