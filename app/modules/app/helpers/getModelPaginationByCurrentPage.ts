export default function getModelPaginationByCurrentPage(
  currentPage: number,
  paginationAmount = 20,
): { skip: number; limit: number } {
  return {
    skip: (currentPage - 1) * paginationAmount,
    limit: paginationAmount,
  };
}
