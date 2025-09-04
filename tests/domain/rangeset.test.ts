import { describe, it, expect } from 'vitest';
import { RangeSet } from '../../src/domain/rangeset';
import { CIDR } from '../../src/domain/cidr';
import { IPRange } from '../../src/domain/range';
import { IPv4, IPv6 } from '../../src/domain/ip';

describe('RangeSet IPv4', () => {
  describe('fromCIDRs', () => {
    it('should create RangeSet from CIDR strings', () => {
      const rangeset = RangeSet.fromCIDRs(['192.168.1.0/24', '192.168.2.0/24']);
      expect(rangeset.isEmpty()).toBe(false);
      expect(rangeset.size()).toBe(512n);
    });

    it('should create RangeSet from CIDR objects', () => {
      const cidr1 = CIDR.parse('192.168.1.0/24');
      const cidr2 = CIDR.parse('192.168.2.0/24');
      const rangeset = RangeSet.fromCIDRs([cidr1, cidr2]);
      expect(rangeset.size()).toBe(512n);
    });

    it('should normalize overlapping CIDRs', () => {
      const rangeset = RangeSet.fromCIDRs(['192.168.1.0/24', '192.168.1.128/25']);
      expect(rangeset.size()).toBe(256n); // Should merge to single /24
    });
  });

  describe('fromRanges', () => {
    it('should create RangeSet from IP ranges', () => {
      const range1 = IPRange.parse('192.168.1.1 - 192.168.1.10');
      const range2 = IPRange.parse('192.168.1.20 - 192.168.1.30');
      const rangeset = RangeSet.fromRanges([range1, range2]);
      expect(rangeset.size()).toBe(21n);
    });

    it('should normalize overlapping ranges', () => {
      const range1 = IPRange.parse('192.168.1.1 - 192.168.1.10');
      const range2 = IPRange.parse('192.168.1.5 - 192.168.1.15');
      const rangeset = RangeSet.fromRanges([range1, range2]);
      expect(rangeset.size()).toBe(15n); // Should merge to 1-15
    });
  });

  describe('union', () => {
    it('should union disjoint ranges', () => {
      const set1 = RangeSet.fromCIDRs(['192.168.1.0/25']);
      const set2 = RangeSet.fromCIDRs(['192.168.1.128/25']);
      const union = set1.union(set2);
      expect(union.size()).toBe(256n);
    });

    it('should union overlapping ranges', () => {
      const set1 = RangeSet.fromCIDRs(['192.168.1.0/25']);
      const set2 = RangeSet.fromCIDRs(['192.168.1.64/26']);
      const union = set1.union(set2);
      expect(union.size()).toBe(128n); // Should merge to /25
    });
  });

  describe('intersect', () => {
    it('should intersect overlapping ranges', () => {
      const set1 = RangeSet.fromCIDRs(['192.168.1.0/24']);
      const set2 = RangeSet.fromCIDRs(['192.168.1.64/26']);
      const intersection = set1.intersect(set2);
      expect(intersection.size()).toBe(64n);
    });

    it('should return empty for disjoint ranges', () => {
      const set1 = RangeSet.fromCIDRs(['192.168.1.0/25']);
      const set2 = RangeSet.fromCIDRs(['192.168.2.0/25']);
      const intersection = set1.intersect(set2);
      expect(intersection.isEmpty()).toBe(true);
    });
  });

  describe('subtract', () => {
    it('should subtract overlapping ranges', () => {
      const set1 = RangeSet.fromCIDRs(['192.168.1.0/24']);
      const set2 = RangeSet.fromCIDRs(['192.168.1.64/26']);
      const difference = set1.subtract(set2);
      expect(difference.size()).toBe(192n); // 256 - 64
    });

    it('should handle multiple subtractions', () => {
      const set1 = RangeSet.fromCIDRs(['192.168.1.0/24']);
      const set2 = RangeSet.fromCIDRs(['192.168.1.32/27', '192.168.1.96/27']);
      const difference = set1.subtract(set2);
      expect(difference.size()).toBe(192n); // 256 - 32 - 32
    });
  });

  describe('contains', () => {
    it('should check if IP is contained', () => {
      const rangeset = RangeSet.fromCIDRs(['192.168.1.0/24']);
      expect(rangeset.contains(IPv4.parse('192.168.1.50'))).toBe(true);
      expect(rangeset.contains(IPv4.parse('192.168.2.50'))).toBe(false);
    });
  });

  describe('containsCIDR', () => {
    it('should check if CIDR is fully contained', () => {
      const rangeset = RangeSet.fromCIDRs(['192.168.1.0/24']);
      const cidr = CIDR.parse('192.168.1.64/26');
      expect(rangeset.containsCIDR(cidr)).toBe(true);
    });

    it('should return true for fully contained CIDR', () => {
      const rangeset = RangeSet.fromCIDRs(['192.168.1.0/25']);
      const cidr = CIDR.parse('192.168.1.64/25');
      expect(rangeset.containsCIDR(cidr)).toBe(true);
    });
  });

  describe('toCIDRs', () => {
    it('should convert to minimal CIDR blocks', () => {
      const rangeset = RangeSet.fromCIDRs(['192.168.1.0/25', '192.168.1.128/25']);
      const cidrs = rangeset.toCIDRs();
      expect(cidrs.length).toBe(1);
      expect(cidrs[0].toString()).toBe('192.168.1.0/24');
    });
  });

  describe('ips generator', () => {
    it('should iterate through all IPs', () => {
      const rangeset = RangeSet.fromCIDRs(['192.168.1.0/30']);
      const ips = Array.from(rangeset.ips());
      expect(ips.length).toBe(4);
      expect(ips[0].toString()).toBe('192.168.1.0');
      expect(ips[3].toString()).toBe('192.168.1.3');
    });

    it('should respect limit', () => {
      const rangeset = RangeSet.fromCIDRs(['192.168.1.0/24']);
      const ips = Array.from(rangeset.ips(5));
      expect(ips.length).toBe(5);
    });
  });

  describe('property tests', () => {
    it('union should be commutative', () => {
      const set1 = RangeSet.fromCIDRs(['192.168.1.0/25']);
      const set2 = RangeSet.fromCIDRs(['192.168.1.128/25']);
      const union1 = set1.union(set2);
      const union2 = set2.union(set1);
      expect(union1.size()).toBe(union2.size());
    });

    it('union should be idempotent', () => {
      const set = RangeSet.fromCIDRs(['192.168.1.0/24']);
      const union = set.union(set);
      expect(union.size()).toBe(set.size());
    });

    it('intersection should be commutative', () => {
      const set1 = RangeSet.fromCIDRs(['192.168.1.0/24']);
      const set2 = RangeSet.fromCIDRs(['192.168.1.64/26']);
      const intersect1 = set1.intersect(set2);
      const intersect2 = set2.intersect(set1);
      expect(intersect1.size()).toBe(intersect2.size());
    });

    it('subtract should satisfy: (A - B) ∩ B = ∅', () => {
      const set1 = RangeSet.fromCIDRs(['192.168.1.0/24']);
      const set2 = RangeSet.fromCIDRs(['192.168.1.64/26']);
      const difference = set1.subtract(set2);
      const intersection = difference.intersect(set2);
      expect(intersection.isEmpty()).toBe(true);
    });
  });
});

describe('RangeSet IPv6', () => {
  describe('fromCIDRs', () => {
    it('should create RangeSet from IPv6 CIDRs', () => {
      const rangeset = RangeSet.fromCIDRs(['2001:db8::/32', '2001:db9::/32']);
      expect(rangeset.isEmpty()).toBe(false);
    });

    it('should handle IPv6 ranges', () => {
      const range1 = IPRange.parse('2001:db8::1 - 2001:db8::10');
      const range2 = IPRange.parse('2001:db8::20 - 2001:db8::30');
      const rangeset = RangeSet.fromRanges([range1, range2]);
      expect(rangeset.size()).toBe(33n);
    });
  });

  describe('contains', () => {
    it('should check IPv6 containment', () => {
      const rangeset = RangeSet.fromCIDRs(['2001:db8::/32']);
      expect(rangeset.contains(IPv6.parse('2001:db8::1'))).toBe(true);
      expect(rangeset.contains(IPv6.parse('2001:db9::1'))).toBe(false);
    });
  });
});
