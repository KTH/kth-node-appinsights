const mockUseAzureMonitor = jest.fn()
jest.mock('@azure/monitor-opentelemetry', () => ({ useAzureMonitor: mockUseAzureMonitor }))

const mockResourceFromAttributes = jest.fn((attributes: Record<string, string>) => ({ attributes }))
jest.mock('@opentelemetry/resources', () => ({ resourceFromAttributes: mockResourceFromAttributes }))

const mockOs = { hostname: jest.fn() }
jest.mock('os', () => mockOs)

import { KthAppinsights } from './index'

describe('init applicationinsights', () => {
  beforeEach(() => {
    process.env.APPLICATIONINSIGHTS_CONNECTION_STRING = 'default-connection-string'
    delete process.env.APPINSIGHTS_INSTRUMENTATIONKEY
    mockOs.hostname.mockReturnValue('host1234')
  })

  describe('use correct credentials', () => {
    beforeEach(() => {
      delete process.env.APPLICATIONINSIGHTS_CONNECTION_STRING
      delete process.env.APPINSIGHTS_INSTRUMENTATIONKEY
    })
    it('uses connection string if passed', () => {
      KthAppinsights.init({ connectionString: 'my-connection-string' })
      expect(mockUseAzureMonitor).toHaveBeenCalledWith(
        expect.objectContaining({ azureMonitorExporterOptions: { connectionString: 'my-connection-string' } })
      )
    })
    it('builds a connection string from instrumentation key if passed', () => {
      KthAppinsights.init({ instrumentationKey: 'my-instrumentation-key' })
      expect(mockUseAzureMonitor).toHaveBeenCalledWith(
        expect.objectContaining({
          azureMonitorExporterOptions: { connectionString: 'InstrumentationKey=my-instrumentation-key' },
        })
      )
    })
    it('prioritizes connection string if both are passed', () => {
      KthAppinsights.init({ instrumentationKey: 'my-instrumentation-key', connectionString: 'my-connection-string' })
      expect(mockUseAzureMonitor).toHaveBeenCalledWith(
        expect.objectContaining({ azureMonitorExporterOptions: { connectionString: 'my-connection-string' } })
      )
    })
    it('uses env:APPLICATIONINSIGHTS_CONNECTION_STRING when config is missing', () => {
      process.env.APPLICATIONINSIGHTS_CONNECTION_STRING = 'my-env-connection-string'
      KthAppinsights.init({})
      expect(mockUseAzureMonitor).toHaveBeenCalledWith(
        expect.objectContaining({ azureMonitorExporterOptions: { connectionString: 'my-env-connection-string' } })
      )
    })
    it('builds a connection string from env:APPINSIGHTS_INSTRUMENTATIONKEY when config is missing', () => {
      process.env.APPINSIGHTS_INSTRUMENTATIONKEY = 'my-env-instrumentation-key'
      KthAppinsights.init({})
      expect(mockUseAzureMonitor).toHaveBeenCalledWith(
        expect.objectContaining({
          azureMonitorExporterOptions: { connectionString: 'InstrumentationKey=my-env-instrumentation-key' },
        })
      )
    })
    it('does not initialize if config and env is missing', () => {
      KthAppinsights.init({})
      expect(mockUseAzureMonitor).not.toHaveBeenCalled()
    })
  })

  describe('cloud role name and instance', () => {
    it('sets service.name and service.instance.id resource attributes if "name" is included in options', () => {
      KthAppinsights.init({ name: 'my-application' })

      expect(mockResourceFromAttributes).toHaveBeenCalledWith({
        'service.name': 'my-application',
        'service.instance.id': 'my-application-host1234',
      })
      expect(mockUseAzureMonitor).toHaveBeenCalledWith(
        expect.objectContaining({
          resource: {
            attributes: { 'service.name': 'my-application', 'service.instance.id': 'my-application-host1234' },
          },
        })
      )
    })
    it('does not set a resource without "name" in options', () => {
      KthAppinsights.init({})

      expect(mockResourceFromAttributes).not.toHaveBeenCalled()
      expect(mockUseAzureMonitor).toHaveBeenCalledWith(expect.not.objectContaining({ resource: expect.anything() }))
    })
    it('omits service.instance.id when hostname is not resolvable', () => {
      mockOs.hostname.mockReturnValue(undefined)

      KthAppinsights.init({ name: 'my-application' })

      expect(mockResourceFromAttributes).toHaveBeenCalledWith({ 'service.name': 'my-application' })
    })
  })

  describe('sampling', () => {
    it('converts samplingPercentage (0-100) to samplingRatio (0-1)', () => {
      KthAppinsights.init({ samplingPercentage: 50 })

      expect(mockUseAzureMonitor).toHaveBeenCalledWith(expect.objectContaining({ samplingRatio: 0.5 }))
    })
    it('does not set samplingRatio without "samplingPercentage" in options', () => {
      KthAppinsights.init({})
      expect(mockUseAzureMonitor).toHaveBeenCalledWith(
        expect.not.objectContaining({ samplingRatio: expect.anything() })
      )
    })
  })

  describe('instrumentation options', () => {
    it('enables bunyan, winston and http instrumentation with the custom hooks', () => {
      KthAppinsights.init({})

      expect(mockUseAzureMonitor).toHaveBeenCalledWith(
        expect.objectContaining({
          instrumentationOptions: expect.objectContaining({
            bunyan: { enabled: true },
            winston: { enabled: true },
            http: expect.objectContaining({
              enabled: true,
              applyCustomAttributesOnSpan: expect.any(Function),
              ignoreIncomingRequestHook: expect.any(Function),
            }),
          }),
        })
      )
    })

    describe('mongoDb tracking', () => {
      it('is enabled by default', () => {
        KthAppinsights.init({})
        expect(mockUseAzureMonitor).toHaveBeenCalledWith(
          expect.objectContaining({
            instrumentationOptions: expect.objectContaining({
              mongoDb: expect.objectContaining({ enabled: true }),
            }),
          })
        )
      })
      it('can be disabled with trackMongoDb: false', () => {
        KthAppinsights.init({ trackMongoDb: false })
        expect(mockUseAzureMonitor).toHaveBeenCalledWith(
          expect.objectContaining({
            instrumentationOptions: expect.objectContaining({
              mongoDb: expect.objectContaining({ enabled: false }),
            }),
          })
        )
      })
      it('never includes the raw MongoDB command in telemetry', () => {
        KthAppinsights.init({})
        const [[{ instrumentationOptions }]] = mockUseAzureMonitor.mock.calls
        expect(instrumentationOptions.mongoDb.dbStatementSerializer({ update: 'users', updates: [] })).toBeUndefined()
      })
    })

    describe('redis tracking', () => {
      it('is enabled by default for both redis and redis4', () => {
        KthAppinsights.init({})
        expect(mockUseAzureMonitor).toHaveBeenCalledWith(
          expect.objectContaining({
            instrumentationOptions: expect.objectContaining({ redis: { enabled: true }, redis4: { enabled: true } }),
          })
        )
      })
      it('can be disabled with trackRedis: false', () => {
        KthAppinsights.init({ trackRedis: false })
        expect(mockUseAzureMonitor).toHaveBeenCalledWith(
          expect.objectContaining({
            instrumentationOptions: expect.objectContaining({ redis: { enabled: false }, redis4: { enabled: false } }),
          })
        )
      })
    })
  })
})
