import mongoose from 'mongoose'
import { setupApi } from './test/app.js'

describe('app skeleton', () => {
  it('answers health checks', async () => {
    const { api } = await setupApi()
    const res = await api.get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ status: 'ok' })
  })

  it('returns the error shape for unknown routes', async () => {
    const { api } = await setupApi()
    const res = await api.get('/api/nope')
    expect(res.status).toBe(404)
    expect(res.body).toEqual({ error: { code: 'NOT_FOUND', message: 'Route not found' } })
  })

  it('rejects malformed JSON with a field error', async () => {
    const { api } = await setupApi()
    const res = await api.post('/api/anything').set('Content-Type', 'application/json').send('{')
    expect(res.status).toBe(400)
    expect(res.body.error).toMatchObject({ code: 'VALIDATION_ERROR', fields: { body: 'Malformed JSON' } })
  })

  it('rejects bodies over 100kb', async () => {
    const { api } = await setupApi()
    const res = await api.post('/api/anything').send({ big: 'x'.repeat(200 * 1024) })
    expect(res.status).toBe(413)
    expect(res.body.error).toMatchObject({ code: 'VALIDATION_ERROR', message: 'Request body is too large' })
  })

  it('treats malformed URL encoding and unusable body encodings as client errors, not 500s', async () => {
    const { api } = await setupApi()
    const badPath = await api.get('/api/contacts/%ZZ')
    expect(badPath.status).toBe(400)
    expect(badPath.body.error.code).toBe('VALIDATION_ERROR')
    const badEncoding = await api.post('/api/anything').set('Content-Type', 'application/json').set('Content-Encoding', 'gzip').send('{"a":1}')
    expect(badEncoding.status).toBe(400)
    const unknownEncoding = await api.post('/api/anything').set('Content-Type', 'application/json').set('Content-Encoding', 'nope').send('{}')
    expect(unknownEncoding.status).toBe(415)
    expect(unknownEncoding.body.error.code).toBe('VALIDATION_ERROR')
  })

  it('validates the X-Account-Id header', async () => {
    const { api } = await setupApi()
    const bad = await api.get('/api/nope').set('X-Account-Id', 'nope')
    expect(bad.status).toBe(400)
    expect(bad.body.error.code).toBe('INVALID_ID')
    const unknown = await api.get('/api/nope').set('X-Account-Id', new mongoose.Types.ObjectId().toString())
    expect(unknown.status).toBe(404)
    expect(unknown.body.error.message).toBe('Account not found')
  })

  it('allows the configured browser origin only', async () => {
    const { api } = await setupApi()
    const allowed = await api.get('/api/health').set('Origin', 'http://localhost:5173')
    expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:5173')
    const other = await api.get('/api/health').set('Origin', 'https://evil.example')
    expect(other.headers['access-control-allow-origin']).toBeUndefined()
  })
})
