import { logs } from '@opentelemetry/api-logs'

const CUSTOM_EVENT_NAME_ATTRIBUTE = 'microsoft.custom_event.name'

type TrackEventOptions = {
  name: string
  properties?: Record<string, unknown>
  measurements?: Record<string, number>
}

export const trackEvent = ({ name, properties, measurements }: TrackEventOptions) => {
  const logger = logs.getLogger('@kth/appinsights')
  logger.emit({
    attributes: { ...properties, [CUSTOM_EVENT_NAME_ATTRIBUTE]: name },
    body: measurements ? { measurements } : undefined,
  })
}
