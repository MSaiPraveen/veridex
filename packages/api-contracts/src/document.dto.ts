export interface DocumentResponse {
  id: string;
  name: string;
  type: string;
  status: string;
  productId?: string;
}

export interface UploadDocumentRequest {
  name: string;
  type: string;
  productId?: string;
}
