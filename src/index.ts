type appinsightOptions = {
  name?: string
  connectionString?: string
  instrumentationKey?: string
  samplingPercentage?: number
}

import * as appInsights from 'applicationinsights'
import * as os from 'os'

export * as AppinsightsUtils from './utils'

import {
  userAgentOnRequest,
  apiKeyNameOnRequest,
  unpackBunyanLog,
  skipStaticRequests,
  skipMonitorRequests,
} from './telemetryProcessors'

const init = (options: appinsightOptions) => {
  if (!anyValidConnection(options)) {
    return
  }
  setupClient(options).setAutoCollectConsole(true, false).start()

  if (options.name) {
    setRoleName(options.name)
    setInstanceName(options.name)
  }

  if (options.samplingPercentage) {
    appInsights.defaultClient.config.samplingPercentage = options.samplingPercentage
  }

  appInsights.defaultClient.addTelemetryProcessor(userAgentOnRequest)
  appInsights.defaultClient.addTelemetryProcessor(apiKeyNameOnRequest)
  appInsights.defaultClient.addTelemetryProcessor(unpackBunyanLog)
  appInsights.defaultClient.addTelemetryProcessor(skipStaticRequests)
  appInsights.defaultClient.addTelemetryProcessor(skipMonitorRequests)
}

const anyValidConnection = (options: appinsightOptions) =>
  process.env.APPLICATIONINSIGHTS_CONNECTION_STRING ||
  process.env.APPINSIGHTS_INSTRUMENTATIONKEY ||
  options.connectionString ||
  options.instrumentationKey

const setupClient = (options: appinsightOptions) =>
  options.connectionString || options.instrumentationKey
    ? appInsights.setup(options.connectionString || options.instrumentationKey)
    : appInsights.setup()

const setRoleName = (name: string) => {
  appInsights.defaultClient.context.tags['ai.cloud.role'] = name
}
const setInstanceName = (name: string) => {
  if (!os.hostname?.()) {
    return
  }
  appInsights.defaultClient.context.tags['ai.cloud.roleInstance'] = `${name}-${os.hostname()}`
}

export const KthAppinsights = { init }
