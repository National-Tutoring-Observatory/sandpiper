export default function getTotalPages(
  count: number,
  paginationAmount = 20,
): number {
  return Math.ceil(count / paginationAmount) || 1;
}
