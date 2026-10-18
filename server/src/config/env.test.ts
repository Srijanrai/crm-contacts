import { DEMO_ACCOUNT_ID, parseEnv } from './env.js'

const base = { MONGODB_URI: 'mongodb://localhost:27017/crm' }

describe('parseEnv', () => {
  it('requires MONGODB_URI', () => {
    expect(() => parseEnv({})).toThrow('MONGODB_URI is required')
  })

  it('applies defaults', () => {
    expect(parseEnv(base)).toEqual({
      port: 4000,
      mongodbUri: base.MONGODB_URI,
      corsOrigins: ['http://localhost:5173'],
      defaultAccountId: DEMO_ACCOUNT_ID,
    })
  })

  it('splits and trims CORS origins', () => {
    expect(parseEnv({ ...base, CORS_ORIGIN: 'https://a.app, https://b.app ,' }).corsOrigins).toEqual(['https://a.app', 'https://b.app'])
    // A pasted trailing slash would otherwise never match the browser's Origin header.
    expect(parseEnv({ ...base, CORS_ORIGIN: 'https://x.netlify.app/' }).corsOrigins).toEqual(['https://x.netlify.app'])
  })

  it('rejects a malformed account id and port', () => {
    expect(() => parseEnv({ ...base, DEFAULT_ACCOUNT_ID: 'nope' })).toThrow('DEFAULT_ACCOUNT_ID must be a 24-character hex id')
    expect(() => parseEnv({ ...base, PORT: 'abc' })).toThrow('PORT must be a positive integer')
  })
})
