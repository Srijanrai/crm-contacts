/** Selection controls passed to the table and card list (wired by the list page). */
export interface RowSelection {
  isSelected: (id: string) => boolean
  toggle: (id: string) => void
  /** Header checkbox state for the current page. */
  page: 'none' | 'some' | 'all'
  togglePage: () => void
}
