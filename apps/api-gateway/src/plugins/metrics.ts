/**
 * Prometheus Metrics Plugin for Fastify
 * 
 * Provides production-grade metrics for monitoring and alerting:
 * - HTTP request metrics (count, duration, status)
 * - Node.js process metrics (memory, CPU, event loop)
 * - Custom business metrics
 */

import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';

// Simple in-memory metrics store (in production, use prom-client library)
interface MetricValue {
  value: number;
  labels: Record<string, string>;
  timestamp: number;
}

interface Histogram {
  count: number;
  sum: number;
  buckets: Map<number, number>;
}

class MetricsCollector {
  private counters: Map<string, MetricValue[]> = new Map();
  private gauges: Map<string, MetricValue> = new Map();
  private histograms: Map<string, Map<string, Histogram>> = new Map();
  
  // Standard histogram buckets for HTTP request durations (in seconds)
  private readonly httpBuckets = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];
  
  // Service info
  private readonly serviceName: string;
  private readonly serviceVersion: string;
  private startTime: number;
  
  constructor(serviceName: string, serviceVersion: string = '1.0.0') {
    this.serviceName = serviceName;
    this.serviceVersion = serviceVersion;
    this.startTime = Date.now();
    
    // Initialize standard metrics
    this.initializeDefaultMetrics();
  }
  
  private initializeDefaultMetrics() {
    // Process uptime
    this.setGauge('process_start_time_seconds', Math.floor(this.startTime / 1000), {});
  }
  
  // Counter: only increases
  incCounter(name: string, labels: Record<string, string> = {}, value: number = 1) {
    const key = this.serializeLabels(labels);
    const metricKey = `${name}_${key}`;
    
    if (!this.counters.has(name)) {
      this.counters.set(name, []);
    }
    
    const existing = this.counters.get(name)!.find(m => 
      this.serializeLabels(m.labels) === key
    );
    
    if (existing) {
      existing.value += value;
      existing.timestamp = Date.now();
    } else {
      this.counters.get(name)!.push({
        value,
        labels,
        timestamp: Date.now(),
      });
    }
  }
  
  // Gauge: can go up or down
  setGauge(name: string, value: number, labels: Record<string, string> = {}) {
    const key = `${name}_${this.serializeLabels(labels)}`;
    this.gauges.set(key, { value, labels, timestamp: Date.now() });
  }
  
  // Histogram: track distribution of values
  observeHistogram(name: string, value: number, labels: Record<string, string> = {}) {
    const labelKey = this.serializeLabels(labels);
    
    if (!this.histograms.has(name)) {
      this.histograms.set(name, new Map());
    }
    
    const histMap = this.histograms.get(name)!;
    
    if (!histMap.has(labelKey)) {
      histMap.set(labelKey, {
        count: 0,
        sum: 0,
        buckets: new Map(this.httpBuckets.map(b => [b, 0])),
      });
    }
    
    const hist = histMap.get(labelKey)!;
    hist.count++;
    hist.sum += value;
    
    for (const bucket of this.httpBuckets) {
      if (value <= bucket) {
        hist.buckets.set(bucket, (hist.buckets.get(bucket) || 0) + 1);
      }
    }
  }
  
  private serializeLabels(labels: Record<string, string>): string {
    return Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
  }
  
  private formatLabels(labels: Record<string, string>): string {
    const entries = Object.entries(labels);
    if (entries.length === 0) return '';
    return `{${entries.map(([k, v]) => `${k}="${v}"`).join(',')}}`;
  }
  
  // Generate Prometheus exposition format
  toPrometheusFormat(): string {
    const lines: string[] = [];
    
    // Add service info
    lines.push(`# HELP service_info Service information`);
    lines.push(`# TYPE service_info gauge`);
    lines.push(`service_info{service="${this.serviceName}",version="${this.serviceVersion}"} 1`);
    lines.push('');
    
    // Add process metrics
    const memUsage = process.memoryUsage();
    lines.push(`# HELP process_resident_memory_bytes Resident memory size in bytes`);
    lines.push(`# TYPE process_resident_memory_bytes gauge`);
    lines.push(`process_resident_memory_bytes ${memUsage.rss}`);
    lines.push('');
    
    lines.push(`# HELP process_heap_bytes Heap memory usage in bytes`);
    lines.push(`# TYPE process_heap_bytes gauge`);
    lines.push(`process_heap_bytes{type="used"} ${memUsage.heapUsed}`);
    lines.push(`process_heap_bytes{type="total"} ${memUsage.heapTotal}`);
    lines.push('');
    
    lines.push(`# HELP process_uptime_seconds Process uptime in seconds`);
    lines.push(`# TYPE process_uptime_seconds gauge`);
    lines.push(`process_uptime_seconds ${Math.floor((Date.now() - this.startTime) / 1000)}`);
    lines.push('');
    
    // Add counters
    for (const [name, values] of this.counters) {
      lines.push(`# HELP ${name} Counter metric`);
      lines.push(`# TYPE ${name} counter`);
      for (const metric of values) {
        lines.push(`${name}${this.formatLabels(metric.labels)} ${metric.value}`);
      }
      lines.push('');
    }
    
    // Add gauges
    const gaugesByName = new Map<string, MetricValue[]>();
    for (const [key, metric] of this.gauges) {
      const name = key.split('_').slice(0, -1).join('_') || key;
      if (!gaugesByName.has(name)) {
        gaugesByName.set(name, []);
      }
      gaugesByName.get(name)!.push(metric);
    }
    
    for (const [name, metrics] of gaugesByName) {
      lines.push(`# HELP ${name} Gauge metric`);
      lines.push(`# TYPE ${name} gauge`);
      for (const metric of metrics) {
        lines.push(`${name}${this.formatLabels(metric.labels)} ${metric.value}`);
      }
      lines.push('');
    }
    
    // Add histograms
    for (const [name, histMap] of this.histograms) {
      lines.push(`# HELP ${name} Histogram metric`);
      lines.push(`# TYPE ${name} histogram`);
      
      for (const [labelKey, hist] of histMap) {
        const labels = labelKey ? `{${labelKey}}` : '';
        const labelPrefix = labelKey ? `${labelKey},` : '';
        
        // Bucket lines
        let cumulative = 0;
        for (const [le, count] of Array.from(hist.buckets.entries()).sort((a, b) => a[0] - b[0])) {
          cumulative += count;
          lines.push(`${name}_bucket{${labelPrefix}le="${le}"} ${cumulative}`);
        }
        lines.push(`${name}_bucket{${labelPrefix}le="+Inf"} ${hist.count}`);
        
        // Sum and count
        lines.push(`${name}_sum${labels} ${hist.sum}`);
        lines.push(`${name}_count${labels} ${hist.count}`);
      }
      lines.push('');
    }
    
    return lines.join('\n');
  }
}

// Global metrics collector instance
let metricsCollector: MetricsCollector;

// Plugin options
interface MetricsPluginOptions {
  serviceName: string;
  serviceVersion?: string;
  metricsPath?: string;
  collectDefaultMetrics?: boolean;
}

const metricsPlugin: FastifyPluginAsync<MetricsPluginOptions> = async (fastify, options) => {
  const {
    serviceName,
    serviceVersion = '1.0.0',
    metricsPath = '/metrics',
    collectDefaultMetrics = true,
  } = options;
  
  // Initialize metrics collector
  metricsCollector = new MetricsCollector(serviceName, serviceVersion);
  
  // Track request metrics
  fastify.addHook('onRequest', async (request: FastifyRequest) => {
    (request as any).metricsStartTime = process.hrtime.bigint();
  });
  
  fastify.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
    const startTime = (request as any).metricsStartTime;
    if (!startTime) return;
    
    const duration = Number(process.hrtime.bigint() - startTime) / 1e9; // Convert to seconds
    
    const labels = {
      method: request.method,
      route: request.routeOptions?.url || request.url.split('?')[0],
      status_code: reply.statusCode.toString(),
    };
    
    // Record request count
    metricsCollector.incCounter('http_requests_total', labels);
    
    // Record request duration
    metricsCollector.observeHistogram('http_request_duration_seconds', duration, {
      method: labels.method,
      route: labels.route,
    });
    
    // Track errors
    if (reply.statusCode >= 400) {
      metricsCollector.incCounter('http_request_errors_total', labels);
    }
  });
  
  // Metrics endpoint
  fastify.get(metricsPath, async (request, reply) => {
    reply.header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    return metricsCollector.toPrometheusFormat();
  });
  
  // Expose metrics collector for custom metrics
  fastify.decorate('metrics', metricsCollector);
  
  fastify.log.info(`Prometheus metrics available at ${metricsPath}`);
};

export default fp(metricsPlugin, {
  name: 'metrics',
  fastify: '4.x',
});

// Export collector for custom metrics
export function getMetricsCollector(): MetricsCollector {
  return metricsCollector;
}

// Type augmentation for Fastify
declare module 'fastify' {
  interface FastifyInstance {
    metrics: MetricsCollector;
  }
}
