import { IncomingMessage, ClientRequest, ServerResponse } from 'http'
import type { Span } from '@opentelemetry/api'

import { applyCustomAttributesOnSpan, ignoreIncomingRequestHook, hideDbStatement } from './telemetryProcessors'

const fakeSpan = (): Span => ({ setAttribute: jest.fn(), attributes: {} }) as unknown as Span

const incomingRequest = (overrides: Partial<IncomingMessage> & Record<string, any> = {}): IncomingMessage =>
  Object.assign(Object.create(IncomingMessage.prototype), { headers: {}, ...overrides })

const fakeResponse = (): ServerResponse => Object.create(ServerResponse.prototype)

describe('Telemetry procesors', () => {
  describe('applyCustomAttributesOnSpan', () => {
    it('sets user_agent if the header exists', () => {
      const span = fakeSpan()
      applyCustomAttributesOnSpan(span, incomingRequest({ headers: { 'user-agent': 'test_agent' } }), fakeResponse())
      expect(span.setAttribute).toHaveBeenCalledWith('user_agent', 'test_agent')
    })
    it('does not set user_agent if the header is missing', () => {
      const span = fakeSpan()
      applyCustomAttributesOnSpan(span, incomingRequest({ headers: {} }), fakeResponse())
      expect(span.setAttribute).not.toHaveBeenCalledWith('user_agent', expect.anything())
    })
    it('sets api_key_name if apiClient information exists on the request', () => {
      const span = fakeSpan()
      applyCustomAttributesOnSpan(span, incomingRequest({ apiClient: { name: 'test_key' } }), fakeResponse())
      expect(span.setAttribute).toHaveBeenCalledWith('api_key_name', 'test_key')
    })
    it('does not set api_key_name if apiClient is missing', () => {
      const span = fakeSpan()
      applyCustomAttributesOnSpan(span, incomingRequest({}), fakeResponse())
      expect(span.setAttribute).not.toHaveBeenCalledWith('api_key_name', expect.anything())
    })
    it('does not set api_key_name if apiClient lacks a name', () => {
      const span = fakeSpan()
      applyCustomAttributesOnSpan(span, incomingRequest({ apiClient: { other: 'other data' } }), fakeResponse())
      expect(span.setAttribute).not.toHaveBeenCalledWith('api_key_name', expect.anything())
    })
    it('reads apiClient even when set after the request object was created (e.g. by later middleware)', () => {
      const span = fakeSpan()
      const request = incomingRequest({ headers: {} })

      ;(request as any).apiClient = { name: 'test_key' }

      applyCustomAttributesOnSpan(span, request, fakeResponse())
      expect(span.setAttribute).toHaveBeenCalledWith('api_key_name', 'test_key')
    })
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
    it('does nothing for outgoing (dependency) requests', () => {
      const span = fakeSpan()
      const outgoingRequest = Object.create(ClientRequest.prototype)
      applyCustomAttributesOnSpan(span, outgoingRequest, fakeResponse())
      expect(span.setAttribute).not.toHaveBeenCalled()
    })
  })

  describe('ignoreIncomingRequestHook', () => {
    it('ignores a GET request with /static/ in the url', () => {
      expect(ignoreIncomingRequestHook(incomingRequest({ method: 'GET', url: '/endpoint/static/media' }))).toBe(true)
    })
    it('ignores a GET request with /assets/ in the url', () => {
      expect(ignoreIncomingRequestHook(incomingRequest({ method: 'GET', url: '/endpoint/assets/media' }))).toBe(true)
    })
    it('ignores a GET request to /_monitor', () => {
      expect(ignoreIncomingRequestHook(incomingRequest({ method: 'GET', url: '/endpoint/_monitor' }))).toBe(true)
    })
    it('ignores a GET request to /_monitor with query params', () => {
      expect(
        ignoreIncomingRequestHook(incomingRequest({ method: 'GET', url: '/endpoint/_monitor?query=my-param' }))
      ).toBe(true)
    })
    it('does not ignore a GET request where the url merely contains the word "static"', () => {
      expect(
        ignoreIncomingRequestHook(incomingRequest({ method: 'GET', url: '/profile/static-man/publications' }))
      ).toBe(false)
    })
    it('does not ignore a GET request where the url merely contains the word "assets"', () => {
      expect(
        ignoreIncomingRequestHook(incomingRequest({ method: 'GET', url: '/profile/assets-man/publications' }))
      ).toBe(false)
    })
    it('does not ignore a GET request when the url ends with "static/" with nothing after it', () => {
      expect(ignoreIncomingRequestHook(incomingRequest({ method: 'GET', url: '/endpoint/static/' }))).toBe(false)
    })
    it('does not ignore a non-GET request even if the url matches /static/', () => {
      expect(ignoreIncomingRequestHook(incomingRequest({ method: 'POST', url: '/endpoint/static/media' }))).toBe(false)
    })
    it('does not ignore a non-GET request to /_monitor', () => {
      expect(ignoreIncomingRequestHook(incomingRequest({ method: 'POST', url: '/endpoint/_monitor' }))).toBe(false)
    })
    it('does not ignore a GET request when the url is missing', () => {
      expect(ignoreIncomingRequestHook(incomingRequest({ method: 'GET', url: undefined }))).toBe(false)
    })
    it('does not ignore other requests', () => {
      expect(ignoreIncomingRequestHook(incomingRequest({ method: 'GET', url: '/api/v1/users' }))).toBe(false)
    })
  })

  describe('hideDbStatement', () => {
    it('never returns the command it was given', () => {
      expect(
        hideDbStatement({ update: 'users', updates: [{ q: { _id: '?' }, u: { $set: { name: '?' } } }] })
      ).toBeUndefined()
    })
  })
})
