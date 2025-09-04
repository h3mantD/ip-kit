import { describe, it, expect } from 'vitest';
import { IPv4, IPv6, IP } from '../../src/domain/ip';

describe('IPv4', () => {
  it('parse string', () => {
    const ip = IPv4.parse('192.168.1.1');
    expect(ip.toString()).toBe('192.168.1.1');
    expect(ip.toBigInt()).toBe(3232235777n);
  });

  it('parse number', () => {
    const ip = IPv4.parse(3232235777);
    expect(ip.toString()).toBe('192.168.1.1');
  });

  it('parse bigint', () => {
    const ip = IPv4.parse(3232235777n);
    expect(ip.toString()).toBe('192.168.1.1');
  });

  it('parse bytes', () => {
    const ip = IPv4.parse(new Uint8Array([192, 168, 1, 1]));
    expect(ip.toString()).toBe('192.168.1.1');
  });

  it('toBytes', () => {
    const ip = IPv4.parse('192.168.1.1');
    expect(ip.toBytes()).toEqual(new Uint8Array([192, 168, 1, 1]));
  });

  it('equals', () => {
    const ip1 = IPv4.parse('192.168.1.1');
    const ip2 = IPv4.parse('192.168.1.1');
    const ip3 = IPv4.parse('192.168.1.2');
    expect(ip1.equals(ip2)).toBe(true);
    expect(ip1.equals(ip3)).toBe(false);
  });

  it('compare', () => {
    const ip1 = IPv4.parse('192.168.1.1');
    const ip2 = IPv4.parse('192.168.1.2');
    expect(ip1.compare(ip2)).toBe(-1);
    expect(ip2.compare(ip1)).toBe(1);
    expect(ip1.compare(ip1)).toBe(0);
  });

  it('invalid parse', () => {
    expect(() => IPv4.parse('256.1.1.1')).toThrow();
    expect(() => IPv4.parse('192.168.1.1.1')).toThrow();
  });
});

describe('IPv6', () => {
  it('parse string', () => {
    const ip = IPv6.parse('2001:db8::1');
    expect(ip.toString()).toBe('2001:db8::1');
  });

  it('parse compressed', () => {
    const ip = IPv6.parse('::1');
    expect(ip.toString()).toBe('::1');
  });

  it('parse bigint', () => {
    const ip = IPv6.parse(1n);
    expect(ip.toString()).toBe('::1');
  });

  it('parse bytes', () => {
    const bytes = new Uint8Array(16);
    bytes[15] = 1;
    const ip = IPv6.parse(bytes);
    expect(ip.toString()).toBe('::1');
  });

  it('toBytes', () => {
    const ip = IPv6.parse('::1');
    const bytes = new Uint8Array(16);
    bytes[15] = 1;
    expect(ip.toBytes()).toEqual(bytes);
  });

  it('equals', () => {
    const ip1 = IPv6.parse('2001:db8::1');
    const ip2 = IPv6.parse('2001:db8::1');
    const ip3 = IPv6.parse('2001:db8::2');
    expect(ip1.equals(ip2)).toBe(true);
    expect(ip1.equals(ip3)).toBe(false);
  });

  it('compare', () => {
    const ip1 = IPv6.parse('2001:db8::1');
    const ip2 = IPv6.parse('2001:db8::2');
    expect(ip1.compare(ip2)).toBe(-1);
  });

  it('invalid parse', () => {
    expect(() => IPv6.parse('invalid')).toThrow();
  });
});

describe('IP static methods', () => {
  it('isIPv4', () => {
    expect(IP.isIPv4('192.168.1.1')).toBe(true);
    expect(IP.isIPv4('2001:db8::1')).toBe(false);
    expect(IP.isIPv4('256.1.1.1')).toBe(false);
  });

  it('isIPv6', () => {
    expect(IP.isIPv6('2001:db8::1')).toBe(true);
    expect(IP.isIPv6('192.168.1.1')).toBe(false);
  });
});
