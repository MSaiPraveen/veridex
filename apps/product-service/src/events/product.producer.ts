import { Kafka, Producer } from 'kafkajs';
import { TOPICS } from '@veridex/event-contracts';
import { env } from '../config/env';
import { IProduct, IProductBase, LeanProduct, ComplianceStatus } from '../domain/product.entity';

// Type that works for both full documents and lean objects
type ProductLike = IProduct | LeanProduct | IProductBase;

const kafka = new Kafka({
  clientId: 'product-service',
  brokers: [env.KAFKA_BROKER],
});

// Singleton producer pattern
let producer: Producer | null = null;
let isConnected = false;

async function getProducer(): Promise<Producer> {
  if (!producer) {
    producer = kafka.producer();
  }
  
  if (!isConnected) {
    await producer.connect();
    isConnected = true;
    console.log('[Product Producer] Connected to Kafka');
  }
  
  return producer;
}

export async function disconnectProducer(): Promise<void> {
  if (producer && isConnected) {
    await producer.disconnect();
    isConnected = false;
    console.log('[Product Producer] Disconnected from Kafka');
  }
}

// ================== PRODUCT EVENTS ==================

export async function emitProductCreated(product: ProductLike): Promise<void> {
  try {
    const prod = await getProducer();
    await prod.send({
      topic: TOPICS.PRODUCT_CREATED,
      messages: [{
        key: product._id?.toString(),
        value: JSON.stringify({
          eventType: 'PRODUCT_CREATED',
          timestamp: new Date().toISOString(),
          data: {
            productId: product._id,
            merchantId: product.merchantId,
            organizationId: product.organizationId,
            name: product.name,
            sku: product.sku,
            category: product.category,
            price: product.price,
            complianceStatus: product.complianceStatus,
          },
        }),
      }],
    });
    console.log(`[Product Producer] Emitted PRODUCT_CREATED for ${product.name}`);
  } catch (error) {
    console.error('[Product Producer] Failed to emit PRODUCT_CREATED:', error);
  }
}

export async function emitProductUpdated(product: ProductLike): Promise<void> {
  try {
    const prod = await getProducer();
    await prod.send({
      topic: TOPICS.PRODUCT_UPDATED,
      messages: [{
        key: product._id?.toString(),
        value: JSON.stringify({
          eventType: 'PRODUCT_UPDATED',
          timestamp: new Date().toISOString(),
          data: {
            productId: product._id,
            merchantId: product.merchantId,
            name: product.name,
            status: product.status,
            complianceStatus: product.complianceStatus,
            isActive: product.isActive,
          },
        }),
      }],
    });
    console.log(`[Product Producer] Emitted PRODUCT_UPDATED for ${product.name}`);
  } catch (error) {
    console.error('[Product Producer] Failed to emit PRODUCT_UPDATED:', error);
  }
}

export async function emitProductDeleted(product: ProductLike): Promise<void> {
  try {
    const prod = await getProducer();
    await prod.send({
      topic: TOPICS.PRODUCT_DELETED,
      messages: [{
        key: product._id?.toString(),
        value: JSON.stringify({
          eventType: 'PRODUCT_DELETED',
          timestamp: new Date().toISOString(),
          data: {
            productId: product._id,
            merchantId: product.merchantId,
            name: product.name,
          },
        }),
      }],
    });
    console.log(`[Product Producer] Emitted PRODUCT_DELETED for ${product.name}`);
  } catch (error) {
    console.error('[Product Producer] Failed to emit PRODUCT_DELETED:', error);
  }
}

export async function emitComplianceStatusChanged(
  product: ProductLike,
  previousStatus: ComplianceStatus
): Promise<void> {
  try {
    const prod = await getProducer();
    await prod.send({
      topic: TOPICS.PRODUCT_COMPLIANCE_CHANGED,
      messages: [{
        key: product._id?.toString(),
        value: JSON.stringify({
          eventType: 'PRODUCT_COMPLIANCE_CHANGED',
          timestamp: new Date().toISOString(),
          data: {
            productId: product._id,
            merchantId: product.merchantId,
            name: product.name,
            previousStatus,
            newStatus: product.complianceStatus,
            complianceNotes: product.complianceNotes,
          },
        }),
      }],
    });
    console.log(`[Product Producer] Emitted PRODUCT_COMPLIANCE_CHANGED for ${product.name}`);
  } catch (error) {
    console.error('[Product Producer] Failed to emit PRODUCT_COMPLIANCE_CHANGED:', error);
  }
}

export async function emitInventoryChanged(
  product: ProductLike,
  previousQuantity: number,
  newQuantity: number,
  reason?: string
): Promise<void> {
  try {
    const prod = await getProducer();
    await prod.send({
      topic: TOPICS.PRODUCT_INVENTORY_CHANGED,
      messages: [{
        key: product._id?.toString(),
        value: JSON.stringify({
          eventType: 'PRODUCT_INVENTORY_CHANGED',
          timestamp: new Date().toISOString(),
          data: {
            productId: product._id,
            merchantId: product.merchantId,
            name: product.name,
            previousQuantity,
            newQuantity,
            change: newQuantity - previousQuantity,
            reason,
          },
        }),
      }],
    });
    console.log(`[Product Producer] Emitted PRODUCT_INVENTORY_CHANGED for ${product.name}`);
  } catch (error) {
    console.error('[Product Producer] Failed to emit PRODUCT_INVENTORY_CHANGED:', error);
  }
}
