# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Version Display** - Client and server version shown in System Status popover
  - Client version injected at build time via Vite
  - Server version sent via SSE on connection
  - Displayed in new "Version" section of System Status
- **ARK Save Info Extraction** - Game metadata extracted from backup archives
  - Map name detection (supports all official ARK ASA maps)
  - Player count from .arkprofile files
  - Tribe count from .arktribe files
  - Auto-save count detection
  - Auto-suggested tags based on save data

### Changed
- Documentation structure reorganized into project/server/client READMEs

## 3.0.0 (2025-11-30)

### Features

* add transitional server states (starting/stopping) for better UX ([8c87005](https://github.com/schoolboyqueue/ark-asa-backup-web/commit/8c87005633671b9455af598048df02809f176807))
* add version display in System Status popover ([e454ea2](https://github.com/schoolboyqueue/ark-asa-backup-web/commit/e454ea20f6943bdcd837a17249b09136b7f7a97c))
* extract ARK save info from backups with auto-tag suggestions ([1eab139](https://github.com/schoolboyqueue/ark-asa-backup-web/commit/1eab139f338603fe0a21dd822032d712b4d23394))
* implement Clean Architecture and automated linting ([3b0c46c](https://github.com/schoolboyqueue/ark-asa-backup-web/commit/3b0c46cad761db27168ab7ea8afa5e9daf280b31))
* implement unified SSE architecture and UI improvements ([ca9bbfa](https://github.com/schoolboyqueue/ark-asa-backup-web/commit/ca9bbfa42d44f8659350a4d442593161a3f3682d))
* initial commit of ARK ASA Backup Manager ([84a9275](https://github.com/schoolboyqueue/ark-asa-backup-web/commit/84a92756f5f29ab8a6f3ce9e09508d0598fca49f))

### Bug Fixes

* auto-refresh relative time displays every 30 seconds ([e932741](https://github.com/schoolboyqueue/ark-asa-backup-web/commit/e932741c631aee9c5ad5943f59ddf23a3e9055b1))
* improve NumberFlow alignment and simplify copy button feedback ([f1ed944](https://github.com/schoolboyqueue/ark-asa-backup-web/commit/f1ed9444e3d3cebd6985f9197375fc9bcb080052))
* stabilize SSE callbacks to prevent missed real-time updates ([efaba68](https://github.com/schoolboyqueue/ark-asa-backup-web/commit/efaba6869e677cb3be41fa3e86d87285afc0876d))

## [3.0.0] - 2025-11-27

### Added
- **Clean Architecture** - Complete frontend refactor to domain-driven design
  - Three domains: backups, server, system
  - Strict layer separation: Domain → Service → Adapter → Repository → UseCase → View
  - Framework-agnostic business logic
- **System Monitoring Domain** - Real-time health monitoring with SSE
  - Disk space tracking with warnings (75% yellow, 90% red)
  - Backup scheduler health monitoring
  - Server status monitoring
  - Aggregate health indicator with color-coded status
- **Shared Components Layer** - Cross-domain utilities
  - Toast notification service
  - Composition components (HeaderControls)
- **Backup Metadata System** - Notes and tags for backups
  - Tag-based search and filtering
  - Standard tags (pre-boss, milestone, etc.)
  - Metadata editing in drawer UI
- **Backup Verification** - Integrity checking for backup archives

### Changed
- **Frontend Architecture** - Migrated from flat structure to Clean Architecture
  - Moved from `components/` to domain-specific `ui/` directories
  - Extracted business logic to pure service functions
  - Separated API communication into adapter layer
  - Created repository pattern for state management
- **Type System** - Unified domain types
  - Removed legacy `types/` directory
  - Domain types now single source of truth
  - Backend API transformation in adapters
- **State Management** - Repository pattern with SSE
  - Real-time updates without polling
  - Automatic cache invalidation
  - Loading states managed by repositories
- **Settings Management** - Now uses Clean Architecture
  - Settings adapter for API communication
  - Domain types for BackupSettings
  - Validation in service layer

### Removed
- **Legacy Files** - Cleaned up outdated code
  - `client/src/components/` directory (moved to domain `ui/`)
  - `client/src/services/api.ts` (replaced by domain adapters)
  - `client/src/types/` directory (replaced by domain types)
  - All "legacy" comments and references
- **Duplicate Code** - Consolidated into shared utilities
  - Toast service moved to `shared/services/`
  - Composition components in `shared/ui/`

### Fixed
- Import paths updated after architecture refactor
- Type safety improved with domain models
- Build performance optimized (4.8s average)

## [2.0.0] - 2024-XX-XX

### Added
- **Modular Backend** - Refactored from 1,564-line monolith
  - 93% reduction in file size (12 focused modules)
  - Routes, Services, Utils, Config, Types layers
  - Express Router pattern for all endpoints
- **Custom Hooks Pattern** - State management extracted from components
  - useBackupSort, useBackupFilters, useBackupPagination
  - useRestoreProgress for SSE tracking
  - useBackupActions, useBackupMetadata
  - 67% reduction in useState calls

### Changed
- Backend architecture reorganized into layers
- Component state management improved with custom hooks

## [1.0.0] - 2024-XX-XX

### Added
- Initial release
- Automated backup scheduling
- Manual backup triggering
- Safe restore with server shutdown enforcement
- Real-time monitoring with SSE
- Dark/Light/System theme support
- Responsive design (mobile/tablet/desktop)
- Docker integration for server control
- Backup list with pagination
- Search and filtering

[Unreleased]: https://github.com/yourusername/ark-asa-backup-web/compare/v3.0.0...HEAD
[3.0.0]: https://github.com/yourusername/ark-asa-backup-web/compare/v2.0.0...v3.0.0
[2.0.0]: https://github.com/yourusername/ark-asa-backup-web/compare/v1.0.0...v2.0.0
[1.0.0]: https://github.com/yourusername/ark-asa-backup-web/releases/tag/v1.0.0
