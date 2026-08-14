type appinsightOptions = {
  name?: string
  connectionString?: string
  instrumentationKey?: string
  samplingPercentage?: number
}

import { useAzureMonitor, type AzureMonitorOpenTelemetryOptions } from '@azure/monitor-opentelemetry'
import { resourceFromAttributes } from '@opentelemetry/resources'
import type { HttpInstrumentationConfig } from '@opentelemetry/instrumentation-http'
import * as os from 'os'

export * as AppinsightsUtils from './utils'

import { applyCustomAttributesOnSpan, ignoreIncomingRequestHook } from './telemetryProcessors'

const httpInstrumentationConfig: HttpInstrumentationConfig = {
  enabled: true,
  applyCustomAttributesOnSpan,
  ignoreIncomingRequestHook,
}

const init = (options: appinsightOptions) => {
  const connectionString = resolveConnectionString(options)
  if (!connectionString) {
    return
  }

  const azureMonitorOptions: AzureMonitorOpenTelemetryOptions = {
    azureMonitorExporterOptions: { connectionString },
    instrumentationOptions: {
      // Picks up logs from bunyan and winston, but not raw console.log's
      bunyan: { enabled: true },
      winston: { enabled: true },
      http: httpInstrumentationConfig,
    },
  }

  if (options.name) {
    azureMonitorOptions.resource = buildResource(options.name)
  }

  if (options.samplingPercentage != null) {
    azureMonitorOptions.samplingRatio = options.samplingPercentage / 100
  }

  useAzureMonitor(azureMonitorOptions)
}

const resolveConnectionString = (options: appinsightOptions): string | undefined => {
  if (options.connectionString) return options.connectionString
  if (options.instrumentationKey) return `InstrumentationKey=${options.instrumentationKey}`
  if (process.env.APPLICATIONINSIGHTS_CONNECTION_STRING) return process.env.APPLICATIONINSIGHTS_CONNECTION_STRING
  if (process.env.APPINSIGHTS_INSTRUMENTATIONKEY)
    return `InstrumentationKey=${process.env.APPINSIGHTS_INSTRUMENTATIONKEY}`
  return undefined
}

// Cloud Role Name uses the `service.name` resource attribute, and Cloud Role
// Instance uses `service.instance.id` - see
// https://learn.microsoft.com/azure/azure-monitor/app/opentelemetry-configuration#set-the-cloud-role-name-and-the-cloud-role-instance
const buildResource = (name: string) => {
  const attributes: Record<string, string> = { 'service.name': name }

  const hostname = os.hostname?.()
  if (hostname) {
    attributes['service.instance.id'] = `${name}-${hostname}`
  }

  return resourceFromAttributes(attributes)
}

export const KthAppinsights = { init }
