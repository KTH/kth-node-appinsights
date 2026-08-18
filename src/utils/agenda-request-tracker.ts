import { trace, context, SpanKind, SpanStatusCode } from '@opentelemetry/api'

const operationIsSuccessfull = (job: any) => {
  if (!job?.attrs?.failedAt) return true

  return job?.attrs?.failedAt != job?.attrs?.lastFinishedAt
}

export const agendaRequestWrapper = (name: String, operation: Function) => async (job: any, done: Function) => {
  const operationName = `AGENDA ${name}`
  const repeatInterval = job?.attrs?.repeatInterval

  const tracer = trace.getTracer('@kth/appinsights')
  const span = tracer.startSpan(operationName, { kind: SpanKind.SERVER, attributes: { repeatInterval } })

  return context.with(trace.setSpan(context.active(), span), async () => {
    try {
      await operation(job, done)
    } catch (error) {
      span.recordException(error as Error)
      throw error
    } finally {
      span.setStatus({ code: operationIsSuccessfull(job) ? SpanStatusCode.OK : SpanStatusCode.ERROR })
      span.end()
    }
  })
}
