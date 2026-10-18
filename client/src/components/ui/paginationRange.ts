export type PageItem = number | '…'

/**
 * Page numbers to show: first, last, and a window of 2*siblings+1 pages around
 * the current one (shifted at the edges so it keeps its size). A gap of one
 * page shows that page instead of an ellipsis.
 */
export function paginationRange(current: number, total: number, siblings = 1): PageItem[] {
  if (total <= 0) return []
  const windowSize = siblings * 2 + 1
  if (total <= windowSize + 2) return Array.from({ length: total }, (_, i) => i + 1)

  let start = Math.max(1, current - siblings)
  let end = Math.min(total, current + siblings)
  if (end - start + 1 < windowSize) {
    if (start === 1) end = Math.min(total, start + windowSize - 1)
    else start = Math.max(1, end - windowSize + 1)
  }

  const items: PageItem[] = []
  if (start > 1) {
    items.push(1)
    if (start === 3) items.push(2)
    else if (start > 3) items.push('…')
  }
  for (let p = start; p <= end; p++) items.push(p)
  if (end < total) {
    if (end === total - 2) items.push(total - 1)
    else if (end < total - 2) items.push('…')
    items.push(total)
  }
  return items
}
