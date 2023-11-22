import * as appInsights from 'applicationinsights'

export const userAgentOnRequest = (envelope: appInsights.Contracts.EnvelopeTelemetry, correlationContext: any = {}) => {
  if (envelope.data?.baseType === 'RequestData') {
    const code = correlationContext?.['http.ServerResponse']?.statusCode

    const userAgent = correlationContext?.['http.ServerRequest']?.get?.('user-agent')
    if (userAgent) {
      if (!envelope.data.baseData) {
        envelope.data.baseData = {}
      }
      if (!envelope.data.baseData.properties) {
        envelope.data.baseData.properties = {}
      }

      envelope.data.baseData.properties.user_agent = userAgent
    }
  }
  return true
}

// Bynyan messages (used by @kth/log) are structured like { name: "my-app", level: 30, msg: "the important part" }
// This keeps only the "msg" field, as the rest of the data is duplicated by applicationinsights
export const unpackBunyanLog = (envelope: appInsights.Contracts.EnvelopeTelemetry) => {
  if (envelope.data?.baseType === 'MessageData') {
    try {
      if (!envelope.data.baseData?.message) return true

      const originalMessage = JSON.parse(envelope.data.baseData?.message || '')

      if (originalMessage.msg && originalMessage.name && originalMessage.level) {
        envelope.data.baseData.message = originalMessage.msg
      }
    } catch (e) {
      return true
    }
  }
  return true
}

// Igore logging any requests to static resources
// If url matches /<something>/static/<something>
export const skipStaticRequests = (envelope: appInsights.Contracts.EnvelopeTelemetry) => {
  try {
    if (envelope.data?.baseType !== 'RequestData') return true
    if (!envelope.data.baseData?.url) return true

    if (envelope.data.baseData?.name.includes('GET ') && /\/[\w\-.]+\/static\/\w+/.test(envelope.data.baseData?.url)) {
      return false
    }
  } catch (e) {
    return true
  }
  return true
}
