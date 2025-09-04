import { describe, it, expect } from 'vitest';
import { CIDR } from '../../src/domain/cidr';

describe('CIDR subnets and split', () => {
  it('/24 -> /26 subnets', () => {
    const c = CIDR.parse('192.168.0.0/24') as any as CIDR<4>;
    const subs = Array.from(c.subnets(26));
    expect(subs.length).toBe(4);
    expect(subs[0].prefix).toBe(26);
    expect(subs[1].network().toString()).toBe('192.168.0.64');
  });

  it('split parts=3 returns first 3 of /26', () => {
    const c = CIDR.parse('192.168.0.0/24') as any as CIDR<4>;
    const parts = c.split(3);
    expect(parts.length).toBe(3);
    expect(parts[0].prefix).toBe(26);
  });

  it('ipv6 /64 -> /66 subnets', () => {
    const c = CIDR.parse('2001:db8::/64') as any as CIDR<6>;
    const subs = Array.from(c.subnets(66));
    expect(subs.length).toBe(4);
    expect(subs[0].prefix).toBe(66);
  });
});
