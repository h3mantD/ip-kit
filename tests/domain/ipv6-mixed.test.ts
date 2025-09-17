import { describe, it, expect } from 'vitest';
import { IPv6, IP } from '../../src/domain/ip';

describe('IPv6 Mixed Notation (IPv4-mapped/compatible)', () => {
  describe('IPv4-compatible addresses (::d.d.d.d)', () => {
    it('should parse IPv4-compatible compressed form', () => {
      const ip = IPv6.parse('::13.1.68.3');
      expect(ip.toString()).toBe('::13.1.68.3');

      // Verify the internal value is correct
      // 13.1.68.3 = 0x0D014403
      expect(ip.toBigInt()).toBe(0x0d014403n);
    });

    it('should parse IPv4-compatible uncompressed form', () => {
      const ip = IPv6.parse('0:0:0:0:0:0:13.1.68.3');
      expect(ip.toString()).toBe('::13.1.68.3');
    });

    it('should preserve IPv6 loopback (::1) as hex', () => {
      // ::1 should not be displayed as ::0.0.0.1
      const ip = IPv6.parse('::1');
      expect(ip.toString()).toBe('::1');
    });
  });

  describe('IPv4-mapped addresses (::ffff:d.d.d.d)', () => {
    it('should parse IPv4-mapped compressed form', () => {
      const ip = IPv6.parse('::ffff:129.144.52.38');
      expect(ip.toString()).toBe('::ffff:129.144.52.38');

      // Verify the internal value is correct
      // ::ffff:129.144.52.38 = 0x0000000000000000000000ffff81903426
      expect(ip.toBigInt()).toBe(0x0000000000000000000000ffff81903426n);
    });

    it('should parse IPv4-mapped uncompressed form', () => {
      const ip = IPv6.parse('0:0:0:0:0:ffff:129.144.52.38');
      expect(ip.toString()).toBe('::ffff:129.144.52.38');
    });

    it('should parse mixed case FFFF', () => {
      const ip = IPv6.parse('::FFFF:192.168.1.1');
      expect(ip.toString()).toBe('::ffff:192.168.1.1');
    });

    it('should handle edge IPv4 values', () => {
      const ip1 = IPv6.parse('::ffff:0.0.0.0');
      expect(ip1.toString()).toBe('::ffff:0.0.0.0');

      const ip2 = IPv6.parse('::ffff:255.255.255.255');
      expect(ip2.toString()).toBe('::ffff:255.255.255.255');
    });
  });

  describe('Custom organizational prefixes', () => {
    it('should parse mixed notation with custom prefix', () => {
      const ip = IPv6.parse('2001:db8:1:1:1:1:192.168.0.10');
      // Should be displayed in standard hex notation, not mixed
      expect(ip.toString()).toBe('2001:db8:1:1:1:1:c0a8:a');
    });

    it('should parse complex mixed notation', () => {
      const ip = IPv6.parse('2001:db8:85a3:8d3:1319:8a2e:192.168.1.1');
      expect(ip.toString()).toBe('2001:db8:85a3:8d3:1319:8a2e:c0a8:101');
    });
  });

  describe('Error handling', () => {
    it('should reject invalid IPv4 octets in mixed notation', () => {
      expect(() => IPv6.parse('::256.1.1.1')).toThrow('Invalid IPv4 part');
      expect(() => IPv6.parse('::1.256.1.1')).toThrow('Invalid IPv4 part');
      expect(() => IPv6.parse('::1.1.256.1')).toThrow('Invalid IPv4 part');
      expect(() => IPv6.parse('::1.1.1.256')).toThrow('Invalid IPv4 part');
    });

    it('should reject negative octets', () => {
      expect(() => IPv6.parse('::-1.1.1.1')).toThrow('Invalid IPv4 part');
    });

    it('should reject malformed IPv4 part', () => {
      expect(() => IPv6.parse('::1.1.1')).toThrow('Invalid IPv4 part');
      expect(() => IPv6.parse('::1.1.1.1.1')).toThrow('Invalid IPv4 part');
      expect(() => IPv6.parse('::1..1.1')).toThrow('Invalid IPv4 part');
    });

    it('should reject too many IPv6 groups in mixed notation', () => {
      expect(() => IPv6.parse('1:2:3:4:5:6:7:8:192.168.1.1')).toThrow('Invalid IPv6 part');
    });

    it('should reject invalid hex in IPv6 part', () => {
      expect(() => IPv6.parse('gggg::192.168.1.1')).toThrow('Invalid IPv6 part');
    });
  });

  describe('isIPv6 detection', () => {
    it('should recognize IPv4-compatible addresses', () => {
      expect(IP.isIPv6('::13.1.68.3')).toBe(true);
      expect(IP.isIPv6('0:0:0:0:0:0:13.1.68.3')).toBe(true);
    });

    it('should recognize IPv4-mapped addresses', () => {
      expect(IP.isIPv6('::ffff:129.144.52.38')).toBe(true);
      expect(IP.isIPv6('::FFFF:129.144.52.38')).toBe(true);
      expect(IP.isIPv6('0:0:0:0:0:ffff:129.144.52.38')).toBe(true);
    });

    it('should recognize custom prefix mixed notation', () => {
      expect(IP.isIPv6('2001:db8:1:1:1:1:192.168.0.10')).toBe(true);
    });

    it('should reject invalid mixed notation', () => {
      expect(IP.isIPv6('::256.1.1.1')).toBe(false);
      expect(IP.isIPv6('1:2:3:4:5:6:7:8:192.168.1.1')).toBe(false);
      expect(IP.isIPv6('::1.1.1')).toBe(false);
    });
  });

  describe('Round-trip integrity', () => {
    const testCases = [
      '::13.1.68.3',
      '::ffff:129.144.52.38',
      '::FFFF:192.168.1.1',
      '0:0:0:0:0:0:13.1.68.3',
      '0:0:0:0:0:ffff:129.144.52.38',
      '2001:db8:1:1:1:1:192.168.0.10',
    ];

    testCases.forEach((input) => {
      it(`should maintain integrity for ${input}`, () => {
        const ip = IPv6.parse(input);
        const output = ip.toString();
        const reparsed = IPv6.parse(output);

        // The BigInt values should be identical
        expect(reparsed.toBigInt()).toBe(ip.toBigInt());

        // Parsing the output should give the same normalized result
        expect(IPv6.parse(output).toString()).toBe(output);
      });
    });
  });

  describe('Bytes conversion', () => {
    it('should convert IPv4-mapped address to bytes correctly', () => {
      const ip = IPv6.parse('::ffff:192.168.1.1');
      const bytes = ip.toBytes();

      // Should be 16 bytes: 10 zeros, 0xff, 0xff, then 192, 168, 1, 1
      const expected = new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0xff, 0xff, 192, 168, 1, 1]);

      expect(bytes).toEqual(expected);
    });

    it('should convert IPv4-compatible address to bytes correctly', () => {
      const ip = IPv6.parse('::13.1.68.3');
      const bytes = ip.toBytes();

      // Should be 16 bytes: 12 zeros, then 13, 1, 68, 3
      const expected = new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 13, 1, 68, 3]);

      expect(bytes).toEqual(expected);
    });
  });

  describe('BigInt conversion', () => {
    it('should handle IPv4-mapped addresses correctly', () => {
      const ip = IPv6.parse('::ffff:192.168.1.1');
      // 192.168.1.1 = 0xC0A80101
      // So the full address is 0x0000000000000000000000FFFFC0A80101
      expect(ip.toBigInt()).toBe(0x0000000000000000000000ffffc0a80101n);
    });
  });
});
