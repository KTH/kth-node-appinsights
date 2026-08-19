const fakeSpan = {
  setStatus: jest.fn(),
  end: jest.fn(),
}
const mockStartSpan = jest.fn(() => fakeSpan)
const mockGetTracer = jest.fn(() => ({ startSpan: mockStartSpan }))

jest.mock('@opentelemetry/api', () => {
  const actual = jest.requireActual('@opentelemetry/api')
  return { ...actual, trace: { ...actual.trace, getTracer: mockGetTracer } }
})

import { trackDependency } from './trackDependency'

describe('trackDependency', () => {
  it('does not call trace.getTracer() merely by being imported', () => {
    // trace.getTracer() must be called AFTER package init is done
    expect(mockGetTracer).not.toHaveBeenCalled()
  })

  it('starts a CLIENT-kind span named after the dependency', () => {
    trackDependency({
      name: 'findData',
      dependencyTypeName: 'External Service',
      data: 'id: 42',
      duration: 5,
      resultCode: 200,
      success: true,
    })

    expect(mockStartSpan).toHaveBeenCalledWith('findData', expect.objectContaining({ kind: 2 })) // SpanKind.CLIENT
  })

  it('sets startTime so the span duration matches the given duration', () => {
    jest.spyOn(Date, 'now').mockReturnValue(1_000)

    trackDependency({
      name: 'findData',
      dependencyTypeName: 'External Service',
      data: 'id: 42',
      duration: 5,
      resultCode: 200,
      success: true,
    })

    expect(mockStartSpan).toHaveBeenCalledWith('findData', expect.objectContaining({ startTime: 995 }))
    expect(fakeSpan.end).toHaveBeenCalledWith(1_000)
  })

  it('sets dependencyTypeName as db.system and data as db.statement, so the exporter maps them to native Type/Command fields', () => {
    trackDependency({
      name: 'findData',
      dependencyTypeName: 'External Service',
      data: 'id: 42',
      duration: 5,
      resultCode: 200,
      success: true,
    })

    expect(mockStartSpan).toHaveBeenCalledWith(
      'findData',
      expect.objectContaining({
        attributes: expect.objectContaining({
          'db.system': 'External Service',
          'db.statement': 'id: 42',
        }),
      })
    )
  })

  it('includes resultCode as a custom property', () => {
    trackDependency({
      name: 'findData',
      dependencyTypeName: 'External Service',
      data: 'id: 42',
      duration: 5,
      resultCode: 200,
      success: true,
    })

    expect(mockStartSpan).toHaveBeenCalledWith(
      'findData',
      expect.objectContaining({ attributes: expect.objectContaining({ dependency_result_code: '200' }) })
    )
  })

  it('includes properties as attributes alongside the dependency metadata', () => {
    trackDependency({
      name: 'findData',
      dependencyTypeName: 'External Service',
      data: 'id: 42',
      duration: 5,
      resultCode: 200,
      success: true,
      properties: { code: '42' },
    })

    expect(mockStartSpan).toHaveBeenCalledWith(
      'findData',
      expect.objectContaining({ attributes: expect.objectContaining({ code: '42' }) })
    )
  })

  it('sets the span status to OK when success is true', () => {
    trackDependency({
      name: 'findData',
      dependencyTypeName: 'External Service',
      data: 'id: 42',
      duration: 5,
      resultCode: 200,
      success: true,
    })

    expect(fakeSpan.setStatus).toHaveBeenCalledWith({ code: 1 }) // SpanStatusCode.OK
  })

  it('sets the span status to ERROR when success is false', () => {
    trackDependency({
      name: 'findData',
      dependencyTypeName: 'External Service',
      data: 'id: 42',
      duration: 5,
      resultCode: 500,
      success: false,
    })

    expect(fakeSpan.setStatus).toHaveBeenCalledWith({ code: 2 }) // SpanStatusCode.ERROR
  })
})
