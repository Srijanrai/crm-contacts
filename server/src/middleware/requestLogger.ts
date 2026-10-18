import type { RequestHandler } from 'express'

/**
 * One line per request: method, path, status, duration. Logs the path without the query string,
 * so search text (names, emails, phone numbers) never lands in the hosting logs. Silent under tests.
 */
export const requestLogger: RequestHandler = (req, res, next) => {
  if (process.env.NODE_ENV === 'test') return next()
  const start = performance.now()
  res.on('finish', () => {
    console.log(`${req.method} ${req.originalUrl.split('?')[0]} ${res.statusCode} ${Math.round(performance.now() - start)}ms`)
  })
  next()
}
