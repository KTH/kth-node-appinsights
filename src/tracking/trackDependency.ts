import { trace, SpanKind, SpanStatusCode } from '@opentelemetry/api'

const DB_SYSTEM_ATTRIBUTE = 'db.system'
const DB_STATEMENT_ATTRIBUTE = 'db.statement'

type TrackDependencyOptions = {
  name: string
  dependencyTypeName: string
  data: string
  duration: number
  resultCode: string | number
  success: boolean
  properties?: Record<string, unknown>
}

export const trackDependency = ({
  name,
  dependencyTypeName,
  data,
  duration,
  resultCode,
  success,
  properties,
}: TrackDependencyOptions) => {
  const tracer = trace.getTracer('@kth/appinsights')
  const endTime = Date.now()

  const span = tracer.startSpan(name, {
    kind: SpanKind.CLIENT,
    startTime: endTime - duration,
    attributes: {
      ...properties,
      // Using db.* attributes to get Type/Command mapped to native fields
      [DB_SYSTEM_ATTRIBUTE]: dependencyTypeName,
      [DB_STATEMENT_ATTRIBUTE]: data,
      dependency_result_code: String(resultCode),
    },
  })

  span.setStatus({ code: success ? SpanStatusCode.OK : SpanStatusCode.ERROR })
  span.end(endTime)
}
