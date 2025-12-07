# Changelog

## [0.2.5](https://github.com/schoolboyqueue/ark-asa-backup-web/compare/ark-asa-backup-client-v0.2.4...ark-asa-backup-client-v0.2.5) (2025-12-07)


### Bug Fixes

* fixes broken tables. HeroUI tables are a pain ([75630d6](https://github.com/schoolboyqueue/ark-asa-backup-web/commit/75630d6c6bddfe5823b7472ebe810471e79ac07c))

## [0.2.4](https://github.com/schoolboyqueue/ark-asa-backup-web/compare/ark-asa-backup-client-v0.2.3...ark-asa-backup-client-v0.2.4) (2025-12-06)


### Bug Fixes

* resolve HeroUI Table component issues and improve stream error handling ([b3669cd](https://github.com/schoolboyqueue/ark-asa-backup-web/commit/b3669cda2a974f6aeb8786579741e31805cb33aa))


### Refactoring

* replace nested ternary with if-else statements in BackupsList ([9b19e15](https://github.com/schoolboyqueue/ark-asa-backup-web/commit/9b19e15a5c1d2eddf7f869a07ad69e7c60515ce0))

## [0.2.3](https://github.com/schoolboyqueue/ark-asa-backup-web/compare/ark-asa-backup-client-v0.2.2...ark-asa-backup-client-v0.2.3) (2025-12-06)


### Bug Fixes

* resolve HeroUI Table getCollectionNode error ([3942112](https://github.com/schoolboyqueue/ark-asa-backup-web/commit/39421129a4899f64a3a27d2242a6516c12f3fe08))

## [0.2.2](https://github.com/schoolboyqueue/ark-asa-backup-web/compare/ark-asa-backup-client-v0.2.1...ark-asa-backup-client-v0.2.2) (2025-12-06)


### Bug Fixes

* resolve all SonarQube code quality issues ([70b0cc5](https://github.com/schoolboyqueue/ark-asa-backup-web/commit/70b0cc57cb06d865826e0a1f071c42da539d5b5d))

## [0.2.1](https://github.com/schoolboyqueue/ark-asa-backup-web/compare/ark-asa-backup-client-v0.2.0...ark-asa-backup-client-v0.2.1) (2025-12-06)


### Bug Fixes

* correct changelog paths in release-please config ([dc98729](https://github.com/schoolboyqueue/ark-asa-backup-web/commit/dc9872953bf2550f20df73012bec82615a7ae386))

## [0.2.0](https://github.com/schoolboyqueue/ark-asa-backup-web/compare/ark-asa-backup-client-v0.1.0...ark-asa-backup-client-v0.2.0) (2025-12-06)


### Features

* add transitional server states (starting/stopping) for better UX ([8c87005](https://github.com/schoolboyqueue/ark-asa-backup-web/commit/8c87005633671b9455af598048df02809f176807))
* add version display in System Status popover ([e454ea2](https://github.com/schoolboyqueue/ark-asa-backup-web/commit/e454ea20f6943bdcd837a17249b09136b7f7a97c))
* consolidates prettier configs and adds a logger util for server to ensure consistant logging ([64f98e5](https://github.com/schoolboyqueue/ark-asa-backup-web/commit/64f98e577c05bcda7cc2e2fccbc836e9fe2c938d))
* extract ARK save info from backups with auto-tag suggestions ([1eab139](https://github.com/schoolboyqueue/ark-asa-backup-web/commit/1eab139f338603fe0a21dd822032d712b4d23394))
* implement Clean Architecture and automated linting ([3b0c46c](https://github.com/schoolboyqueue/ark-asa-backup-web/commit/3b0c46cad761db27168ab7ea8afa5e9daf280b31))
* implement unified SSE architecture and UI improvements ([ca9bbfa](https://github.com/schoolboyqueue/ark-asa-backup-web/commit/ca9bbfa42d44f8659350a4d442593161a3f3682d))
* moved baseline from SSE to http streaming ([e553821](https://github.com/schoolboyqueue/ark-asa-backup-web/commit/e5538216d1c2f155d80153646bba5bc47dcc1dfa))


### Bug Fixes

* auto-refresh relative time displays every 30 seconds ([e932741](https://github.com/schoolboyqueue/ark-asa-backup-web/commit/e932741c631aee9c5ad5943f59ddf23a3e9055b1))
* improve NumberFlow alignment and simplify copy button feedback ([f1ed944](https://github.com/schoolboyqueue/ark-asa-backup-web/commit/f1ed9444e3d3cebd6985f9197375fc9bcb080052))
* resolve graceful shutdown timeout and add missing HeroUI theme dependency ([95067b0](https://github.com/schoolboyqueue/ark-asa-backup-web/commit/95067b04fa9a890f31e5eb2258f28783662a44f0))
* stabilize SSE callbacks to prevent missed real-time updates ([efaba68](https://github.com/schoolboyqueue/ark-asa-backup-web/commit/efaba6869e677cb3be41fa3e86d87285afc0876d))


### Miscellaneous

* added automated commit, changelog, and release notes ([b4c6b86](https://github.com/schoolboyqueue/ark-asa-backup-web/commit/b4c6b86bbcecf6650d51ca9ec390e1dd5a48267b))
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
* remove test file for pre-commit hook verification ([bbd2669](https://github.com/schoolboyqueue/ark-asa-backup-web/commit/bbd26691d71a716e17aff50604f8fec86b3d1d06))
* removed old changelog files ([8052e3c](https://github.com/schoolboyqueue/ark-asa-backup-web/commit/8052e3c6a05000906952582073680f690d90beeb))
* **streaming:** migrate SSE to HTTP NDJSON streams; update client hook and adapters; docs ([0a83469](https://github.com/schoolboyqueue/ark-asa-backup-web/commit/0a834692bfd51e6f38e69d9140ef268829ebef9e))


### Refactoring

* replace dayjs with native Intl APIs and pretty-bytes ([c0d1fd5](https://github.com/schoolboyqueue/ark-asa-backup-web/commit/c0d1fd57048a5e5c1d533a8d4b42416022b28152))
