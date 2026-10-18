import { paginationRange } from './paginationRange'

describe('paginationRange', () => {
  it.each([
    [1, 1, [1]],
    [1, 5, [1, 2, 3, 4, 5]],
    [1, 10, [1, 2, 3, '…', 10]],
    [5, 10, [1, '…', 4, 5, 6, '…', 10]],
    [10, 10, [1, '…', 8, 9, 10]],
    [4, 10, [1, 2, 3, 4, 5, '…', 10]],
    [50, 50, [1, '…', 48, 49, 50]],
  ])('page %i of %i', (current, total, expected) => {
    expect(paginationRange(current, total)).toEqual(expected)
  })

  it('returns nothing when there are no pages', () => {
    expect(paginationRange(1, 0)).toEqual([])
  })
})
