# @kth/appinsights

A wrapper to send telemetry to Azure Application Insights, based on the [@azure/monitor-opentelemetry](https://www.npmjs.com/package/@azure/monitor-opentelemetry) package.

This is intended for a standard use-case only. If your app needs more options, please use the core package instead.

## Usage

This package works by injecting code that captures telemetry from the application.
To get full tracking, this package should be initialized as soon as possible in the code.

```typescript
import { KthAppinsights } from '@kth/appinsights'

KthAppinsights.init({ name: 'app-name' })
```

Options

```typescript
type appinsightOptions = {
  name?: string // Optional. Name of the application
  samplingPercentage?: number // Optional. Reduce the amount of telemetry collected
  trackMongoDb?: boolean // Optional. Set to false to disable MongoDB tracking. Default true
  trackRedis?: boolean // Optional. Set to false to disable Redis tracking. Default true
}
```

## Features

### Name and Instance name.

The if `name` is passed in the options, it will be used to set "Cloud role name" and "Cloud role instance".

### User agent on requests

If a request has the `user-agent` header set, it will be saved in the custom property `user_agent`.

### Bunyan and Winston logs

Log records from Bunyan (used by @kth/log) and Winston are automatically collected as OpenTelemetry logs.

### Telemetry Sampling

Used to reduce the amount of telemetry collected, primary used to reduce cost.
Enable with option `samplingPercentage`. Default is 100% = everything is collected.

### MongoDB and Redis tracking

MongoDB and Redis dependency calls are tracked by default. Disable either with `trackMongoDb: false` or
`trackRedis: false`.

### Custom dependencies

Track a call to something not already auto-collected (HTTP, MongoDB, Redis, ...), which shows up in Application
Insights' `Dependencies` view.

```typescript
KthAppinsights.trackDependency({
  name: 'findData',
  dependencyTypeName: 'External Service', // Shows as "Type"
  data: 'id: 1234', // Shows as "Command"
  success: true,
  duration: 5, // milliseconds
  resultCode: 200, // Maps to a custom field
})
```

### Custom events

Send a custom event, which shows up in Application Insights' `customEvents` table.

```typescript
KthAppinsights.trackEvent({
  name: 'search',
  properties: { searchOrigin: 'header', queryIn: 'test query' },
})
```

### Custom metrics

Record a custom metric value, which shows up in Application Insights' `customMetrics` table.

```typescript
KthAppinsights.trackMetric({
  name: 'api_lookup',
  value: 21,
})
```

### Shutdown

Force-send any buffered telemetry when app is shut down.

```typescript
process.on('SIGTERM', async () => {
  await KthAppinsights.shutdown()
  process.exit(0)
})
```

### Track operations for Agenda jobs

**This is not intended to be used on all agenda jobs. Only use ut when there is an actuall need.**  
A helper that groups all events in a agenda-jobb in a tracable operation.

Example:

```typescript
const { AppinsightsUtils } = require('@kth/appinsights')

agenda.define('operation_name', AppinsightsUtils.agendaRequestWrapper('operation_name', jobFunction))
```
