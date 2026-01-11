export interface PaginationRequest {
  page: number;
  limit: number;
}

export interface PaginationResponse {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
