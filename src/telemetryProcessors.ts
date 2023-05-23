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
