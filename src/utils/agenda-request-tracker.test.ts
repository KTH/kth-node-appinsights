// Mock applicationinsights
const mockTrackRequest = jest.fn()

const applicationinsightsMock: any = {
  setup: jest.fn(() => applicationinsightsMock),
  start: jest.fn(() => applicationinsightsMock),
  defaultClient: {
    trackRequest: mockTrackRequest,
  },
  startOperation: jest.fn(() => 'MockedCorrelationContext'),
  wrapWithCorrelationContext: jest.fn((func, context) => {
    func()
    return jest.fn
  }),
}

jest.mock('applicationinsights', () => applicationinsightsMock)

// Mock opentelemetryApi
const mockedSpan = {
  _spanContext: { spanId: '0123456789012345', traceFlags: 0, traceId: '01234567890123456789012345678901' },
}

const mockOpentelemetryApi = {
  trace: { getTracer: jest.fn(() => ({ startSpan: jest.fn(() => mockedSpan) })) },
}

jest.mock('@opentelemetry/api', () => mockOpentelemetryApi)

import { agendaRequestWrapper } from './agenda-request-tracker'

describe('Agenda request tracking', () => {
  beforeEach(() => {
    applicationinsightsMock.defaultClient = {
      trackRequest: mockTrackRequest,
    }
    jest.useFakeTimers()
  })
  afterEach(() => {
    jest.useRealTimers()
  })
  it('calls startOperation with span generated from opentelemetry', async () => {
    const operation = jest.fn()

    const wrappedOperation = agendaRequestWrapper('JobName', operation)

    const job = { attrs: {} }
    const done = jest.fn()

    await wrappedOperation(job, done)
    expect(applicationinsightsMock.startOperation).toHaveBeenCalledWith(mockedSpan)
  })
  it('calls wrapWithCorrelationContext with context from startOperation', async () => {
    const operation = jest.fn()

    const wrappedOperation = agendaRequestWrapper('JobName', operation)

    const job = { attrs: {} }
    const done = jest.fn()

    await wrappedOperation(job, done)
    expect(applicationinsightsMock.wrapWithCorrelationContext).toHaveBeenCalledWith(
      expect.any(Function),
      'MockedCorrelationContext'
    )
  })
  it('calls the passed agenda operation', async () => {
    const operation = jest.fn()

    const wrappedOperation = agendaRequestWrapper('JobName', operation)

    const job = { attrs: {} }
    const done = jest.fn()

    await wrappedOperation(job, done)
    expect(operation).toHaveBeenCalledWith(job, done)
  })
  it('calls the passed agenda operation even when applicationinsights is not initialized', async () => {
    applicationinsightsMock.defaultClient = undefined
    const operation = jest.fn()

    const wrappedOperation = agendaRequestWrapper('JobName', operation)

    const job = { attrs: {} }
    const done = jest.fn()

    await wrappedOperation(job, done)
    expect(operation).toHaveBeenCalledWith(job, done)
  })
  it('calls trackRequest with correct data', async () => {
    const operation = jest.fn()

    const wrappedOperation = agendaRequestWrapper('JobName', operation)

    const job = { attrs: { repeatInterval: 3600 } }
    const done = jest.fn()

    await wrappedOperation(job, done)
    expect(applicationinsightsMock.defaultClient.trackRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        duration: expect.any(Number),

        name: 'AGENDA JobName',
        properties: { repeatInterval: 3600 },
      })
    )
  })
  it('computes correct time and duration', async () => {
    const operation = jest.fn(async () => {
      await new Promise(resolve => {
        setTimeout(resolve, 4000)
        jest.advanceTimersToNextTimer()
      })
    })

    const startTime = new Date()

    const wrappedOperation = agendaRequestWrapper('JobName', operation)

    const job = { attrs: {} }
    const done = jest.fn()

    await wrappedOperation(job, done)
    expect(applicationinsightsMock.defaultClient.trackRequest).toHaveBeenCalledWith(
      expect.objectContaining({ duration: 4000, time: startTime })
    )
  })
})
