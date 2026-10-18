import { DEFAULT_LIST_QUERY, parseListQuery, serializeListQuery } from './listQuery'

const parse = (s: string) => parseListQuery(new URLSearchParams(s))

describe('parseListQuery', () => {
  it('returns defaults for an empty query', () => {
    expect(parse('')).toEqual({ query: DEFAULT_LIST_QUERY, invalid: [] })
  })

  it('parses every valid parameter', () => {
    expect(parse('q=jo&tags=VIP,Lead&company=acme&sort=name&page=3&limit=50').query).toEqual({
      q: 'jo',
      tags: ['VIP', 'Lead'],
      company: 'acme',
      sort: 'name',
      page: 3,
      limit: 50,
    })
  })

  it('falls back to defaults for invalid values and reports them', () => {
    const { query, invalid } = parse('page=abc&limit=1000&sort=foo')
    expect(query).toEqual(DEFAULT_LIST_QUERY)
    expect([...invalid].sort()).toEqual(['limit', 'page', 'sort'])
  })

  it('rejects page 0, negative and fractional numbers', () => {
    expect(parse('page=0').invalid).toEqual(['page'])
    expect(parse('limit=-5').invalid).toEqual(['limit'])
    expect(parse('page=1.5').invalid).toEqual(['page'])
  })

  it('rejects page numbers too large to represent exactly', () => {
    expect(parse('page=99999999999999999999').invalid).toEqual(['page'])
  })

  it('rejects more than 10 tags', () => {
    const tags = Array.from({ length: 11 }, (_, i) => `t${i}`).join(',')
    const { query, invalid } = parse(`tags=${tags}`)
    expect(query.tags).toEqual([])
    expect(invalid).toEqual(['tags'])
  })

  it('ignores empty tag entries and trims the search text', () => {
    expect(parse('tags=,VIP,&q=%20jo%20').query).toMatchObject({ tags: ['VIP'], q: 'jo' })
  })

  it('rejects a search longer than 100 characters', () => {
    expect(parse(`q=${'a'.repeat(101)}`).invalid).toEqual(['q'])
  })
})

describe('serializeListQuery', () => {
  it('omits defaults', () => {
    expect(serializeListQuery(DEFAULT_LIST_QUERY).toString()).toBe('')
  })

  it('round-trips non-default values', () => {
    const input = 'q=jo&tags=VIP%2CLead&company=acme&sort=name&page=2&limit=50'
    expect(serializeListQuery(parse(input).query).toString()).toBe(input)
  })
})
