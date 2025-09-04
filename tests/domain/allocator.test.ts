import { describe, it, expect } from 'vitest';
import { Allocator } from '../../src/domain/allocator';
import { CIDR } from '../../src/domain/cidr';
import { IPv4, IPv6 } from '../../src/domain/ip';
import { RangeSet } from '../../src/domain/rangeset';

describe('Allocator IPv4', () => {
  it('constructor with empty taken set', () => {
    const parent = CIDR.parse('192.168.1.0/24');
    const allocator = new Allocator(parent);
    expect(allocator.parent.toString()).toBe('192.168.1.0/24');
    expect(allocator.taken.size()).toBe(0n);
    expect(allocator.version).toBe(4);
  });

  it('constructor with taken ranges', () => {
    const parent = CIDR.parse('192.168.1.0/24');
    const taken = RangeSet.fromCIDRs(['192.168.1.10/32']);
    const allocator = new Allocator(parent, taken);
    expect(allocator.taken.size()).toBe(1n);
  });

  it('nextAvailable returns first host when none taken', () => {
    const parent = CIDR.parse('192.168.1.0/24');
    const allocator = new Allocator(parent);
    const next = allocator.nextAvailable();
    expect(next?.toString()).toBe('192.168.1.1');
  });

  it('nextAvailable skips taken addresses', () => {
    const parent = CIDR.parse('192.168.1.0/24');
    const taken = RangeSet.fromCIDRs(['192.168.1.1/32', '192.168.1.2/32']);
    const allocator = new Allocator(parent, taken);
    const next = allocator.nextAvailable();
    expect(next?.toString()).toBe('192.168.1.3');
  });

  it('nextAvailable from specific IP', () => {
    const parent = CIDR.parse('192.168.1.0/24');
    const allocator = new Allocator(parent);
    const from = IPv4.parse('192.168.1.5');
    const next = allocator.nextAvailable(from);
    expect(next?.toString()).toBe('192.168.1.5');
  });

  it('allocateNext allocates first available', () => {
    const parent = CIDR.parse('192.168.1.0/24');
    const allocator = new Allocator(parent);
    const allocated = allocator.allocateNext();
    expect(allocated?.toString()).toBe('192.168.1.1');
    expect(allocator.taken.size()).toBe(1n);
  });

  it('allocateIP allocates specific IP', () => {
    const parent = CIDR.parse('192.168.1.0/24');
    const allocator = new Allocator(parent);
    const ip = IPv4.parse('192.168.1.10');
    const success = allocator.allocateIP(ip);
    expect(success).toBe(true);
    expect(allocator.taken.size()).toBe(1n);
  });

  it('allocateIP fails for taken IP', () => {
    const parent = CIDR.parse('192.168.1.0/24');
    const taken = RangeSet.fromCIDRs(['192.168.1.10/32']);
    const allocator = new Allocator(parent, taken);
    const ip = IPv4.parse('192.168.1.10');
    const success = allocator.allocateIP(ip);
    expect(success).toBe(false);
  });

  it('allocateIP fails for out of range IP', () => {
    const parent = CIDR.parse('192.168.1.0/24');
    const allocator = new Allocator(parent);
    const ip = IPv4.parse('192.168.2.10');
    const success = allocator.allocateIP(ip);
    expect(success).toBe(false);
  });

  it('allocateCIDR allocates CIDR block', () => {
    const parent = CIDR.parse('192.168.1.0/24');
    const allocator = new Allocator(parent);
    const cidr = CIDR.parse('192.168.1.64/26');
    const success = allocator.allocateCIDR(cidr);
    expect(success).toBe(true);
    expect(allocator.taken.size()).toBe(64n);
  });

  it('allocateCIDR fails for overlapping CIDR', () => {
    const parent = CIDR.parse('192.168.1.0/24');
    const taken = RangeSet.fromCIDRs(['192.168.1.64/32']);
    const allocator = new Allocator(parent, taken);
    const cidr = CIDR.parse('192.168.1.64/26');
    const success = allocator.allocateCIDR(cidr);
    expect(success).toBe(false);
  });

  it('freeBlocks returns available blocks', () => {
    const parent = CIDR.parse('192.168.1.0/24');
    const taken = RangeSet.fromCIDRs(['192.168.1.64/26']);
    const allocator = new Allocator(parent, taken);
    const freeBlocks = allocator.freeBlocks({ minPrefix: 26 });
    expect(freeBlocks.length).toBeGreaterThan(0);
  });

  it('availableCount returns correct count', () => {
    const parent = CIDR.parse('192.168.1.0/24'); // 256 addresses
    const taken = RangeSet.fromCIDRs(['192.168.1.1/32']); // 1 taken
    const allocator = new Allocator(parent, taken);
    expect(allocator.availableCount()).toBe(255n);
  });

  it('utilization returns correct percentage', () => {
    const parent = CIDR.parse('192.168.1.0/24'); // 256 addresses
    const taken = RangeSet.fromCIDRs(['192.168.1.0/25']); // 128 taken
    const allocator = new Allocator(parent, taken);
    expect(allocator.utilization()).toBe(0.5);
  });
});

describe('Allocator IPv6', () => {
  it('works with IPv6', () => {
    const parent = CIDR.parse('2001:db8::/32');
    const allocator = new Allocator(parent);
    const next = allocator.nextAvailable();
    expect(next?.toString()).toBe('2001:db8::1');
  });

  it('handles IPv6 allocation', () => {
    const parent = CIDR.parse('2001:db8::/32');
    const allocator = new Allocator(parent);
    const ip = IPv6.parse('2001:db8::10');
    const success = allocator.allocateIP(ip);
    expect(success).toBe(true);
    expect(allocator.taken.size()).toBe(1n);
  });
});
