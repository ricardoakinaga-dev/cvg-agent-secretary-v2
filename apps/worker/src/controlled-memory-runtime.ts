import type { TenantId } from '@cvg/platform'
import type { DurableOutboxAdapter } from '@cvg/persistence'
import type { ObservabilityCollectorPort } from '@cvg/observability'
import {
  createControlledWorker,
  type ControlledWorkerDrainResult
} from './controlled-worker.ts'
import { createCollectorWorkerTelemetry } from './worker-observability.ts'

export interface ControlledMemoryRuntimeOptions {
  tenantId: TenantId
  workerId: string
  /** Shared outbox adapter; the API and the worker must drain the same one. */
  adapter: DurableOutboxAdapter
  /**
   * Optional controlled collector. When present, dispatch records only the
   * correlation ID and enumerated classifications, and the collector is
   * flushed and closed in `finally` even when the drain fails.
   */
  collector?: ObservabilityCollectorPort
  drainLimit?: number
}

/**
 * Import-safe controlled-memory drain shared by the worker entrypoint's
 * `controlled-memory` branch and the AUD20-10 composition harness. It never
 * starts a listener, socket or external effect: handlers are the controlled
 * no-op seams, and the optional collector is the only sink.
 */
export async function runControlledMemoryRuntime(
  options: ControlledMemoryRuntimeOptions
): Promise<ControlledWorkerDrainResult> {
  const telemetry = options.collector
    ? createCollectorWorkerTelemetry(options.collector)
    : undefined
  const worker = createControlledWorker({
    tenantId: options.tenantId,
    workerId: options.workerId,
    adapter: options.adapter,
    handlers: {
      inboundProcess: (event) => {
        telemetry?.log('worker.inbound.processed', {
          correlationId: event.correlationId,
          operation: 'inbound',
          outcome: 'processed'
        })
        return { status: 'controlled_noop' }
      },
      messageOutbound: (event) => {
        telemetry?.log('worker.outbound.processed', {
          correlationId: event.correlationId,
          operation: 'outbound',
          outcome: 'processed'
        })
        return { status: 'controlled_noop' }
      }
    }
  })
  try {
    return await worker.drain(options.drainLimit ?? 1)
  } finally {
    if (options.collector) {
      try {
        await options.collector.flush()
      } finally {
        await options.collector.close()
      }
    }
  }
}
