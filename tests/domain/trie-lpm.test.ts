import { describe, it, expect } from 'vitest';
import { RadixTrie } from '../../src/domain/trie';
import { CIDR } from '../../src/domain/cidr';
import { IPv4 } from '../../src/domain/ip';

describe('RadixTrie LPM behaviors', () => {
  it('longest prefix when /8 and /16 overlap', () => {
  const trie = new RadixTrie(4);
  trie.insert(CIDR.parse('10.0.0.0/8') as any as CIDR<4>, 'a');
  trie.insert(CIDR.parse('10.1.0.0/16') as any as CIDR<4>, 'b');

  const match1 = trie.longestMatch(IPv4.parse('10.1.2.3') as any);
    expect(match1).not.toBeNull();
    expect(match1!.value).toBe('b');

  const match2 = trie.longestMatch(IPv4.parse('10.2.2.3') as any);
    expect(match2).not.toBeNull();
    expect(match2!.value).toBe('a');
  });

  it('remove a CIDR and ensure longestMatch falls back', () => {
    const trie = new RadixTrie(4);
  trie.insert(CIDR.parse('192.0.2.0/24') as any as CIDR<4>, 'x');
  expect(trie.longestMatch(IPv4.parse('192.0.2.1') as any)!.value).toBe('x');
  trie.remove(CIDR.parse('192.0.2.0/24') as any as CIDR<4>);
  expect(trie.longestMatch(IPv4.parse('192.0.2.1') as any)).toBeNull();
  });
});
