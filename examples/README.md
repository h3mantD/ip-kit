# IP Toolkit Examples

This directory contains examples demonstrating the various features of the IP Toolkit.

## Understanding the Math

For detailed explanations of how IP calculations work under the hood, including BigInt usage and CIDR mathematics, see our **[IP Calculations Guide](../docs/IP_CALCULATIONS.md)**.

## Running Examples

### Prerequisites

Make sure you have built the library:

```bash
npm run build
```

### JavaScript Examples

Run the JavaScript examples using Node.js:

```bash
# Basic functionality demo
node examples/basic.js
```

### TypeScript Examples

For TypeScript examples, you'll need `tsx` or `ts-node`:

```bash
# Install tsx globally (recommended)
npm install -g tsx

# Or install ts-node
npm install -g ts-node

# Run TypeScript examples
npx tsx examples/basic.ts
```

## Example Categories

### Basic Operations

- IP address parsing and formatting
- CIDR network calculations
- IP range operations

### IPv6 Features

- **IPv6 mixed notation** (IPv4-mapped and IPv4-compatible addresses)
- RFC 5952 normalization
- RFC 4291 mixed notation support

### Advanced Features

- Range set operations (union, intersect, subtract)
- IP address allocation and management
- Longest prefix matching with radix trie

### Real-world Use Cases

- IPAM (IP Address Management) system
- Routing table implementation
- Network planning and analysis
- Dual-stack server connection mapping

### Mathematical Foundations

- See **[IP Calculations Guide](../docs/IP_CALCULATIONS.md)** for detailed explanations of:
  - BigInt-based arithmetic
  - CIDR mathematics and subnetting algorithms
  - Range-to-CIDR conversion
  - IPv6 normalization (RFC 5952)

## Example Files

- `basic.js` / `basic.ts` - Comprehensive demo of all features
- `ipv6-mixed-notation.ts` - IPv6 mixed notation (IPv4-mapped/compatible addresses)
  - Parse and format `::ffff:192.0.2.1` style addresses
  - Validation and error handling
  - CIDR operations with mixed notation
  - Dual-stack server use case

More examples coming soon...

## Contributing

Feel free to add more examples! Follow these guidelines:

1. Include both JavaScript (`.js`) and TypeScript (`.ts`) versions
2. Add clear comments explaining each step
3. Demonstrate practical use cases
4. Keep examples focused and concise
5. Update this README when adding new examples
