# HTTP Streaming Developer Guide

## Quick Start

### Server-Side: Creating a Streaming Endpoint

```typescript
import { Router, Request, Response } from 'express';
import { initializeStream, setupStreamCleanup } from '../utils/httpStream.js';

const router = Router();

router.get('/api/my-stream', async (_req: Request, res: Response) => {
  // Initialize the stream and get event sender
  const sendEvent = initializeStream(res);
  
  let isActive = true;
  
  // Send initial connection event
  sendEvent('connected', { message: 'Stream connected' });
  
  // Set up cleanup when client disconnects
  setupStreamCleanup(res, () => {
    isActive = false;
    console.log('Client disconnected');
  });
  
  // Example: Poll and send updates
  const pollData = async () => {
    while (isActive) {
      try {
        const data = await fetchSomeData();
        sendEvent('data', data);
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        sendEvent('error', { error: String(error) });
      }
    }
  };
  
  pollData();
});

export default router;
```

### Client-Side: Consuming a Stream

```typescript
import { useUnifiedStream } from '../../shared/api/useUnifiedStream';

export function useMyData() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  
  // Subscribe to 'data' events
  useUnifiedStream('data', (newData) => {
    setData(newData);
  });
  
  // Subscribe to 'error' events
  useUnifiedStream('error', (errorData) => {
    setError(errorData.error);
  });
  
  return { data, error };
}
```

## Event Format

All events are sent as NDJSON (Newline-Delimited JSON):

```json
{"type":"event-name","data":{...}}\n
```

### Example Events

```json
{"type":"connected","data":{"message":"Stream connected"}}
{"type":"server-status","data":{"ok":true,"status":"running"}}
{"type":"backups","data":[{"name":"backup1.tar.gz","size_bytes":1024}]}
{"type":"error","data":{"ok":false,"error":"Something went wrong"}}
```

## Server-Side API

### `initializeStream(response: Response)`

Sets up HTTP streaming headers and returns an event sender function.

```typescript
const sendEvent = initializeStream(response);
sendEvent('my-event', { foo: 'bar' });
```

### `setupStreamCleanup(response: Response, cleanupHandler: () => void)`

Registers a cleanup handler that runs when the client disconnects.

```typescript
setupStreamCleanup(response, () => {
  console.log('Cleaning up resources...');
  stopPolling();
  releaseResources();
});
```

### `sendStreamEvent(response: Response, eventType: string, eventData: any)`

Sends a single event to the client.

```typescript
sendStreamEvent(response, 'update', { count: 42 });
```

### `closeAllStreamConnections()`

Closes all active streaming connections (used during graceful shutdown).

```typescript
process.on('SIGTERM', () => {
  closeAllStreamConnections();
  server.close();
});
```

## Client-Side API

### `useUnifiedStream<T>(eventType: string, onMessage: (data: T) => void)`

React hook that subscribes to a specific event type from the unified stream.

```typescript
useUnifiedStream<BackupData[]>('backups', (backups) => {
  console.log('Received backups:', backups);
});
```

**Features:**
- Automatic connection management
- Automatic reconnection with exponential backoff
- Cleanup on unmount
- Type-safe event data

### Reconnection Behavior

The client automatically reconnects with exponential backoff:
- Initial delay: 1 second
- Max delay: 30 seconds
- Backoff multiplier: 2x

```typescript
// Reconnection timeline:
// Attempt 1: immediate
// Attempt 2: 1s delay
// Attempt 3: 2s delay
// Attempt 4: 4s delay
// Attempt 5: 8s delay
// Attempt 6: 16s delay
// Attempt 7+: 30s delay (capped)
```

## Best Practices

### Server-Side

1. **Always set up cleanup handlers**
   ```typescript
   setupStreamCleanup(res, () => {
     isActive = false;
     clearInterval(timer);
   });
   ```

2. **Check if stream is still active before sending**
   ```typescript
   if (isActive && !res.writableEnded) {
     sendEvent('data', myData);
   }
   ```

3. **Send initial state immediately**
   ```typescript
   sendEvent('connected', { message: 'Connected' });
   sendEvent('initial-data', getCurrentState());
   ```

4. **Use meaningful event types**
   ```typescript
   // Good
   sendEvent('server-status', { status: 'running' });
   sendEvent('backup-created', { name: 'backup.tar.gz' });
   
   // Bad
   sendEvent('update', { type: 'status', data: 'running' });
   ```

5. **Handle errors gracefully**
   ```typescript
   try {
     const data = await fetchData();
     sendEvent('data', data);
   } catch (error) {
     sendEvent('error', { error: String(error) });
   }
   ```

### Client-Side

1. **Use stable callback references**
   ```typescript
   const handleUpdate = useCallback((data) => {
     setData(data);
   }, []);
   
   useUnifiedStream('data', handleUpdate);
   ```

2. **Handle both data and error events**
   ```typescript
   useUnifiedStream('data', handleData);
   useUnifiedStream('error', handleError);
   ```

3. **Type your event data**
   ```typescript
   interface BackupData {
     name: string;
     size_bytes: number;
   }
   
   useUnifiedStream<BackupData[]>('backups', handleBackups);
   ```

4. **Don't create new functions in render**
   ```typescript
   // Bad
   useUnifiedStream('data', (data) => setData(data));
   
   // Good
   const handleData = useCallback((data) => setData(data), []);
   useUnifiedStream('data', handleData);
   ```

## Testing

### Manual Testing with curl

```bash
# Test a streaming endpoint
curl -N http://localhost:3000/api/stream

# Expected output (NDJSON):
{"type":"connected","data":{"message":"Unified stream connected"}}
{"type":"version","data":{"version":"3.0.0"}}
{"type":"server-status","data":{"ok":true,"status":"running"}}
```

### Testing in Browser DevTools

1. Open Network tab
2. Find the streaming request (e.g., `/api/stream`)
3. Click on it to see details
4. Check Headers tab:
   - `Content-Type: application/x-ndjson`
   - `Cache-Control: no-cache`
   - `Connection: keep-alive`
5. Check Response tab to see NDJSON events

### Unit Testing

```typescript
import { sendStreamEvent } from '../utils/httpStream';

describe('Stream Events', () => {
  it('should send NDJSON formatted events', () => {
    const mockResponse = {
      write: jest.fn(),
    };
    
    sendStreamEvent(mockResponse as any, 'test', { foo: 'bar' });
    
    expect(mockResponse.write).toHaveBeenCalledWith(
      '{"type":"test","data":{"foo":"bar"}}\n'
    );
  });
});
```

## Debugging

### Enable Verbose Logging

```typescript
// Client-side
const stream = getStreamConnection();
stream.addEventListener('*', (data) => {
  console.log('[Stream Event]', data);
});
```

### Check Connection State

```typescript
// In browser console
// The stream connection is a singleton, you can inspect it
console.log(streamConnection);
```

### Monitor Reconnections

```typescript
useUnifiedStream('connected', (data) => {
  console.log('Stream connected:', data);
});
```

## Common Issues

### Stream Not Connecting

**Symptoms:** No events received, no errors in console

**Solutions:**
1. Check if server is running
2. Verify endpoint URL is correct
3. Check browser console for network errors
4. Verify no CORS issues
5. Check if proxy/firewall is blocking

### Events Not Received

**Symptoms:** Connection established but no events

**Solutions:**
1. Check server logs for errors
2. Verify event types match between client and server
3. Check if cleanup handler is being called prematurely
4. Verify stream is still active on server

### Frequent Reconnections

**Symptoms:** Connection drops and reconnects repeatedly

**Solutions:**
1. Check server logs for errors
2. Verify server isn't closing connections prematurely
3. Check if load balancer has timeout settings
4. Verify cleanup logic isn't too aggressive

### Memory Leaks

**Symptoms:** Memory usage grows over time

**Solutions:**
1. Ensure cleanup handlers are registered
2. Verify event listeners are removed on unmount
3. Check for circular references in event data
4. Use React DevTools Profiler to find leaks

## Performance Tips

1. **Batch Updates**: Don't send events too frequently
   ```typescript
   // Bad: Send on every change
   onChange(() => sendEvent('update', data));
   
   // Good: Debounce or throttle
   const debouncedSend = debounce(() => sendEvent('update', data), 100);
   onChange(debouncedSend);
   ```

2. **Send Only Changed Data**: Compare before sending
   ```typescript
   let previousData = null;
   
   const poll = async () => {
     const data = await fetchData();
     const dataJson = JSON.stringify(data);
     
     if (dataJson !== previousData) {
       sendEvent('data', data);
       previousData = dataJson;
     }
   };
   ```

3. **Use Compression**: Enable gzip/brotli in your server
   ```typescript
   import compression from 'compression';
   app.use(compression());
   ```

4. **Limit Event Size**: Don't send huge payloads
   ```typescript
   // Bad: Send entire dataset
   sendEvent('data', hugeArray);
   
   // Good: Send paginated or summarized data
   sendEvent('data', hugeArray.slice(0, 100));
   ```

## Migration from SSE

If you're migrating from SSE, see `MIGRATION_SSE_TO_HTTP_STREAMING.md` for a detailed guide.

**Quick comparison:**

| Feature | SSE | HTTP Streaming (NDJSON) |
|---------|-----|-------------------------|
| Format | `event: type\ndata: {...}\n\n` | `{"type":"type","data":{...}}\n` |
| API | EventSource | Fetch + ReadableStream |
| Reconnection | Browser-controlled | Custom logic |
| Error Handling | Limited | Full control |
| Browser Support | Good | Excellent |
| Debugging | Harder | Easier |

## Resources

- [NDJSON Specification](http://ndjson.org/)
- [Fetch API - Streams](https://developer.mozilla.org/en-US/docs/Web/API/Streams_API)
- [ReadableStream](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream)
