import { useEffect } from 'react';

let eventSource: EventSource | null = null;

function getEventSource(): EventSource {
  if (!eventSource || eventSource.readyState === EventSource.CLOSED) {
    eventSource = new EventSource('/api/stream');
  }
  return eventSource;
}

/**
 * Subscribes to a unified SSE event type.
 * @param eventType SSE event type emitted by /api/stream
 * @param onMessage Callback invoked with parsed JSON payload
 */
export function useUnifiedSSE<T>(eventType: string, onMessage: (data: T) => void): void {
  useEffect(() => {
    const es = getEventSource();
    const listener = (event: MessageEvent) => {
      try {
        const parsed = JSON.parse(event.data) as T;
        onMessage(parsed);
      } catch (err) {
        console.error('[useUnifiedSSE] Failed to parse event', eventType, err);
      }
    };

    es.addEventListener(eventType, listener as EventListener);

    return () => {
      es.removeEventListener(eventType, listener as EventListener);
    };
  }, [eventType, onMessage]);
}
