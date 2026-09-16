import { trace, SpanKind, SpanStatusCode, type Attributes } from '@opentelemetry/api'

// Attributes from the stable HTTP semantic conventions. The exporter maps them
// to the native fields of an "HTTP" dependency - see
// https://opentelemetry.io/docs/specs/semconv/http/http-spans/#http-client-span
const HTTP_REQUEST_METHOD_ATTRIBUTE = 'http.request.method'
const URL_FULL_ATTRIBUTE = 'url.full'
const HTTP_RESPONSE_STATUS_CODE_ATTRIBUTE = 'http.response.status_code'
const SERVER_ADDRESS_ATTRIBUTE = 'server.address'
const SERVER_PORT_ATTRIBUTE = 'server.port'

type TrackHttpDependencyOptions = {
  url: string
  duration: number
  method?: string
  statusCode?: number
  success?: boolean
  name?: string
  properties?: Record<string, unknown>
}

const parseUrl = (url: string) => {
  try {
    return new URL(url)
  } catch {
    return undefined
  }
}

// Status codes below 400 are considered successful, same as Application Insights
// does for auto-collected requests and dependencies.
const isSuccessfulStatusCode = (statusCode?: number) => statusCode == null || statusCode < 400

const buildAttributes = (
  httpMethod: string,
  url: string,
  statusCode?: number,
  properties?: Record<string, unknown>
) => {
  const attributes: Attributes = {
    ...properties,
    [HTTP_REQUEST_METHOD_ATTRIBUTE]: httpMethod,
    [URL_FULL_ATTRIBUTE]: url,
  }

  if (statusCode != null) {
    attributes[HTTP_RESPONSE_STATUS_CODE_ATTRIBUTE] = statusCode
  }

  // The host is used as "Target", which otherwise falls back to the whole url
  const parsedUrl = parseUrl(url)
  if (parsedUrl) {
    attributes[SERVER_ADDRESS_ATTRIBUTE] = parsedUrl.hostname

    if (parsedUrl.port) {
      attributes[SERVER_PORT_ATTRIBUTE] = Number(parsedUrl.port)
    }
  }

  return attributes
}

// The exporter names the dependency "<method> <path>", do the same for the
// cases where it can't parse the url itself.
const buildSpanName = (httpMethod: string, url: string) => `${httpMethod} ${parseUrl(url)?.pathname ?? url}`

export const trackHttpDependency = ({
  url,
  duration,
  method = 'GET',
  statusCode,
  success,
  name,
  properties,
}: TrackHttpDependencyOptions) => {
  const tracer = trace.getTracer('@kth/appinsights')
  const endTime = Date.now()

  const httpMethod = method.toUpperCase()

  const span = tracer.startSpan(name ?? buildSpanName(httpMethod, url), {
    kind: SpanKind.CLIENT,
    startTime: endTime - duration,
    attributes: buildAttributes(httpMethod, url, statusCode, properties),
  })

  span.setStatus({ code: (success ?? isSuccessfulStatusCode(statusCode)) ? SpanStatusCode.OK : SpanStatusCode.ERROR })
  span.end(endTime)
}
