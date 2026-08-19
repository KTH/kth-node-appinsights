const mockRecord = jest.fn()
const mockCreateHistogram = jest.fn(() => ({ record: mockRecord }))
const mockGetMeter = jest.fn(() => ({ createHistogram: mockCreateHistogram }))

jest.mock('@opentelemetry/api', () => ({ metrics: { getMeter: mockGetMeter } }))

import { trackMetric } from './trackMetric'

describe('trackMetric', () => {
  it('does not call metrics.getMeter() merely by being imported', () => {
    //  metrics.getMeter() must be called AFTER package init is done
    expect(mockGetMeter).not.toHaveBeenCalled()
  })
  it('records the value on a histogram named after the metric', () => {
    trackMetric({ name: 'api_lookup', value: 21 })

    expect(mockCreateHistogram).toHaveBeenCalledWith('api_lookup')
    expect(mockRecord).toHaveBeenCalledWith(21, undefined)
  })
  it('passes properties through as attributes', () => {
    trackMetric({ name: 'metric_with_properties', value: 21, properties: { endpoint: 'search' } })

    expect(mockRecord).toHaveBeenCalledWith(21, { endpoint: 'search' })
  })
  it('reuses the same histogram instrument across calls with the same name', () => {
    trackMetric({ name: 'repeated_metric', value: 1 })
    trackMetric({ name: 'repeated_metric', value: 2 })

    expect(mockCreateHistogram).toHaveBeenCalledTimes(1)
    expect(mockRecord).toHaveBeenCalledTimes(2)
  })
  it('creates a separate histogram per metric name', () => {
    trackMetric({ name: 'first_metric', value: 1 })
    trackMetric({ name: 'second_metric', value: 2 })

    expect(mockCreateHistogram).toHaveBeenCalledWith('first_metric')
    expect(mockCreateHistogram).toHaveBeenCalledWith('second_metric')
  })
})
