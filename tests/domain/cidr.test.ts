import { describe, it, expect } from 'vitest';
import { CIDR } from '../../src/domain/cidr';
import { IPv4, IPv6 } from '../../src/domain/ip';

describe('CIDR IPv4', () => {
  it('parse', () => {
    const cidr = CIDR.parse('192.168.1.0/24');
    expect(cidr.toString()).toBe('192.168.1.0/24');
    expect(cidr.version).toBe(4);
    expect(cidr.prefix).toBe(24);
  });

  it('from', () => {
    const ip = IPv4.parse('192.168.1.0');
    const cidr = CIDR.from(ip, 24);
    expect(cidr.toString()).toBe('192.168.1.0/24');
  });

  it('network', () => {
    const cidr = CIDR.parse('192.168.1.1/24');
    expect(cidr.network().toString()).toBe('192.168.1.0');
  });

  it('broadcast', () => {
    const cidr = CIDR.parse('192.168.1.0/24');
    expect(cidr.broadcast().toString()).toBe('192.168.1.255');
  });

  it('size', () => {
    const cidr = CIDR.parse('192.168.1.0/24');
    expect(cidr.size()).toBe(256n);
  });

  it('contains IP', () => {
    const cidr = CIDR.parse('192.168.1.0/24');
    const ip1 = IPv4.parse('192.168.1.1');
    const ip2 = IPv4.parse('192.168.2.1');
    expect(cidr.contains(ip1)).toBe(true);
    expect(cidr.contains(ip2)).toBe(false);
  });

  it('contains CIDR', () => {
    const cidr1 = CIDR.parse('192.168.1.0/24');
    const cidr2 = CIDR.parse('192.168.1.0/25');
    const cidr3 = CIDR.parse('192.168.2.0/24');
    expect(cidr1.contains(cidr2)).toBe(true);
    expect(cidr1.contains(cidr3)).toBe(false);
  });

  it('overlaps', () => {
    const cidr1 = CIDR.parse('192.168.1.0/24') as CIDR<4>;
    const cidr2 = CIDR.parse('192.168.1.128/25') as CIDR<4>;
    const cidr3 = CIDR.parse('192.168.2.0/24') as CIDR<4>;
    expect(cidr1.overlaps(cidr2)).toBe(true);
    expect(cidr1.overlaps(cidr3)).toBe(false);
  });

  it('hosts', () => {
    const cidr = CIDR.parse('192.168.1.0/30') as CIDR<4>;
    const hosts = Array.from(cidr.hosts());
    expect(hosts.length).toBe(2);
    expect(hosts[0].toString()).toBe('192.168.1.1');
    expect(hosts[1].toString()).toBe('192.168.1.2');
  });

  it('hosts includeEdges', () => {
    const cidr = CIDR.parse('192.168.1.0/30') as CIDR<4>;
    const hosts = Array.from(cidr.hosts({ includeEdges: true }));
    expect(hosts.length).toBe(4);
    expect(hosts[0].toString()).toBe('192.168.1.0');
    expect(hosts[3].toString()).toBe('192.168.1.3');
  });

  it('subnets', () => {
    const cidr = CIDR.parse('192.168.1.0/24') as CIDR<4>;
    const subnets = Array.from(cidr.subnets(26));
    expect(subnets.length).toBe(4);
    expect(subnets[0].toString()).toBe('192.168.1.0/26');
    expect(subnets[1].toString()).toBe('192.168.1.64/26');
  });

  it('split', () => {
    const cidr = CIDR.parse('192.168.1.0/24') as CIDR<4>;
    const parts = cidr.split(2);
    expect(parts.length).toBe(2);
    expect(parts[0].toString()).toBe('192.168.1.0/25');
    expect(parts[1].toString()).toBe('192.168.1.128/25');
  });

  it('move', () => {
    const cidr = CIDR.parse('192.168.1.0/24') as CIDR<4>;
    const moved = cidr.move(1);
    expect(moved.toString()).toBe('192.168.2.0/24');
  });
});

describe('CIDR IPv6', () => {
  it('parse', () => {
    const cidr = CIDR.parse('2001:db8::/32');
    expect(cidr.toString()).toBe('2001:db8::/32');
    expect(cidr.version).toBe(6);
  });

  it('network', () => {
    const cidr = CIDR.parse('2001:db8::1/32');
    expect(cidr.network().toString()).toBe('2001:db8::');
  });

  it('size', () => {
    const cidr = CIDR.parse('2001:db8::/32');
    expect(cidr.size()).toBe(2n ** 96n);
  });

  it('contains', () => {
    const cidr = CIDR.parse('2001:db8::/32');
    const ip = IPv6.parse('2001:db8::1');
    expect(cidr.contains(ip)).toBe(true);
  });

  it('broadcast throws', () => {
    const cidr = CIDR.parse('2001:db8::/32');
    expect(() => cidr.broadcast()).toThrow();
  });
});
