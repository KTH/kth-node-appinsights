const mockEmit = jest.fn()
const mockGetLogger = jest.fn(() => ({ emit: mockEmit }))

jest.mock('@opentelemetry/api-logs', () => ({ logs: { getLogger: mockGetLogger } }))

import { trackEvent } from './trackEvent'

describe('trackEvent', () => {
  it('does not call logs.getLogger() merely by being imported', () => {
    // logs.getLogger() must be called AFTER package init is done
    expect(mockGetLogger).not.toHaveBeenCalled()
  })
  it('emits a log record with the custom event name attribute', () => {
    trackEvent({ name: 'search' })

    expect(mockEmit).toHaveBeenCalledWith(
      expect.objectContaining({ attributes: { 'microsoft.custom_event.name': 'search' } })
    )
  })
  it('includes properties as attributes alongside the event name', () => {
    trackEvent({ name: 'search', properties: { searchOrigin: 'header', queryIn: 'kth' } })

    expect(mockEmit).toHaveBeenCalledWith(
      expect.objectContaining({
        attributes: { searchOrigin: 'header', queryIn: 'kth', 'microsoft.custom_event.name': 'search' },
      })
    )
  })
  it('preserves nested objects in properties (serialized downstream by the exporter)', () => {
    trackEvent({ name: 'search', properties: { filtersIn: { startAt: 0, refinersIn: ['a', 'b'] } } })

    expect(mockEmit).toHaveBeenCalledWith(
      expect.objectContaining({
        attributes: expect.objectContaining({ filtersIn: { startAt: 0, refinersIn: ['a', 'b'] } }),
      })
    )
  })
  it('does not let a property named after the reserved attribute override the event name', () => {
    trackEvent({ name: 'search', properties: { 'microsoft.custom_event.name': 'not-the-real-name' } })

    expect(mockEmit).toHaveBeenCalledWith(
      expect.objectContaining({ attributes: expect.objectContaining({ 'microsoft.custom_event.name': 'search' }) })
    )
  })
  it('does not set a body when no measurements are given', () => {
    trackEvent({ name: 'search' })

    expect(mockEmit).toHaveBeenCalledWith(expect.objectContaining({ body: undefined }))
  })
  it('puts measurements in the log body', () => {
    trackEvent({ name: 'search', measurements: { resultCount: 12 } })

    expect(mockEmit).toHaveBeenCalledWith(expect.objectContaining({ body: { measurements: { resultCount: 12 } } }))
  })
})
