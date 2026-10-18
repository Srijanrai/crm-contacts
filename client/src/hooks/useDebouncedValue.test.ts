import { act, renderHook } from '@testing-library/react'
import { useDebouncedValue } from './useDebouncedValue'

afterEach(() => vi.useRealTimers())

it('only updates after the value has been stable for 300ms', () => {
  vi.useFakeTimers()
  const { result, rerender } = renderHook(({ v }) => useDebouncedValue(v), { initialProps: { v: 'a' } })
  rerender({ v: 'ab' })
  act(() => vi.advanceTimersByTime(200))
  rerender({ v: 'abc' })
  act(() => vi.advanceTimersByTime(299))
  expect(result.current).toBe('a')
  act(() => vi.advanceTimersByTime(1))
  expect(result.current).toBe('abc')
})
