import * as appInsights from 'applicationinsights'
import * as opentelemetry from '@opentelemetry/api'

const tracer = opentelemetry.trace.getTracer('@kth/appinsights')

const operationIsSuccessfull = (job: any) => {
  if (!job?.attrs?.failedAt) return true

  return job?.attrs?.failedAt != job?.attrs?.lastFinishedAt
}

export const agendaRequestWrapper = (name: String, operation: Function) => async (job: any, done: Function) => {
  const client = appInsights.defaultClient

  const operationName = `AGENDA ${name}`
  const repeatInterval = job?.attrs?.repeatInterval
  const startTime = new Date()

  const parentSpan = tracer.startSpan(operationName) as unknown as opentelemetry.SpanContext
  const correlationContext = appInsights.startOperation(parentSpan, operationName)

  if (!client?.trackRequest || !correlationContext || !parentSpan) {
    await operation(job, done)
    return
  }

  return await appInsights.wrapWithCorrelationContext(async () => {
    await operation(job, done)

    const duration = new Date().getTime() - startTime.getTime()

    const success = operationIsSuccessfull(job)

    client?.trackRequest({
      time: startTime,
      duration,
      name: operationName,
      properties: { repeatInterval },
      url: '',
      resultCode: '',
      success,
    })
  }, correlationContext)()
}
