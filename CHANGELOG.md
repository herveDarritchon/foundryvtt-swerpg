# Changelog for FoundryVTT SWRPG System

> This file contains the changelog for the FoundryVTT SWRPG system, detailing all changes, bug fixes, and new features introduced in each version.

## [Unreleased]

### Added

- **importer:** new armor OggDude mapper with deterministic category/property mapping tables
- **importer:** armor import validation system with strict mode support
- **importer:** armor import statistics and instrumentation (total, rejected, unknown categories/properties)
- **importer:** comprehensive test coverage for armor mapper (>95% branch coverage)
- **docs:** complete armor import documentation with examples and troubleshooting
- **importer:** gear OggDude mapper refactored for SwerpgGear schema compliance
- **importer:** gear import validation functions with numeric and boolean normalization
- **tests:** comprehensive unit and integration tests for gear mapping (13 tests total)
- **docs:** complete gear import technical documentation

### Changed

- **importer:** refactor armor-ogg-dude.mjs to produce SwerpgArmor-compatible objects
- **importer:** sanitize armor descriptions to prevent HTML injection
- **importer:** clamp armor defense/soak values to [0,100] with abnormal value warnings
- **importer:** sort armor properties alphabetically and limit to 12 properties max

### Removed

- **importer:** removed unsupported armor fields (sources, mods, weaponModifiers, eraPricing) from output

### Fixes

- **importer:** refactor career OggDude mapper to align with `SwerpgCareer` schema (description, freeSkillRank clamp, careerSkills normalization, logging)
- **importer:** correct OggDude gear mapping to restore numeric fields, enriched description, BaseMods serialization and weapon profile flags

## [0.3.1](https://github.com/herveDarritchon/foundryvtt-swerpg/compare/v0.3.0...v0.3.1) (2025-06-16)

### Bug Fixes

- **changelog:** update version headers for consistency ([474c53b](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/474c53b27f484160d5649bf8b3218ca4e19af4be))

## [0.3.0](https://github.com/herveDarritchon/foundryvtt-swerpg/compare/v0.2.1...v0.3.0) (2025-06-16)

### Features (0.3.0)

- **actor-sheet:** display currently equipped armor and weapons in sidebar with tags and toggle control (planned feature implementation)

- **armor:** modify armor to be valid with SW rules (migration from crucible). ([689bec2](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/689bec250c24877b4638cb057d9fd7851123ddea))
- **weapon:** add gear to system. ([ddf81ed](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/ddf81eda3397af06527d3647487b922f06360e21))
- **weapon:** add weapon to be valid with SW rules (migration from crucible). ([1fb0ee1](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/1fb0ee1f5f979444d8f40d82462ffedd9b45073f))
- **weapon:** add weapon to compendium. ([3ebe282](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/3ebe28207a564205dd9f7db747788a5270aa8ef8))

## [0.2.1](https://github.com/herveDarritchon/foundryvtt-swerpg/compare/v0.2.0...v0.2.1) (2025-06-08)

### Bug Fixes (0.2.1)

- **changelog:** update changelog format and add introductory description ([54be664](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/54be664e866a94e63bde6b8cf64ea1c4511eca14))

## [0.2.0](https://github.com/herveDarritchon/foundryvtt-swerpg/compare/v0.1.18...v0.2.0) (2025-06-08)

### Bug Fixes (0.2.0)

- **build:** remove unused database entries from build configuration ([a8b7f67](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/a8b7f67c26ba93d3965916d413a668f1845aa8e7))
- **main:** update build command from pullYMLtoLDB to compile ([8c5ab2b](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/8c5ab2bf18e8cdbd95b0803e0e0172d3bb4d37d0))

## [0.1.9](https://github.com/herveDarritchon/foundryvtt-swerpg/compare/v0.1.8...v0.1.9) (2025-06-04)

## [0.1.8](https://github.com/herveDarritchon/foundryvtt-swerpg/compare/v0.1.7...v0.1.8) (2025-06-04)

## [0.1.7](https://github.com/herveDarritchon/foundryvtt-swerpg/compare/v0.1.6...v0.1.7) (2025-06-04)

## [0.1.6](https://github.com/herveDarritchon/foundryvtt-swerpg/compare/v0.1.5...v0.1.6) (2025-06-04)

## [0.1.5](https://github.com/herveDarritchon/foundryvtt-swerpg/compare/v0.1.4...v0.1.5) (2025-06-04)

## [0.1.4](https://github.com/herveDarritchon/foundryvtt-swerpg/compare/v0.1.3...v0.1.4) (2025-06-04)

## [0.1.3](https://github.com/herveDarritchon/foundryvtt-swerpg/compare/v0.1.2...v0.1.3) (2025-06-04)

## [0.1.2](https://github.com/herveDarritchon/foundryvtt-swerpg/compare/v0.1.1...v0.1.2) (2025-06-03)

### Bug Fixes (0.1.18)

## [0.1.1](https://github.com/herveDarritchon/foundryvtt-swerpg/compare/v0.1.0...v0.1.1) (2025-06-03)

## [0.1.0] (2025-06-03)

## [0.1.17](https://github.com/herveDarritchon/foundryvtt-swerpg/compare/v0.1.16...v0.1.17) (2025-06-04)

### Bug Fixes (0.1.17)

- **release:** update release.yml to set DOWNLOAD URL directly in environment variables ([373129f](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/373129fc656da94e60130705d7cc8bc89388260e))

## [0.1.16](https://github.com/herveDarritchon/foundryvtt-swerpg/compare/v0.1.15...v0.1.16) (2025-06-04)

### Bug Fixes (0.1.16)

- **release:** move release_module_url to environment variables in release.yml ([3842d4a](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/3842d4adca4182286de436b29299e6a295147874))

## [0.1.15](https://github.com/herveDarritchon/foundryvtt-swerpg/compare/v0.1.14...v0.1.15) (2025-06-04)

### Bug Fixes (0.1.15)

- **release:** correct syntax for VERSION environment variable in release.yml ([cf8c408](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/cf8c408e2011b57cfd64b513498eec9445837540))

## [0.1.14](https://github.com/herveDarritchon/foundryvtt-swerpg/compare/v0.1.13...v0.1.14) (2025-06-04)

### Bug Fixes (0.1.14)

- **system:** update system.json to use placeholders for manifest, download, and version in release process ([2487102](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/248710270b9b533b98cc5ddc8a5789550ef8be08))

## [0.1.13](https://github.com/herveDarritchon/foundryvtt-swerpg/compare/v0.1.12...v0.1.13) (2025-06-04)

### Bug Fixes (0.1.13)

- **system:** update system.json to use placeholders for manifest, download, and version ([00f7213](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/00f7213cadfa297f5917262e5155fa022cfbf12b))

## [0.1.12](https://github.com/herveDarritchon/foundryvtt-swerpg/compare/v0.1.11...v0.1.12) (2025-06-04)

### Bug Fixes (0.1.12)

- add styles directory to release.yml for asset inclusion ([dc805ad](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/dc805adb3cfd2cbfe84cbe1c30513a87e91e14c6))

## [0.1.11](https://github.com/herveDarritchon/foundryvtt-swerpg/compare/v0.1.10...v0.1.11) (2025-06-04)

### Bug Fixes (0.1.11)

- update release.yml to extend semantic-release configuration for improved functionality ([60f95d6](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/60f95d6af2cbf27afed1483544e6ac211ec6c432))

# [0.1.9](https://github.com/herveDarritchon/foundryvtt-swerpg/compare/v0.1.8...v0.1.9) (2025-06-04)

# [0.1.8](https://github.com/herveDarritchon/foundryvtt-swerpg/compare/v0.1.7...v0.1.8) (2025-06-04)

# [0.1.7](https://github.com/herveDarritchon/foundryvtt-swerpg/compare/v0.1.6...v0.1.7) (2025-06-04)

# [0.1.6](https://github.com/herveDarritchon/foundryvtt-swerpg/compare/v0.1.5...v0.1.6) (2025-06-04)

# [0.1.5](https://github.com/herveDarritchon/foundryvtt-swerpg/compare/v0.1.4...v0.1.5) (2025-06-04)

# [0.1.4](https://github.com/herveDarritchon/foundryvtt-swerpg/compare/v0.1.3...v0.1.4) (2025-06-04)

# [0.1.3](https://github.com/herveDarritchon/foundryvtt-swerpg/compare/v0.1.2...v0.1.3) (2025-06-04)

# [0.1.2](https://github.com/herveDarritchon/foundryvtt-swerpg/compare/v0.1.1...v0.1.2) (2025-06-03)

### Bug Fixes

- enhance changelog entry matching for better version header support ([c451a54](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/c451a54ceae889441c79065c2c38095a494bfb24))

# [0.1.1](https://github.com/herveDarritchon/foundryvtt-swerpg/compare/v0.1.0...v0.1.1) (2025-06-03)

# [0.1.0] (2025-06-03)

# What's Changed

Feature/refactoring skills during character creation by @herveDarritchon in #1
[TECH] Add github actions from an other fvtt system. by @herveDarritchon in #2
Merge pull request #2 from herveDarritchon/tech/add-github-actions by @herveDarritchon in #3
Add characteristic management to character sheet by @herveDarritchon in #5
Feature/add attribute progression to character by @herveDarritchon in #6
Full Changelog: https://github.com/herveDarritchon/foundryvtt-swerpg/commits/v0.1.0
