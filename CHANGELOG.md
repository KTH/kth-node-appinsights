# Changelog

## [Unreleased]

### Added

- `KthAppinsights.trackEvent({ name, properties, measurements })` to send custom events, replacing
  `applicationinsights`'s `defaultClient.trackEvent`.
- `KthAppinsights.trackMetric({ name, value, properties })` to record custom metrics, replacing
  `applicationinsights`'s `defaultClient.trackMetric`.
- `trackMongoDb` and `trackRedis` options to control MongoDB/Redis dependency tracking (both enabled by default).
  MongoDB tracking is new - it never worked under the previous SDK. The MongoDB command itself (query/update
  document) is never included, since it can contain full document bodies.

### Changed

- Internally rebuilt on the Azure Monitor OpenTelemetry Distro instead of the classic `applicationinsights` SDK.  
  **BREAKING** importing directly from `applicationinsights` will no longer work.

## [0.6.0] - 2025-07-31

### Changed

- Requests to `/assets/` paths is no longer logged.

## [0.5.0] - 2025-07-08

### Added

- Logs the name of the API-key used on requests

## [0.4.0] - 2024-05-21

### Added

- Set sampling rate for an application

## [0.3.0] - 2023-11-23

### Changed

- Requests to `/_monitor` is no longer logged.
- Requests to `/static/` paths is no longer logged.
