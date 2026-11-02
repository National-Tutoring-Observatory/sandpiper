export default function getModelPaginationByCurrentPage<T extends object>(
  currentPage: number,
  options: T,
  paginationAmount = 20,
): T & { skip: number; limit: number } {
  return Object.assign(options, {
    skip: (currentPage - 1) * paginationAmount,
    limit: paginationAmount,
  });
}
