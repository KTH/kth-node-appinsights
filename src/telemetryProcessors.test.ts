import { IncomingMessage, ClientRequest, ServerResponse } from 'http'
import type { Span } from '@opentelemetry/api'

import {
  setUserAgent,
  setApiKeyName,
  applyCustomAttributesOnSpan,
  isResourceRequest,
  isMonitorRequest,
  ignoreIncomingRequestHook,
} from './telemetryProcessors'

const fakeSpan = (): Span => ({ setAttribute: jest.fn() }) as unknown as Span

const incomingRequest = (overrides: Partial<IncomingMessage> & Record<string, any> = {}): IncomingMessage =>
  Object.assign(Object.create(IncomingMessage.prototype), { headers: {}, ...overrides })

const fakeResponse = (): ServerResponse => Object.create(ServerResponse.prototype)

describe('Telemetry procesors', () => {
  describe('setUserAgent', () => {
    it('sets user_agent attribute if the header exists', () => {
      const span = fakeSpan()
      setUserAgent(span, incomingRequest({ headers: { 'user-agent': 'test_agent' } }))
      expect(span.setAttribute).toHaveBeenCalledWith('user_agent', 'test_agent')
    })
    it('does not set user_agent if the header is missing', () => {
      const span = fakeSpan()
      setUserAgent(span, incomingRequest({ headers: {} }))
      expect(span.setAttribute).not.toHaveBeenCalled()
    })
  })

  describe('setApiKeyName', () => {
    it('sets api_key_name if apiClient information exists on the request', () => {
      const span = fakeSpan()
      setApiKeyName(span, incomingRequest({ apiClient: { name: 'test_key' } }))
      expect(span.setAttribute).toHaveBeenCalledWith('api_key_name', 'test_key')
    })
    it('does not set api_key_name if apiClient is missing', () => {
      const span = fakeSpan()
      setApiKeyName(span, incomingRequest({}))
      expect(span.setAttribute).not.toHaveBeenCalled()
    })
    it('does not set api_key_name if apiClient lacks a name', () => {
      const span = fakeSpan()
      setApiKeyName(span, incomingRequest({ apiClient: { other: 'other data' } }))
      expect(span.setAttribute).not.toHaveBeenCalled()
    })
  })

  describe('applyCustomAttributesOnSpan', () => {
    it('sets both custom attributes for an incoming request', () => {
      const span = fakeSpan()
      applyCustomAttributesOnSpan(
        span,
        incomingRequest({ headers: { 'user-agent': 'test_agent' }, apiClient: { name: 'test_key' } }),
        fakeResponse()
      )
      expect(span.setAttribute).toHaveBeenCalledWith('user_agent', 'test_agent')
      expect(span.setAttribute).toHaveBeenCalledWith('api_key_name', 'test_key')
    })
    it('reads apiClient even when set after the request object was created (e.g. by later middleware)', () => {
      const span = fakeSpan()
      const request = incomingRequest({ headers: {} })

      // Simulates a middleware (kth-node-api-key-strategy) mutating the request
      // object after the span/hooks for it have already fired once.
      ;(request as any).apiClient = { name: 'test_key' }

      applyCustomAttributesOnSpan(span, request, fakeResponse())
      expect(span.setAttribute).toHaveBeenCalledWith('api_key_name', 'test_key')
    })
    it('does nothing for outgoing (dependency) requests', () => {
      const span = fakeSpan()
      const outgoingRequest = Object.create(ClientRequest.prototype)
      applyCustomAttributesOnSpan(span, outgoingRequest, fakeResponse())
      expect(span.setAttribute).not.toHaveBeenCalled()
    })
  })

  describe('isResourceRequest', () => {
    it('is true for a GET request with /static/ in the url', () => {
      expect(isResourceRequest(incomingRequest({ method: 'GET', url: '/endpoint/static/media' }))).toBe(true)
    })
    it('is true for a GET request with /assets/ in the url', () => {
      expect(isResourceRequest(incomingRequest({ method: 'GET', url: '/endpoint/assets/media' }))).toBe(true)
    })
    it('is false for a GET request where the url merely contains the word "static"', () => {
      expect(isResourceRequest(incomingRequest({ method: 'GET', url: '/profile/static-man/publications' }))).toBe(false)
    })
    it('is false for a GET request where the url merely contains the word "assets"', () => {
      expect(isResourceRequest(incomingRequest({ method: 'GET', url: '/profile/assets-man/publications' }))).toBe(false)
    })
    it('is false when the url ends with "static/" with nothing after it', () => {
      expect(isResourceRequest(incomingRequest({ method: 'GET', url: '/endpoint/static/' }))).toBe(false)
    })
    it('is false for a non-GET request even if the url matches', () => {
      expect(isResourceRequest(incomingRequest({ method: 'POST', url: '/endpoint/static/media' }))).toBe(false)
    })
    it('is false when the url is missing', () => {
      expect(isResourceRequest(incomingRequest({ method: 'GET', url: undefined }))).toBe(false)
    })
  })

  describe('isMonitorRequest', () => {
    it('is true for a GET request to /_monitor', () => {
      expect(isMonitorRequest(incomingRequest({ method: 'GET', url: '/endpoint/_monitor' }))).toBe(true)
    })
    it('is true for a GET request to /_monitor with query params', () => {
      expect(isMonitorRequest(incomingRequest({ method: 'GET', url: '/endpoint/_monitor?query=my-param' }))).toBe(true)
    })
    it('is false for a non-GET request to /_monitor', () => {
      expect(isMonitorRequest(incomingRequest({ method: 'POST', url: '/endpoint/_monitor' }))).toBe(false)
    })
  })

  describe('ignoreIncomingRequestHook', () => {
    it('ignores static/asset/_monitor GET requests', () => {
      expect(ignoreIncomingRequestHook(incomingRequest({ method: 'GET', url: '/endpoint/static/media' }))).toBe(true)
      expect(ignoreIncomingRequestHook(incomingRequest({ method: 'GET', url: '/endpoint/assets/media' }))).toBe(true)
      expect(ignoreIncomingRequestHook(incomingRequest({ method: 'GET', url: '/endpoint/_monitor' }))).toBe(true)
    })
    it('does not ignore other requests', () => {
      expect(ignoreIncomingRequestHook(incomingRequest({ method: 'GET', url: '/api/v1/users' }))).toBe(false)
    })
  })
})
