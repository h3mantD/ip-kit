import { describe, it, expect } from 'vitest';
import { IPRange } from '../../src/domain/range';
import { IPv4 } from '../../src/domain/ip';

describe('IPRange IPv4', () => {
  it('parse', () => {
    const range = IPRange.parse('192.168.1.1 - 192.168.1.10');
    expect(range.toString()).toBe('192.168.1.1-192.168.1.10');
    expect(range.version).toBe(4);
  });

  it('from', () => {
    const start = IPv4.parse('192.168.1.1');
    const end = IPv4.parse('192.168.1.10');
    const range = IPRange.from(start, end);
    expect(range.toString()).toBe('192.168.1.1-192.168.1.10');
  });

  it('size', () => {
    const range = IPRange.parse('192.168.1.1 - 192.168.1.10');
    expect(range.size()).toBe(10n);
  });

  it('contains', () => {
    const range = IPRange.parse('192.168.1.1 - 192.168.1.10');
    const ip1 = IPv4.parse('192.168.1.5');
    const ip2 = IPv4.parse('192.168.1.15');
    expect(range.contains(ip1)).toBe(true);
    expect(range.contains(ip2)).toBe(false);
  });

  it('overlaps', () => {
    const range1 = IPRange.parse('192.168.1.1 - 192.168.1.10') as IPRange<4>;
    const range2 = IPRange.parse('192.168.1.5 - 192.168.1.15') as IPRange<4>;
    const range3 = IPRange.parse('192.168.2.1 - 192.168.2.10') as IPRange<4>;
    expect(range1.overlaps(range2)).toBe(true);
    expect(range1.overlaps(range3)).toBe(false);
  });

  it('ips', () => {
    const range = IPRange.parse('192.168.1.1 - 192.168.1.3') as IPRange<4>;
    const ips = Array.from(range.ips());
    expect(ips.length).toBe(3);
    expect(ips[0].toString()).toBe('192.168.1.1');
    expect(ips[2].toString()).toBe('192.168.1.3');
  });

  it('toCIDRs', () => {
    const range = IPRange.parse('192.168.1.0 - 192.168.1.7') as IPRange<4>;
    const cidrs = range.toCIDRs();
    expect(cidrs.length).toBe(1);
    expect(cidrs[0].toString()).toBe('192.168.1.0/29');
  });
});

describe('IPRange IPv6', () => {
  it('parse', () => {
    const range = IPRange.parse('2001:db8::1 - 2001:db8::10');
    expect(range.version).toBe(6);
  });

  it('size', () => {
    const range = IPRange.parse('2001:db8::1 - 2001:db8::10');
    expect(range.size()).toBe(16n);
  });
});
