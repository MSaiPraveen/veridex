export interface ProductResponse {
  id: string;
  name: string;
  category: string;
  complianceStatus: string;
}

export interface CreateProductRequest {
  name: string;
  category: string;
  description?: string;
  origin?: string;
}

export interface UpdateProductRequest {
  name?: string;
  category?: string;
  description?: string;
  origin?: string;
}
