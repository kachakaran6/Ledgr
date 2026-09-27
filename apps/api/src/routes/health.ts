import type { FastifyPluginAsync } from 'fastify';

// In-memory latency tracker for p50, p95, p99 metrics
const latencies: number[] = [];
const MAX_LATENCY_SAMPLES = 5000;

export function recordLatency(ms: number) {
  if (latencies.length >= MAX_LATENCY_SAMPLES) {
    latencies.shift();
  }
  latencies.push(ms);
}

function calculatePercentile(p: number): number {
  if (latencies.length === 0) return 0;
  const sorted = [...latencies].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return Number((sorted[Math.max(0, index)] || 0).toFixed(2));
}

export const healthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/health', async () => {
    return {
      status: 'healthy',
      service: 'logpast-api',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    };
  });

  fastify.get('/health/ready', async () => {
    return {
      status: 'ready',
      timestamp: new Date().toISOString()
    };
  });

  fastify.get('/health/metrics', async () => {
    return {
      sample_count: latencies.length,
      p50_ms: calculatePercentile(50),
      p95_ms: calculatePercentile(95),
      p99_ms: calculatePercentile(99),
      target_read_p99_ms: 500,
      target_write_p99_ms: 800,
      p99_status: calculatePercentile(99) <= 500 ? 'PASS' : 'WARN'
    };
  });
};
