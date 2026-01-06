# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **IPv6 mixed notation support** (RFC 4291 §2.5.5.2) for IPv4-mapped and IPv4-compatible addresses
  - Parse and format addresses like `::ffff:192.0.2.1` (IPv4-mapped)
  - Parse and format addresses like `::192.0.2.1` (IPv4-compatible)
  - Support for custom organizational prefixes with dotted-decimal IPv4 tails (e.g., `2001:db8:1:1:1:1:192.168.0.10`)
  - Automatic detection and formatting of IPv4-mapped addresses with mixed notation
  - Special case handling for `::` and `::1` (preserved as hex, not dotted-decimal)
- **Enhanced IPv6 validation** for strict RFC 4291 compliance
  - Reject invalid formats with triple colon (`:::`) or more consecutive colons
  - Reject addresses with multiple `::` compression sequences
  - Strict validation of IPv4 octets in mixed notation (range, leading zeros, format)
- **Comprehensive test coverage** for IPv6 mixed notation
  - 32 tests for mixed notation features
  - Edge case validation (min/max values, malformed input, etc.)
  - Round-trip integrity tests
  - Total test count increased from 153 to 160+ tests
- **Examples and documentation**
  - New `examples/ipv6-mixed-notation.ts` with practical use cases
  - Updated README with detailed IPv6 mixed notation examples
  - Dual-stack server connection mapping example
  - Validation and error handling examples

### Fixed
- IPv6 addresses with dotted-decimal IPv4 tails now parse all 4 octets correctly (previously only parsed first octet on main branch)
- IPv4-mapped IPv6 addresses now serialize with dotted-decimal notation instead of hex
- IPv4-compatible IPv6 addresses now serialize with dotted-decimal notation (except `::` and `::1`)
- Improved error messages for IPv6 parsing failures

### Changed
- IPv6 `toString()` now outputs mixed notation for IPv4-mapped and IPv4-compatible addresses per RFC 4291
- Enhanced `isIPv6()` validation to detect and validate mixed notation patterns
- Test suite expanded with comprehensive edge case coverage

## [1.0.1] - 2024-09-05

### Changed
- Initial release with core functionality
- IPv4/IPv6 parsing and formatting
- CIDR operations
- IP ranges and range sets
- IP address allocation
- Radix trie for longest-prefix matching
- Comprehensive test coverage (153 tests)

[Unreleased]: https://github.com/h3mantD/ip-kit/compare/v1.0.1...HEAD
[1.0.1]: https://github.com/h3mantD/ip-kit/releases/tag/v1.0.1
