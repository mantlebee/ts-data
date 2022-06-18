export function calclulateLastPage(
  totalItemsCount: number,
  itemsPerPage: number
): number {
  return Math.ceil(totalItemsCount / itemsPerPage) || 1;
}

export function calculateSkip(
  itemsPerPage: number,
  selectedPage: number
): number {
  return (selectedPage - 1) * itemsPerPage;
}

export function calclulateTop(
  totalItemsCount: number,
  itemsPerPage: number,
  skip: number
): number {
  return Math.min(totalItemsCount - skip, itemsPerPage);
}
