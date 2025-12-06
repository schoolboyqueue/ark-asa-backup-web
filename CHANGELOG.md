# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0](https://github.com/schoolboyqueue/ark-asa-backup-web/compare/ark-asa-backup-web-v0.1.0...ark-asa-backup-web-v1.0.0) (2025-12-06)


### ⚠ BREAKING CHANGES

* Reorganized server from technical layers to domain-driven structure

### Features

* add transitional server states (starting/stopping) for better UX ([8c87005](https://github.com/schoolboyqueue/ark-asa-backup-web/commit/8c87005633671b9455af598048df02809f176807))
* add version display in System Status popover ([e454ea2](https://github.com/schoolboyqueue/ark-asa-backup-web/commit/e454ea20f6943bdcd837a17249b09136b7f7a97c))
* **ark-asa-backup-server:** improve logger with request context ([fabcb3f](https://github.com/schoolboyqueue/ark-asa-backup-web/commit/fabcb3fed6e33a8d8bdfc011cb6344a4c9960903))
* consolidates prettier configs and adds a logger util for server to ensure consistant logging ([64f98e5](https://github.com/schoolboyqueue/ark-asa-backup-web/commit/64f98e577c05bcda7cc2e2fccbc836e9fe2c938d))
* extract ARK save info from backups with auto-tag suggestions ([1eab139](https://github.com/schoolboyqueue/ark-asa-backup-web/commit/1eab139f338603fe0a21dd822032d712b4d23394))
* implement Clean Architecture and automated linting ([3b0c46c](https://github.com/schoolboyqueue/ark-asa-backup-web/commit/3b0c46cad761db27168ab7ea8afa5e9daf280b31))
* implement unified SSE architecture and UI improvements ([ca9bbfa](https://github.com/schoolboyqueue/ark-asa-backup-web/commit/ca9bbfa42d44f8659350a4d442593161a3f3682d))
* initial commit of ARK ASA Backup Manager ([84a9275](https://github.com/schoolboyqueue/ark-asa-backup-web/commit/84a92756f5f29ab8a6f3ce9e09508d0598fca49f))
* moved baseline from SSE to http streaming ([e553821](https://github.com/schoolboyqueue/ark-asa-backup-web/commit/e5538216d1c2f155d80153646bba5bc47dcc1dfa))
* switch release workflow from npm to Docker build verification ([6179b09](https://github.com/schoolboyqueue/ark-asa-backup-web/commit/6179b09b5ef0f28715f854b370ed0c9c6d52919d))


### Bug Fixes

* auto-refresh relative time displays every 30 seconds ([e932741](https://github.com/schoolboyqueue/ark-asa-backup-web/commit/e932741c631aee9c5ad5943f59ddf23a3e9055b1))
* correct release workflow to use check output ([55c0e7a](https://github.com/schoolboyqueue/ark-asa-backup-web/commit/55c0e7a860e07ce4b18add14361bc9677247dea2))
* fetch all git history and tags in release workflow ([32bedc5](https://github.com/schoolboyqueue/ark-asa-backup-web/commit/32bedc5280db7fe09c8af34ff167140a9ecc850d))
* improve logger robustness and features ([55193a3](https://github.com/schoolboyqueue/ark-asa-backup-web/commit/55193a3900d2d8504503cd154c3162f6ffbf0447))
* improve NumberFlow alignment and simplify copy button feedback ([f1ed944](https://github.com/schoolboyqueue/ark-asa-backup-web/commit/f1ed9444e3d3cebd6985f9197375fc9bcb080052))
* prevent duplicate release PRs after merge ([b3507cc](https://github.com/schoolboyqueue/ark-asa-backup-web/commit/b3507cc94769df04929c8b5fb600f6249e9bd430))
* **release:** remove fetch-depth to prevent unshallow conflict in release workflow ([9cf9b24](https://github.com/schoolboyqueue/ark-asa-backup-web/commit/9cf9b242517448ea6777098508c085f68e1900f7))
* resolve graceful shutdown timeout and add missing HeroUI theme dependency ([95067b0](https://github.com/schoolboyqueue/ark-asa-backup-web/commit/95067b04fa9a890f31e5eb2258f28783662a44f0))
* stabilize SSE callbacks to prevent missed real-time updates ([efaba68](https://github.com/schoolboyqueue/ark-asa-backup-web/commit/efaba6869e677cb3be41fa3e86d87285afc0876d))


### Performance

* optimize Docker image size by removing unnecessary build tools ([94495af](https://github.com/schoolboyqueue/ark-asa-backup-web/commit/94495af411d3a9209b27db186ea5c8792961cb66))


### Documentation

* add comprehensive Claude Code development guide ([ea14f5a](https://github.com/schoolboyqueue/ark-asa-backup-web/commit/ea14f5ae080086c89dba8fdb8ceec093a260d556))
* add comprehensive JSDoc to logger utility ([e506b31](https://github.com/schoolboyqueue/ark-asa-backup-web/commit/e506b313220185237f54b9dcdfa7dc03d6de6f50))
* move unreleased changes to 3.0.0 release ([fc85e8e](https://github.com/schoolboyqueue/ark-asa-backup-web/commit/fc85e8e26ed1a74d1f173c4dd2dd8ae007168ac1))
* remove duplicate 3.0.0 changelog entries ([e7646a3](https://github.com/schoolboyqueue/ark-asa-backup-web/commit/e7646a37abb29fa016299f05d07c6b160d6d083a))
* remove duplicate 3.0.0 changelog entry ([5be8aeb](https://github.com/schoolboyqueue/ark-asa-backup-web/commit/5be8aebbcd63dcfbd149c1c6c280dde2c8f1c48b))
* restore conventional commits format in changelog ([da46aa5](https://github.com/schoolboyqueue/ark-asa-backup-web/commit/da46aa5a2ec4bb59bd9adc08200c135e33944a74))


### Miscellaneous

* added automated commit, changelog, and release notes ([b4c6b86](https://github.com/schoolboyqueue/ark-asa-backup-web/commit/b4c6b86bbcecf6650d51ca9ec390e1dd5a48267b))
* **deps:** migrate to pnpm workspace ([680550e](https://github.com/schoolboyqueue/ark-asa-backup-web/commit/680550e486f6eba0ae0a5e179bf316bea16ba339))
* **deps:** migrate to pnpm workspace ([4f78679](https://github.com/schoolboyqueue/ark-asa-backup-web/commit/4f7867962eebf6181f7a35bc8fbfc2a23ddd657a))
* optimize package.json files and remove duplicate dependencies ([dc5224a](https://github.com/schoolboyqueue/ark-asa-backup-web/commit/dc5224ad31f770eeb12ba4317673742d75a48342))
* **release:** 3.0.0 ([b7d9a7d](https://github.com/schoolboyqueue/ark-asa-backup-web/commit/b7d9a7df7d91eeb87dd0a37977a4282d01bcdf22))
* **release:** 3.0.0 ([d220b74](https://github.com/schoolboyqueue/ark-asa-backup-web/commit/d220b74ddb00f6c39ed5f3029ba5ffe85a4dffa9))
* **release:** 3.0.0 ([89481e8](https://github.com/schoolboyqueue/ark-asa-backup-web/commit/89481e8aa15dc3dabfaca4ea1eabe8c3cf1a287f))
* **release:** 3.0.0 ([197592a](https://github.com/schoolboyqueue/ark-asa-backup-web/commit/197592afeae60d788dbd1fd0d693d7a2b2250156))
* **release:** 3.0.0 ([ecdbf24](https://github.com/schoolboyqueue/ark-asa-backup-web/commit/ecdbf24402c3e86dace59d5f92dff2e2bd3f8ef0))
* **release:** 3.0.0 ([a9934ab](https://github.com/schoolboyqueue/ark-asa-backup-web/commit/a9934abb899dc7ac2536fc41c4dc30e4e4d65b89))
* **release:** 3.0.0 ([2a40048](https://github.com/schoolboyqueue/ark-asa-backup-web/commit/2a4004878265d542ab0defa422e19140298db4e0))
* **release:** 3.0.0 ([6175c03](https://github.com/schoolboyqueue/ark-asa-backup-web/commit/6175c038a870829b93ad87372b6b1d4e44f60eaa))
* **release:** 3.0.0 ([ea4b84d](https://github.com/schoolboyqueue/ark-asa-backup-web/commit/ea4b84d54f857c6f881dc8e63de7b08a9a434d3f))
* **release:** 3.0.0 ([6d55563](https://github.com/schoolboyqueue/ark-asa-backup-web/commit/6d555634f39bbc99d35b4243a140ecc1249e93e2))
* **release:** 3.0.0 ([12e562a](https://github.com/schoolboyqueue/ark-asa-backup-web/commit/12e562aa5d1b5680f21c5d6b31d98bfe0896a5ce))
* **release:** 3.0.0 ([5dea5f2](https://github.com/schoolboyqueue/ark-asa-backup-web/commit/5dea5f20da650c4f8f981c73cd5a4eb380317916))
* **release:** 3.0.0 ([7d6d6ef](https://github.com/schoolboyqueue/ark-asa-backup-web/commit/7d6d6efdf75f953ca6099316476469e661c15c73))
* **release:** 3.0.0 ([a1d7406](https://github.com/schoolboyqueue/ark-asa-backup-web/commit/a1d7406ecb163c5673a7b30ab934c893033f3bd9))
* **release:** 3.0.0 ([62bce85](https://github.com/schoolboyqueue/ark-asa-backup-web/commit/62bce859c9e06c6d7666a6109e584e3382fc2e99))
* **release:** 3.0.0 ([4876b67](https://github.com/schoolboyqueue/ark-asa-backup-web/commit/4876b6720b1016219e192c865c1eefd5673690f2))
* **release:** 3.0.0 ([046a006](https://github.com/schoolboyqueue/ark-asa-backup-web/commit/046a0063ddfc4013080b5687ceb936aec33597a5))
* **release:** 3.0.0 ([c5458a3](https://github.com/schoolboyqueue/ark-asa-backup-web/commit/c5458a3cbeee176940a26bb98eb55f9f1c51c7ae))
* **release:** 3.0.0 ([#15](https://github.com/schoolboyqueue/ark-asa-backup-web/issues/15)) ([fd61191](https://github.com/schoolboyqueue/ark-asa-backup-web/commit/fd61191c9950385fe3327fc759fd1daaae65b75a))
* **release:** fix husky pre-commit script ([b078aed](https://github.com/schoolboyqueue/ark-asa-backup-web/commit/b078aedbd5d7dad4036c523bd8f8c654b38eb56c))
* remove old simple release config ([63730da](https://github.com/schoolboyqueue/ark-asa-backup-web/commit/63730dac1dbd4d3ccce10e67d1d096aea4c3653d))
* remove simple-release dependencies and references ([958022c](https://github.com/schoolboyqueue/ark-asa-backup-web/commit/958022cb402e859817d56142be406cfcca87e653))
* remove test file for pre-commit hook verification ([bbd2669](https://github.com/schoolboyqueue/ark-asa-backup-web/commit/bbd26691d71a716e17aff50604f8fec86b3d1d06))
* removed old changelog files ([8052e3c](https://github.com/schoolboyqueue/ark-asa-backup-web/commit/8052e3c6a05000906952582073680f690d90beeb))
* **streaming:** migrate SSE to HTTP NDJSON streams; update client hook and adapters; docs ([0a83469](https://github.com/schoolboyqueue/ark-asa-backup-web/commit/0a834692bfd51e6f38e69d9140ef268829ebef9e))
* update github action workflow ([3192ab0](https://github.com/schoolboyqueue/ark-asa-backup-web/commit/3192ab01f40cd033ed279349a00bdc26d36bbdce))
* updated gitignore to not ignore the configs directories and files that should be commited ([8abb095](https://github.com/schoolboyqueue/ark-asa-backup-web/commit/8abb0958cf6821d05b669c8916bee67dd57b16f8))
* updated husky config to be compatible with new cz workflow ([6fccf12](https://github.com/schoolboyqueue/ark-asa-backup-web/commit/6fccf12f22f200e2622c11251d99742faf2a4eab))


### Refactoring

* consolidate server domains and complete domain-driven architecture ([3b79c8e](https://github.com/schoolboyqueue/ark-asa-backup-web/commit/3b79c8e8972b2aa190636cb6a382b7252ec408fd))
* replace dayjs with native Intl APIs and pretty-bytes ([c0d1fd5](https://github.com/schoolboyqueue/ark-asa-backup-web/commit/c0d1fd57048a5e5c1d533a8d4b42416022b28152))
* **server:** improve error handling and reduce logging verbosity per Tao of Node ([8d44271](https://github.com/schoolboyqueue/ark-asa-backup-web/commit/8d4427102c371e6ca77fb6fb50478e89553efbdc))

## [Unreleased]

### Changed

* **BREAKING**: Migrated from Server-Sent Events (SSE) to HTTP Streaming with NDJSON format
  - Backend now uses `application/x-ndjson` content type for streaming
  - Frontend uses Fetch API with ReadableStream instead of EventSource
  - Improved reconnection logic with exponential backoff
  - Better error handling and resource management
  - See `MIGRATION_SSE_TO_HTTP_STREAMING.md` for detailed migration guide
* Renamed server utilities: `sseStream.ts` → `httpStream.ts`
* Renamed server routes: `sseRoutes.ts` → `streamRoutes.ts`
* Renamed client hook: `useUnifiedSSE.ts` → `useUnifiedStream.ts` (backward compatible alias maintained)


## 3.0.0 (2025-11-30)

### Features

* add transitional server states (starting/stopping) for better UX ([8c87005](https://github.com/schoolboyqueue/ark-asa-backup-web/commit/8c87005633671b9455af598048df02809f176807))
* add version display in System Status popover ([e454ea2](https://github.com/schoolboyqueue/ark-asa-backup-web/commit/e454ea20f6943bdcd837a17249b09136b7f7a97c))
* **ark-asa-backup-server:** improve logger with request context ([fabcb3f](https://github.com/schoolboyqueue/ark-asa-backup-web/commit/fabcb3fed6e33a8d8bdfc011cb6344a4c9960903))
* consolidates prettier configs and adds a logger util for server to ensure consistant logging ([64f98e5](https://github.com/schoolboyqueue/ark-asa-backup-web/commit/64f98e577c05bcda7cc2e2fccbc836e9fe2c938d))
* extract ARK save info from backups with auto-tag suggestions ([1eab139](https://github.com/schoolboyqueue/ark-asa-backup-web/commit/1eab139f338603fe0a21dd822032d712b4d23394))
* implement Clean Architecture and automated linting ([3b0c46c](https://github.com/schoolboyqueue/ark-asa-backup-web/commit/3b0c46cad761db27168ab7ea8afa5e9daf280b31))
* implement unified SSE architecture and UI improvements ([ca9bbfa](https://github.com/schoolboyqueue/ark-asa-backup-web/commit/ca9bbfa42d44f8659350a4d442593161a3f3682d))
* initial commit of ARK ASA Backup Manager ([84a9275](https://github.com/schoolboyqueue/ark-asa-backup-web/commit/84a92756f5f29ab8a6f3ce9e09508d0598fca49f))

### Bug Fixes

* auto-refresh relative time displays every 30 seconds ([e932741](https://github.com/schoolboyqueue/ark-asa-backup-web/commit/e932741c631aee9c5ad5943f59ddf23a3e9055b1))
* correct release workflow to use check output ([55c0e7a](https://github.com/schoolboyqueue/ark-asa-backup-web/commit/55c0e7a860e07ce4b18add14361bc9677247dea2))
* improve logger robustness and features ([55193a3](https://github.com/schoolboyqueue/ark-asa-backup-web/commit/55193a3900d2d8504503cd154c3162f6ffbf0447))
* improve NumberFlow alignment and simplify copy button feedback ([f1ed944](https://github.com/schoolboyqueue/ark-asa-backup-web/commit/f1ed9444e3d3cebd6985f9197375fc9bcb080052))
* prevent duplicate release PRs after merge ([b3507cc](https://github.com/schoolboyqueue/ark-asa-backup-web/commit/b3507cc94769df04929c8b5fb600f6249e9bd430))
* resolve graceful shutdown timeout and add missing HeroUI theme dependency ([95067b0](https://github.com/schoolboyqueue/ark-asa-backup-web/commit/95067b04fa9a890f31e5eb2258f28783662a44f0))
* stabilize SSE callbacks to prevent missed real-time updates ([efaba68](https://github.com/schoolboyqueue/ark-asa-backup-web/commit/efaba6869e677cb3be41fa3e86d87285afc0876d))

### Performance Improvements

* optimize Docker image size by removing unnecessary build tools ([94495af](https://github.com/schoolboyqueue/ark-asa-backup-web/commit/94495af411d3a9209b27db186ea5c8792961cb66))
