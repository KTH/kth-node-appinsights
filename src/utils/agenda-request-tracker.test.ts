const fakeSpan = {
  setAttribute: jest.fn(),
  setStatus: jest.fn(),
  recordException: jest.fn(),
  end: jest.fn(),
}
const mockStartSpan = jest.fn(() => fakeSpan)
const mockGetTracer = jest.fn(() => ({ startSpan: mockStartSpan }))

jest.mock('@opentelemetry/api', () => {
  const actual = jest.requireActual('@opentelemetry/api')
  return { ...actual, trace: { ...actual.trace, getTracer: mockGetTracer } }
})

import { agendaRequestWrapper } from './agenda-request-tracker'

describe('Agenda request tracking', () => {
  it('starts a span named after the operation', async () => {
    const operation = jest.fn()
    const wrappedOperation = agendaRequestWrapper('JobName', operation)

    await wrappedOperation({ attrs: {} }, jest.fn())

    expect(mockStartSpan).toHaveBeenCalledWith(
      'AGENDA JobName',
      expect.objectContaining({ attributes: { repeatInterval: undefined } })
    )
  })
  it('includes the job repeatInterval as a span attribute', async () => {
    const operation = jest.fn()
    const wrappedOperation = agendaRequestWrapper('JobName', operation)

    await wrappedOperation({ attrs: { repeatInterval: 3600 } }, jest.fn())

    expect(mockStartSpan).toHaveBeenCalledWith(
      'AGENDA JobName',
      expect.objectContaining({ attributes: { repeatInterval: 3600 } })
    )
  })
  it('calls the passed agenda operation with job and done', async () => {
    const operation = jest.fn()
    const wrappedOperation = agendaRequestWrapper('JobName', operation)

    const job = { attrs: {} }
    const done = jest.fn()
    await wrappedOperation(job, done)

    expect(operation).toHaveBeenCalledWith(job, done)
  })
  it('ends the span after the operation completes', async () => {
    const operation = jest.fn()
    const wrappedOperation = agendaRequestWrapper('JobName', operation)

    await wrappedOperation({ attrs: {} }, jest.fn())

    expect(fakeSpan.end).toHaveBeenCalled()
  })
  it('marks the span status as ERROR if last fail time is same as last run time', async () => {
    const operation = jest.fn()
    const wrappedOperation = agendaRequestWrapper('JobName', operation)

    const lastRun = new Date()
    await wrappedOperation({ attrs: { failedAt: lastRun, lastFinishedAt: lastRun } }, jest.fn())

    expect(fakeSpan.setStatus).toHaveBeenCalledWith({ code: 2 }) // SpanStatusCode.ERROR
  })
  it('marks the span status as OK if last fail time differs from last run time', async () => {
    const operation = jest.fn()
    const wrappedOperation = agendaRequestWrapper('JobName', operation)

    const lastRun = new Date()
    const lastFail = new Date(lastRun.getTime() - 1000)
    await wrappedOperation({ attrs: { failedAt: lastFail, lastFinishedAt: lastRun } }, jest.fn())

    expect(fakeSpan.setStatus).toHaveBeenCalledWith({ code: 1 }) // SpanStatusCode.OK
  })
  it('marks the span status as OK if last fail time is missing', async () => {
    const operation = jest.fn()
    const wrappedOperation = agendaRequestWrapper('JobName', operation)

    await wrappedOperation({ attrs: {} }, jest.fn())

    expect(fakeSpan.setStatus).toHaveBeenCalledWith({ code: 1 }) // SpanStatusCode.OK
  })
  it('records the exception, ends the span and rethrows if the operation fails', async () => {
    const error = new Error('boom')
    const operation = jest.fn(async () => {
      throw error
    })
    const wrappedOperation = agendaRequestWrapper('JobName', operation)

    await expect(wrappedOperation({ attrs: {} }, jest.fn())).rejects.toThrow(error)

    expect(fakeSpan.recordException).toHaveBeenCalledWith(error)
    expect(fakeSpan.end).toHaveBeenCalled()
  })
})
