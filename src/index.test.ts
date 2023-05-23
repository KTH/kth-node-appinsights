const applicationinsightsMock: any = {
  setup: jest.fn(() => applicationinsightsMock),
  start: jest.fn(() => applicationinsightsMock),
  setAutoCollectConsole: jest.fn(() => applicationinsightsMock),
  defaultClient: { context: { tags: {} }, addTelemetryProcessor: jest.fn() },
}

const mockOs = { hostname: jest.fn() }

jest.mock('applicationinsights', () => applicationinsightsMock)
jest.mock('os', () => mockOs)

import { init } from './index'

describe('init applicationinsights', () => {
  beforeEach(() => {
    process.env.APPLICATIONINSIGHTS_CONNECTION_STRING = 'default-connection-string'

    applicationinsightsMock.defaultClient.context.tags = {}

    mockOs.hostname.mockReturnValue('host1234')
  })
  describe('use correct credentials', () => {
    beforeEach(() => {
      delete process.env.APPLICATIONINSIGHTS_CONNECTION_STRING
      delete process.env.APPINSIGHTS_INSTRUMENTATIONKEY
    })
    it('uses connection string if passed', () => {
      init({ connectionString: 'my-connection-string' })
      expect(applicationinsightsMock.setup).toHaveBeenCalledWith('my-connection-string')
      expect(applicationinsightsMock.start).toHaveBeenCalled()
    })
    it('uses instrumentation key if passed', () => {
      init({ instrumentationKey: 'my-instrumentation-key' })
      expect(applicationinsightsMock.setup).toHaveBeenCalledWith('my-instrumentation-key')
      expect(applicationinsightsMock.start).toHaveBeenCalled()
    })
    it('prioritizes connection string if both are passed', () => {
      init({ instrumentationKey: 'my-instrumentation-key', connectionString: 'my-connection-string' })
      expect(applicationinsightsMock.setup).toHaveBeenCalledWith('my-connection-string')
      expect(applicationinsightsMock.start).toHaveBeenCalled()
    })
    it('passes nothing when config are missing and env:APPLICATIONINSIGHTS_CONNECTION_STRING exists', () => {
      process.env.APPLICATIONINSIGHTS_CONNECTION_STRING = 'my-env-connection-string'
      init({})
      expect(applicationinsightsMock.setup).toHaveBeenCalledWith()
      expect(applicationinsightsMock.start).toHaveBeenCalled()
    })
    it('passes nothing when config are missing and env:APPLICATIONINSIGHTS_CONNECTION_STRING exists', () => {
      process.env.APPINSIGHTS_INSTRUMENTATIONKEY = 'my-env-instrumentation-key'
      init({})
      expect(applicationinsightsMock.setup).toHaveBeenCalledWith()
      expect(applicationinsightsMock.start).toHaveBeenCalled()
    })
    it('does not initialize if config and env is missing', () => {
      init({})
      expect(applicationinsightsMock.setup).not.toHaveBeenCalled()
      expect(applicationinsightsMock.start).not.toHaveBeenCalled()
    })
  })
  describe('cloud-role-name', () => {
    beforeEach(() => {})
    it('sets if "name" is included in options', () => {
      init({ name: 'my-application' })

      expect(applicationinsightsMock.defaultClient.context.tags['ai.cloud.role']).toBe('my-application')
    })
    it('does not set without "name" in options', () => {
      init({})

      expect(Object.keys(applicationinsightsMock.defaultClient.context.tags)).not.toContain('ai.cloud.role')
    })
  })
  describe('cloud-role-intance', () => {
    beforeEach(() => {})
    it('sets if "name" is included in options and hostname is resolvable', () => {
      mockOs.hostname.mockReturnValue('my_host')

      init({ name: 'my_application' })

      expect(applicationinsightsMock.defaultClient.context.tags['ai.cloud.roleInstance']).toBe('my_application-my_host')
    })
    it('does not set without "name" in options', () => {
      mockOs.hostname.mockReturnValue('my_host')

      init({})

      expect(Object.keys(applicationinsightsMock.defaultClient.context.tags)).not.toContain('ai.cloud.roleInstance')
    })
    it('does not set when hostname is not resolvable', () => {
      mockOs.hostname.mockReturnValue(undefined)

      init({ name: 'my_application' })

      expect(Object.keys(applicationinsightsMock.defaultClient.context.tags)).not.toContain('ai.cloud.roleInstance')
    })
  })
})
