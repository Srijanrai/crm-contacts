import { server } from '@/test/mockBackend/server'

/** Counts requests the mock backend receives that match method + path regex. */
export function countRequests(method: string, path: RegExp) {
  let count = 0
  const listener = ({ request }: { request: Request }) => {
    if (request.method === method && path.test(new URL(request.url).pathname)) count++
  }
  server.events.on('request:start', listener)
  return {
    get count() {
      return count
    },
    stop: () => server.events.removeListener('request:start', listener),
  }
}
