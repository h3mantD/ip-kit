import { describe, it, expect } from 'vitest';
import { ptrV4, ptrV6, ptrZonesForCIDR } from '../../src/core/ptr';

describe('ptr utils', () => {
  it('ptrV4 basic', () => {
    expect(ptrV4(0xc0a80101n)).toBe('1.1.168.192.in-addr.arpa');
  });

  it('ptrV6 basic', () => {
    // ::1 -> nibble representation ends with 1
    expect(ptrV6(1n)).toContain('ip6.arpa');
  });

  it('ptrZonesForCIDR ipv4 /24', () => {
    const zones = ptrZonesForCIDR(0xc0a80101n, 24, 32);
    expect(zones.length).toBeGreaterThan(0);
    expect(zones[0]).toContain('in-addr.arpa');
  });

  it('ptrZonesForCIDR ipv6 nibble', () => {
    const zones = ptrZonesForCIDR(0x20010db8000000000000000000000001n, 32, 128);
    expect(zones.length).toBeGreaterThan(0);
    expect(zones[0]).toContain('ip6.arpa');
  });
});
