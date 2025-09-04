import { describe, it, expect } from 'vitest';
import { normalizeV6Groups } from '../../src/core/normalize';

describe('IPv6 normalization', () => {
  it('compress longest zero run (leftmost on tie)', () => {
    // example: 2001:0db8:0000:0000:0000:0000:1428:57ab -> 2001:db8::1428:57ab
    const groups = [0x2001, 0x0db8, 0, 0, 0, 0, 0x1428, 0x57ab];
    const { text } = normalizeV6Groups(groups);
    expect(text).toBe('2001:db8::1428:57ab');
  });

  it('no compress single zero group', () => {
    const groups = [0x2001, 0xdb8, 0, 1, 2, 3, 4, 5];
    const { text } = normalizeV6Groups(groups);
    expect(text).toBe('2001:db8:0:1:2:3:4:5');
  });

  it('ipv4 mapped detection', () => {
    const groups = [0, 0, 0, 0, 0, 0xffff, 0xc0a8, 0x0101]; // ::ffff:192.168.1.1
    const { text, mappedV4 } = normalizeV6Groups(groups);
    expect(mappedV4).toBe('192.168.1.1');
    expect(text).toContain('::ffff');
  });
});
