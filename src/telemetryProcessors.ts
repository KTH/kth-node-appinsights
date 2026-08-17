import { ClientRequest, IncomingMessage, ServerResponse } from 'http'
import type { Span } from '@opentelemetry/api'
import type { DbStatementSerializer } from '@opentelemetry/instrumentation-mongodb'

// Adds the request's user-agent header as a custom property.
const setUserAgent = (span: Span, request: IncomingMessage) => {
  const userAgent = request.headers['user-agent']
  if (userAgent) {
    span.setAttribute('user_agent', userAgent)
  }
}

// Saves the name of the API-key used on request, if it exists.
// Keys are set on the request object by the kth-node-api-key-strategy package,
// which runs as middleware after the span has already been started - so this can
// only be read once the response is on its way out, not from the earlier requestHook.
const setApiKeyName = (span: Span, request: IncomingMessage) => {
  const keyName = (request as IncomingMessage & { apiClient?: { name?: string } }).apiClient?.name
  if (keyName) {
    span.setAttribute('api_key_name', keyName)
  }
}

export const applyCustomAttributesOnSpan = (
  span: Span,
  request: ClientRequest | IncomingMessage,
  _response: IncomingMessage | ServerResponse
) => {
  if (!(request instanceof IncomingMessage)) return

  setUserAgent(span, request)
  setApiKeyName(span, request)
}

// Ignore tracing GET requests to static resources and assets
// If url matches /<something>/static/<something>
// If url matches /<something>/assets/<something>
const isResourceRequest = (request: IncomingMessage) =>
  request.method === 'GET' &&
  !!request.url &&
  (/\/[\w\-.]+\/static\/\w+/.test(request.url) || /\/[\w\-.]+\/assets\/\w+/.test(request.url))

// Ignore tracing GET requests to /_monitor
const isMonitorRequest = (request: IncomingMessage) =>
  request.method === 'GET' && !!request.url && request.url.includes('/_monitor')

export const ignoreIncomingRequestHook = (request: IncomingMessage) =>
  isResourceRequest(request) || isMonitorRequest(request)

// Never include the MongoDB "command" in telemetry
export const hideDbStatement = (() => undefined) as unknown as DbStatementSerializer
