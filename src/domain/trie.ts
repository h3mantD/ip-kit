/**
 * Radix Trie (Patricia Tree) for IP address lookups.
 * Provides efficient longest-prefix matching for routing and IPAM operations.
 */

import { IP, IPv4, IPv6, IPVersion } from './ip';
import { CIDR } from './cidr';
import { VersionMismatchError } from '../core/errors';

interface TrieNode<T> {
  children: Map<number, TrieNode<T>>;
  value?: T;
  prefixLength: number;
  storedPrefix?: number; // Store the actual prefix length for this value
  network?: bigint; // store network address as bigint when a value is assigned
}

export class RadixTrie<V extends IPVersion = IPVersion, T = unknown> {
  private readonly root: TrieNode<T>;
  readonly version: V;

  constructor(version: V) {
    this.version = version;
    this.root = {
      children: new Map(),
      prefixLength: 0,
    };
  }

  /**
   * Insert a CIDR with associated value.
   */
  insert(cidr: CIDR<V>, value?: T): this {
    if (cidr.version !== this.version) {
      throw new VersionMismatchError('CIDR version must match trie version');
    }

    let node = this.root;
    const bits = cidr.version === 4 ? 32 : 128;
    const ipValue = cidr.network().toBigInt();

    for (let bitPos = 0; bitPos < cidr.prefix; bitPos++) {
      const bit = Number((ipValue >> BigInt(bits - 1 - bitPos)) & 1n);
      if (!node.children.has(bit)) {
        node.children.set(bit, {
          children: new Map(),
          prefixLength: bitPos + 1,
        });
      }
      node = node.children.get(bit)!;
    }
  node.value = value;
  node.storedPrefix = cidr.prefix;
  node.network = cidr.network().toBigInt();
    return this;
  }

  /**
   * Remove a CIDR from the trie.
   */
  remove(cidr: CIDR<V>): this {
    if (cidr.version !== this.version) {
      throw new VersionMismatchError('CIDR version must match trie version');
    }

    const path: TrieNode<T>[] = [];
    let node = this.root;
    const bits = cidr.version === 4 ? 32 : 128;
    const ipValue = cidr.network().toBigInt();

    // Find the path to the node
    for (let bitPos = 0; bitPos < cidr.prefix; bitPos++) {
      const bit = Number((ipValue >> BigInt(bits - 1 - bitPos)) & 1n);
      if (!node.children.has(bit)) {
        return this; // CIDR not found
      }
      path.push(node);
      node = node.children.get(bit)!;
    }

    // Remove the value
  delete node.value;
  delete node.storedPrefix;
  delete node.network;

    // Clean up empty nodes
    for (let i = path.length - 1; i >= 0; i--) {
      const parent = path[i];
      const bit = Number((ipValue >> BigInt(bits - 1 - i)) & 1n);
      const child = parent.children.get(bit)!;

      if (child.children.size === 0 && child.value === undefined) {
        parent.children.delete(bit);
      } else {
        break;
      }
    }

    return this;
  }

  /**
   * Find the longest-prefix match for an IP address.
   */
  longestMatch(ip: IP<V>): { cidr: CIDR<V>; value?: T } | null {
    if (ip.version !== this.version) {
      throw new VersionMismatchError('IP version must match trie version');
    }

    let node = this.root;
    let bestNode: TrieNode<T> | null = null;
    const bits = ip.version === 4 ? 32 : 128;
    const ipValue = ip.toBigInt();

    for (let bitPos = 0; bitPos < bits; bitPos++) {
      if (node.value !== undefined) {
        bestNode = node;
      }

      const bit = Number((ipValue >> BigInt(bits - 1 - bitPos)) & 1n);
      if (!node.children.has(bit)) {
        break;
      }
      node = node.children.get(bit)!;
    }

    // Check the final node
    if (node.value !== undefined) {
      bestNode = node;
    }

    if (!bestNode) return null;

    const cidr = this.reconstructCIDR(ip, bestNode);
    return {
      cidr,
      value: bestNode.value,
    };
  }

  /**
   * Check if the trie contains any entries.
   */
  isEmpty(): boolean {
    return this.root.children.size === 0;
  }

  /**
   * Get all CIDRs in the trie.
   */
  getCIDRs(): CIDR<V>[] {
    const result: CIDR<V>[] = [];
    this.collectCIDRs(this.root, 0n, 0, result);
    return result;
  }

  /**
   * Get the number of entries in the trie.
   */
  size(): number {
    return this.countNodes(this.root);
  }

  // Private helper methods

  private reconstructCIDR(ip: IP<V>, node: TrieNode<T>): CIDR<V> {
    const prefixLength = node.storedPrefix!;
    if (node.network !== undefined) {
      const networkIP = ip.version === 4 ? IPv4.fromBigInt(node.network) : IPv6.fromBigInt(node.network);
      if (this.version === 4) {
        return CIDR.from(networkIP as IPv4, prefixLength) as CIDR<V>;
      } else {
        return CIDR.from(networkIP as IPv6, prefixLength) as CIDR<V>;
      }
    }

    // Fallback: reconstruct using the searched IP (legacy behaviour)
    const bits = ip.version === 4 ? 32 : 128;
    const mask = (1n << BigInt(bits - prefixLength)) - 1n;
    const networkValue = ip.toBigInt() & ~mask;
    const networkIP = ip.version === 4 ? IPv4.fromBigInt(networkValue) : IPv6.fromBigInt(networkValue);
    if (ip.version === 4) {
      return CIDR.from(networkIP as IPv4, prefixLength) as CIDR<V>;
    } else {
      return CIDR.from(networkIP as IPv6, prefixLength) as CIDR<V>;
    }
  }

  private collectCIDRs(
    node: TrieNode<T>,
    currentValue: bigint,
    currentPrefix: number,
    result: CIDR<V>[]
  ): void {
    if (node.value !== undefined) {
      const prefixLength = node.storedPrefix!;
      if (node.network !== undefined) {
        const networkIP = this.version === 4 ? IPv4.fromBigInt(node.network) : IPv6.fromBigInt(node.network);
        if (this.version === 4) {
          result.push(CIDR.from(networkIP as IPv4, prefixLength) as CIDR<V>);
        } else {
          result.push(CIDR.from(networkIP as IPv6, prefixLength) as CIDR<V>);
        }
      } else {
        const networkIP = this.version === 4 ? IPv4.fromBigInt(currentValue) : IPv6.fromBigInt(currentValue);
        if (this.version === 4) {
          result.push(CIDR.from(networkIP as IPv4, prefixLength) as CIDR<V>);
        } else {
          result.push(CIDR.from(networkIP as IPv6, prefixLength) as CIDR<V>);
        }
      }
    }

    const bits = this.version === 4 ? 32 : 128;
    for (const [bit, child] of node.children) {
      const newValue = currentValue | (BigInt(bit) << BigInt(bits - 1 - currentPrefix));
      this.collectCIDRs(child, newValue, currentPrefix + 1, result);
    }
  }

  private countNodes(node: TrieNode<T>): number {
    let count = 0;
    if (node.value !== undefined) {
      count++;
    }
    for (const child of node.children.values()) {
      count += this.countNodes(child);
    }
    return count;
  }
}
