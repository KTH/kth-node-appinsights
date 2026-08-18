import { metrics, type Attributes, type Histogram } from '@opentelemetry/api'

const histograms = new Map<string, Histogram>()

const getHistogram = (name: string): Histogram => {
  let histogram = histograms.get(name)
  if (!histogram) {
    histogram = metrics.getMeter('@kth/appinsights').createHistogram(name)
    histograms.set(name, histogram)
  }
  return histogram
}

type TrackMetricOptions = {
  name: string
  value: number
  properties?: Attributes
}

export const trackMetric = ({ name, value, properties }: TrackMetricOptions) => {
  getHistogram(name).record(value, properties)
}
