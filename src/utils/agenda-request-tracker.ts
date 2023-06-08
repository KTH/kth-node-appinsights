const appInsights = require('applicationinsights')
const opentelemetry = require('@opentelemetry/api')

const tracer = opentelemetry.trace.getTracer('@kth/appinsights')

export const agendaRequestWrapper = (name: String, operation: Function) => async (job: any, done: Function) => {
  const client = appInsights.defaultClient
  if (!client?.trackRequest) {
    await operation(job, done)
    return
  }

  const operationName = `AGENDA ${name}`
  const repeatInterval = job?.attrs?.repeatInterval
  const startTime = new Date()

  const parentSpan = tracer.startSpan(operationName)
  const correlationContext = appInsights.startOperation(parentSpan)

  return await appInsights.wrapWithCorrelationContext(async () => {
    await operation(job, done)

    const duration = new Date().getTime() - startTime.getTime()

    client?.trackRequest({
      time: startTime,
      duration,
      name: operationName,
      properties: { repeatInterval },
    })
  }, correlationContext)()
}
