export interface DocumentProcessedEvent {
  documentId: string;
  productId: string;
  ownerId: string;
  extracted?: Record<string, any>;
  failureReason?: string;
}
