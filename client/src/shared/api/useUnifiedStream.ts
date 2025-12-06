import { useEffect, useRef } from 'react';

/**
 * HTTP Streaming connection manager using NDJSON/SSE format.
 * Replaces EventSource with Fetch + ReadableStream for better control and compatibility.
 */
class StreamConnection {
  private readonly url: string;
  private readonly listeners: Map<string, Set<(data: any) => void>>;
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private abortController: AbortController | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private reconnectDelay = 1000;
  private readonly maxReconnectDelay = 30000;
  private isConnecting = false;

  constructor(url: string) {
    this.url = url;
    this.listeners = new Map();
  }

  async connect(): Promise<void> {
    if (this.isConnecting || this.reader) return;
    this.isConnecting = true;

    try {
      this.abortController = new AbortController();
      const response = await fetch(this.url, {
        headers: { Accept: 'text/event-stream' },
        signal: this.abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type') || '';
      const isSSE = contentType.includes('text/event-stream');

      if (!response.body) {
        throw new Error('Response body is null');
      }

      this.reader = response.body.getReader();
      this.reconnectDelay = 1000;
      this.isConnecting = false;

      if (isSSE) {
        await this.readSSEStream();
      } else {
        await this.readNDJSONStream();
      }
    } catch (error) {
      this.isConnecting = false;
      if ((error as Error).name !== 'AbortError') {
        // Only log connection errors if not a simple network failure during dev
        const errorMessage = (error as Error).message;
        if (!errorMessage.includes('Load failed') && !errorMessage.includes('Failed to fetch')) {
          console.error('[StreamConnection] Connection error:', error);
        }
        this.scheduleReconnect();
      }
    }
  }

  private processSSELine(line: string, currentEvent: { value: string }): void {
    if (line.startsWith('event: ')) {
      currentEvent.value = line.slice(7).trim();
    } else if (line.startsWith('data: ')) {
      const data = line.slice(6);
      try {
        const parsed = JSON.parse(data);
        this.dispatch(currentEvent.value, parsed);
        currentEvent.value = '';
      } catch (err) {
        console.error('[StreamConnection] Failed to parse SSE data:', err);
      }
    }
  }

  private async readSSEStream(): Promise<void> {
    const decoder = new TextDecoder();
    let buffer = '';
    const currentEvent = { value: '' };

    try {
      while (this.reader) {
        const { done, value } = await this.reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          this.processSSELine(line, currentEvent);
        }
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('[StreamConnection] Stream read error:', error);
      }
    } finally {
      this.cleanup();
      this.scheduleReconnect();
    }
  }

  private processNDJSONLine(line: string): void {
    if (!line.trim()) return;
    try {
      const event = JSON.parse(line);
      if (event.type && event.data !== undefined) {
        this.dispatch(event.type, event.data);
      }
    } catch (err) {
      console.error('[StreamConnection] Failed to parse NDJSON line:', err);
    }
  }

  private async readNDJSONStream(): Promise<void> {
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (this.reader) {
        const { done, value } = await this.reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          this.processNDJSONLine(line);
        }
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        const errorMessage = (error as Error).message;
        // Only log unexpected errors, not common network failures
        if (!errorMessage.includes('Load failed') && !errorMessage.includes('Failed to fetch')) {
          console.error('[StreamConnection] Stream read error:', error);
        }
      }
    } finally {
      this.cleanup();
      this.scheduleReconnect();
    }
  }

  private dispatch(eventType: string, data: any): void {
    const handlers = this.listeners.get(eventType);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(data);
        } catch (err) {
          console.error(`[StreamConnection] Handler error for ${eventType}:`, err);
        }
      }
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimeout) return;
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.connect();
    }, this.reconnectDelay);
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
  }

  addListener(eventType: string, handler: (data: any) => void): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(handler);
  }

  removeListener(eventType: string, handler: (data: any) => void): void {
    const handlers = this.listeners.get(eventType);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.listeners.delete(eventType);
      }
    }
  }

  private cleanup(): void {
    if (this.reader) {
      this.reader.cancel().catch(() => {});
      this.reader = null;
    }
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    this.cleanup();
    this.listeners.clear();
  }
}

let streamConnection: StreamConnection | null = null;

function getStreamConnection(): StreamConnection {
  if (!streamConnection) {
    streamConnection = new StreamConnection('/api/stream');
    streamConnection.connect();
  }
  return streamConnection;
}

/**
 * Subscribes to a unified HTTP stream event type.
 * Supports both NDJSON and SSE formats (auto-detected by Content-Type).
 * @param eventType Event type emitted by /api/stream
 * @param onMessage Callback invoked with parsed JSON payload
 */
export function useUnifiedStream<T>(eventType: string, onMessage: (data: T) => void): void {
  const handlerRef = useRef(onMessage);
  handlerRef.current = onMessage;

  useEffect(() => {
    const stream = getStreamConnection();
    const stableHandler = (data: T) => handlerRef.current(data);

    stream.addListener(eventType, stableHandler);

    return () => {
      stream.removeListener(eventType, stableHandler);
    };
  }, [eventType]);
}

export default useUnifiedStream;
