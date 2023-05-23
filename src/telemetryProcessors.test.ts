import { Contracts } from 'applicationinsights'

import { userAgentOnRequest } from './telemetryProcessors'

const requestWithHeaders = (headers: any) => ({
  get: jest.fn((name: string) => headers[name]),
})

describe('Telemetry procesors', () => {
  describe('Save user_agent on Requests', () => {
    it('sets user_agent if telemetry is Requests and user-agent header exists', () => {
      const envelope = { data: { baseType: 'RequestData' } } as Contracts.EnvelopeTelemetry
      const context = {
        'http.ServerRequest': requestWithHeaders({ 'user-agent': 'test_agent' }),
      }
      userAgentOnRequest(envelope, context)
      expect(envelope.data.baseData?.properties?.user_agent).toEqual('test_agent')
    })
    it('does not set user_agent if telemetry is not a Requests', () => {
      const envelope = { data: { baseType: 'OtherTelemetry' } } as Contracts.EnvelopeTelemetry
      const context = {
        'http.ServerRequest': requestWithHeaders({ 'user-agent': 'test_agent' }),
      }
      userAgentOnRequest(envelope, context)
      expect(envelope.data.baseData?.properties?.user_agent).toEqual(undefined)
    })
    it('does not set user_agent if user-agent header is missing', () => {
      const envelope = { data: { baseType: 'RequestData' } } as Contracts.EnvelopeTelemetry
      const context = {
        'http.ServerRequest': requestWithHeaders({ 'other-header': 'test_data' }),
      }
      userAgentOnRequest(envelope, context)
      expect(envelope.data.baseData?.properties?.user_agent).toEqual(undefined)
    })
    it('does not overwrite existing properties when setting user_agent', () => {
      const envelope = {
        data: {
          baseType: 'RequestData',
          baseData: { otherData: 'keep_me', properties: { otherProperty: 'keep_me_too' } },
        },
      } as unknown as Contracts.EnvelopeTelemetry
      const context = {
        'http.ServerRequest': requestWithHeaders({ 'user-agent': 'test_agent' }),
      }
      userAgentOnRequest(envelope, context)
      expect(envelope.data.baseData?.otherData).toEqual('keep_me')
      expect(envelope.data.baseData?.properties?.otherProperty).toEqual('keep_me_too')
    })
    it('returns true for all types', () => {
      const envelope = { data: { baseType: 'OtherTelemetry' } } as Contracts.EnvelopeTelemetry

      const callResult = userAgentOnRequest(envelope)
      expect(callResult).toBe(true)
    })
    it('returns true when envelope is empty', () => {
      const envelope = {} as Contracts.EnvelopeTelemetry

      const callResult = userAgentOnRequest(envelope)
      expect(callResult).toBe(true)
    })
    it('returns true when context is empty', () => {
      const envelope = { data: { baseType: 'RequestData' } } as Contracts.EnvelopeTelemetry
      const context = {}

      const callResult = userAgentOnRequest(envelope, context)
      expect(callResult).toBe(true)
    })
  })
})
