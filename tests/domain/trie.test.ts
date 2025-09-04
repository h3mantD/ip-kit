import { describe, it, expect } from 'vitest';
import { RadixTrie } from '../../src/domain/trie';
import { CIDR } from '../../src/domain/cidr';
import { IPv4, IPv6 } from '../../src/domain/ip';

describe('RadixTrie IPv4', () => {
  it('constructor creates empty trie', () => {
    const trie = new RadixTrie<4>(4);
    expect(trie.version).toBe(4);
    expect(trie.isEmpty()).toBe(true);
    expect(trie.size()).toBe(0);
  });

  it('insert and longestMatch work for exact match', () => {
    const trie = new RadixTrie<4>(4);
    const cidr = CIDR.parse('192.168.1.0/24');
    trie.insert(cidr as CIDR<4>, 'test-value');

    const ip = IPv4.parse('192.168.1.1');
    const result = trie.longestMatch(ip);

    expect(result).not.toBeNull();
    expect(result!.cidr.toString()).toBe('192.168.1.0/24');
    expect(result!.value).toBe('test-value');
  });

  it('longestMatch finds longest prefix', () => {
    const trie = new RadixTrie<4>(4);
    trie.insert(CIDR.parse('192.168.0.0/16') as CIDR<4>, '16-bit');
    trie.insert(CIDR.parse('192.168.1.0/24') as CIDR<4>, '24-bit');

    const ip = IPv4.parse('192.168.1.1');
    const result = trie.longestMatch(ip);

    expect(result).not.toBeNull();
    expect(result!.cidr.toString()).toBe('192.168.1.0/24');
    expect(result!.value).toBe('24-bit');
  });

  it('longestMatch returns null for no match', () => {
    const trie = new RadixTrie<4>(4);
    trie.insert(CIDR.parse('192.168.1.0/24') as CIDR<4>, 'test');

    const ip = IPv4.parse('10.0.0.1');
    const result = trie.longestMatch(ip);

    expect(result).toBeNull();
  });

  it('remove works correctly', () => {
    const trie = new RadixTrie<4>(4);
    const cidr = CIDR.parse('192.168.1.0/24');
    trie.insert(cidr as CIDR<4>, 'test');

    const ip = IPv4.parse('192.168.1.1');
    expect(trie.longestMatch(ip)).not.toBeNull();

    trie.remove(cidr as CIDR<4>);
    expect(trie.longestMatch(ip)).toBeNull();
  });

  it('getCIDRs returns all inserted CIDRs', () => {
    const trie = new RadixTrie<4>(4);
    const cidr1 = CIDR.parse('192.168.1.0/24');
    const cidr2 = CIDR.parse('10.0.0.0/8');

    trie.insert(cidr1 as CIDR<4>, 'value1');
    trie.insert(cidr2 as CIDR<4>, 'value2');

    const cidrs = trie.getCIDRs();
    expect(cidrs.length).toBe(2);
    expect(cidrs.some((c) => c.toString() === '192.168.1.0/24')).toBe(true);
    expect(cidrs.some((c) => c.toString() === '10.0.0.0/8')).toBe(true);
  });

  it('size returns correct count', () => {
    const trie = new RadixTrie<4>(4);
    expect(trie.size()).toBe(0);

    trie.insert(CIDR.parse('192.168.1.0/24') as CIDR<4>, 'test1');
    expect(trie.size()).toBe(1);

    trie.insert(CIDR.parse('10.0.0.0/8') as CIDR<4>, 'test2');
    expect(trie.size()).toBe(2);
  });

  it('handles overlapping CIDRs correctly', () => {
    const trie = new RadixTrie<4>(4);
    trie.insert(CIDR.parse('192.168.0.0/16') as CIDR<4>, '16-bit');
    trie.insert(CIDR.parse('192.168.1.0/24') as CIDR<4>, '24-bit');
    trie.insert(CIDR.parse('192.168.1.128/25') as CIDR<4>, '25-bit');

    // Test different IPs
    const ip1 = IPv4.parse('192.168.2.1'); // Should match /16
    const ip2 = IPv4.parse('192.168.1.1'); // Should match /24
    const ip3 = IPv4.parse('192.168.1.129'); // Should match /25

    expect(trie.longestMatch(ip1)!.cidr.toString()).toBe('192.168.0.0/16');
    expect(trie.longestMatch(ip2)!.cidr.toString()).toBe('192.168.1.0/24');
    expect(trie.longestMatch(ip3)!.cidr.toString()).toBe('192.168.1.128/25');
  });

  it('handles default route', () => {
    const trie = new RadixTrie<4>(4);
    trie.insert(CIDR.parse('0.0.0.0/0') as CIDR<4>, 'default');

    const ip = IPv4.parse('192.168.1.1');
    const result = trie.longestMatch(ip);

    expect(result).not.toBeNull();
    expect(result!.cidr.toString()).toBe('0.0.0.0/0');
    expect(result!.value).toBe('default');
  });
});

describe('RadixTrie IPv6', () => {
  it('works with IPv6', () => {
    const trie = new RadixTrie<6>(6);
    const cidr = CIDR.parse('2001:db8::/32');
    trie.insert(cidr as CIDR<6>, 'ipv6-value');

    const ip = IPv6.parse('2001:db8::1');
    const result = trie.longestMatch(ip);

    expect(result).not.toBeNull();
    expect(result!.cidr.toString()).toBe('2001:db8::/32');
    expect(result!.value).toBe('ipv6-value');
  });

  it('handles IPv6 longest prefix matching', () => {
    const trie = new RadixTrie<6>(6);
    trie.insert(CIDR.parse('2001:db8::/32') as CIDR<6>, '32-bit');
    trie.insert(CIDR.parse('2001:db8:1::/48') as CIDR<6>, '48-bit');

    const ip = IPv6.parse('2001:db8:1::1');
    const result = trie.longestMatch(ip);

    expect(result).not.toBeNull();
    expect(result!.cidr.toString()).toBe('2001:db8:1::/48');
    expect(result!.value).toBe('48-bit');
  });
});

describe('RadixTrie edge cases', () => {
  it('handles /32 IPv4 (host route)', () => {
    const trie = new RadixTrie<4>(4);
    const cidr = CIDR.parse('192.168.1.1/32');
    trie.insert(cidr as CIDR<4>, 'host-route');

    const ip = IPv4.parse('192.168.1.1');
    const result = trie.longestMatch(ip);

    expect(result).not.toBeNull();
    expect(result!.cidr.toString()).toBe('192.168.1.1/32');
    expect(result!.value).toBe('host-route');
  });

  it('handles /128 IPv6 (host route)', () => {
    const trie = new RadixTrie<6>(6);
    const cidr = CIDR.parse('2001:db8::1/128');
    trie.insert(cidr as CIDR<6>, 'ipv6-host');

    const ip = IPv6.parse('2001:db8::1');
    const result = trie.longestMatch(ip);

    expect(result).not.toBeNull();
    expect(result!.cidr.toString()).toBe('2001:db8::1/128');
    expect(result!.value).toBe('ipv6-host');
  });

  it('returns null for empty trie', () => {
    const trie = new RadixTrie<4>(4);
    const ip = IPv4.parse('192.168.1.1');
    expect(trie.longestMatch(ip)).toBeNull();
  });

  it('handles multiple insertions and removals', () => {
    const trie = new RadixTrie<4>(4);
    const cidr1 = CIDR.parse('192.168.1.0/24');
    const cidr2 = CIDR.parse('192.168.2.0/24');

    trie.insert(cidr1 as CIDR<4>, 'net1');
    trie.insert(cidr2 as CIDR<4>, 'net2');

    expect(trie.size()).toBe(2);

    trie.remove(cidr1 as CIDR<4>);
    expect(trie.size()).toBe(1);

    const ip = IPv4.parse('192.168.1.1');
    expect(trie.longestMatch(ip)).toBeNull();

    const ip2 = IPv4.parse('192.168.2.1');
    expect(trie.longestMatch(ip2)!.value).toBe('net2');
  });
});
