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

import { trackHttpDependency } from './trackHttpDependency'

const call = { url: 'https://api.kth.se/api/search?q=test', duration: 5, statusCode: 200 }

describe('trackHttpDependency', () => {
  it('does not call trace.getTracer() merely by being imported', () => {
    // trace.getTracer() must be called AFTER package init is done
    expect(mockGetTracer).not.toHaveBeenCalled()
  })

  it('starts a CLIENT-kind span', () => {
    trackHttpDependency(call)

    expect(mockStartSpan).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ kind: 2 })) // SpanKind.CLIENT
  })

  it('names the span "<method> <path>", the same way the exporter names the dependency', () => {
    trackHttpDependency({ ...call, method: 'post' })

    expect(mockStartSpan).toHaveBeenCalledWith('POST /api/search', expect.anything())
  })

  it('names the span after the whole url when the url can not be parsed', () => {
    trackHttpDependency({ ...call, url: '/api/search' })

    expect(mockStartSpan).toHaveBeenCalledWith('GET /api/search', expect.anything())
  })

  it('uses a given name instead of the generated one', () => {
    trackHttpDependency({ ...call, name: 'Search API' })

    expect(mockStartSpan).toHaveBeenCalledWith('Search API', expect.anything())
  })

  it('sets startTime so the span duration matches the given duration', () => {
    jest.spyOn(Date, 'now').mockReturnValue(1_000)

    trackHttpDependency(call)

    expect(mockStartSpan).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ startTime: 995 }))
    expect(fakeSpan.end).toHaveBeenCalledWith(1_000)
  })

  it('sets the http attributes the exporter maps to native Data/ResultCode/Target fields', () => {
    trackHttpDependency(call)

    expect(mockStartSpan).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        attributes: expect.objectContaining({
          'http.request.method': 'GET',
          'url.full': 'https://api.kth.se/api/search?q=test',
          'http.response.status_code': 200,
          'server.address': 'api.kth.se',
        }),
      })
    )
  })

  it('defaults the method to GET', () => {
    trackHttpDependency({ url: 'https://api.kth.se/api/search', duration: 5 })

    expect(mockStartSpan).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ attributes: expect.objectContaining({ 'http.request.method': 'GET' }) })
    )
  })

  it('includes the port when the url has one', () => {
    trackHttpDependency({ ...call, url: 'http://localhost:3000/api/search' })

    expect(mockStartSpan).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        attributes: expect.objectContaining({ 'server.address': 'localhost', 'server.port': 3000 }),
      })
    )
  })

  it('leaves out statusCode and server attributes that can not be resolved', () => {
    trackHttpDependency({ url: '/api/search', duration: 5 })

    const attributeIsNotSet = (attribute: string) =>
      expect(mockStartSpan).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ attributes: expect.not.objectContaining({ [attribute]: expect.anything() }) })
      )

    attributeIsNotSet('http.response.status_code')
    attributeIsNotSet('server.address')
    attributeIsNotSet('server.port')
  })

  it('includes properties as attributes alongside the http metadata', () => {
    trackHttpDependency({ ...call, properties: { code: '42' } })

    expect(mockStartSpan).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ attributes: expect.objectContaining({ code: '42' }) })
    )
  })

  it('sets the span status to OK for a status code below 400', () => {
    trackHttpDependency({ ...call, statusCode: 302 })

    expect(fakeSpan.setStatus).toHaveBeenCalledWith({ code: 1 }) // SpanStatusCode.OK
  })

  it('sets the span status to ERROR for a status code of 400 or above', () => {
    trackHttpDependency({ ...call, statusCode: 404 })

    expect(fakeSpan.setStatus).toHaveBeenCalledWith({ code: 2 }) // SpanStatusCode.ERROR
  })

  it('sets the span status to OK when there is no status code', () => {
    trackHttpDependency({ url: 'https://api.kth.se/api/search', duration: 5 })

    expect(fakeSpan.setStatus).toHaveBeenCalledWith({ code: 1 }) // SpanStatusCode.OK
  })

  it('lets a given success flag override the status code', () => {
    trackHttpDependency({ ...call, statusCode: 404, success: true })

    expect(fakeSpan.setStatus).toHaveBeenCalledWith({ code: 1 }) // SpanStatusCode.OK

    trackHttpDependency({ ...call, statusCode: 200, success: false })

    expect(fakeSpan.setStatus).toHaveBeenLastCalledWith({ code: 2 }) // SpanStatusCode.ERROR
  })
})
