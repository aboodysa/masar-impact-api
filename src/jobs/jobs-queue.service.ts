import { Injectable, Logger } from '@nestjs/common';
import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { GraphRepository } from '../graph/graph.repository';
import { EventsGateway } from '../events/events.gateway';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

@Injectable()
export class JobsQueueService {
  private readonly logger = new Logger(JobsQueueService.name);
  private queue: Queue;
  private worker: Worker;

  constructor(
    private readonly graph: GraphRepository,
    private readonly events: EventsGateway,
  ) {
    const connection = new Redis(REDIS_URL, { maxRetriesPerRequest: null }) as any;
    this.queue = new Queue('impact-analysis', { connection });
    this.worker = new Worker('impact-analysis', async (job: Job) => {
      this.events.emitJobUpdate(job.id!, 'processing', { status: 'processing' });
      try {
        const { ImpactService } = await import('../impact/impact.service');
        const impactService = new ImpactService(this.graph);
        const useAI = (job.data as any).ai === true;
        const result = useAI
          ? await impactService.analyzeWithAI(job.data)
          : impactService.analyze(job.data);
        const response = { ...result, ai: useAI };
        this.events.emitJobUpdate(job.id!, 'completed', { status: 'completed', result: response });
        if ((job.data as any).webhookUrl) {
          this.callWebhook((job.data as any).webhookUrl, { jobId: job.id, status: 'completed', result: response });
        }
        return response;
      } catch (err: any) {
        this.logger.error(`Job ${job.id} failed: ${err.message}`);
        this.events.emitJobUpdate(job.id!, 'failed', { status: 'failed', error: err.message });
        if ((job.data as any).webhookUrl) {
          this.callWebhook((job.data as any).webhookUrl, { jobId: job.id, status: 'failed', error: err.message });
        }
        throw err;
      }
    }, { connection });

    this.worker.on('completed', (job: Job) => {
      this.logger.log(`Job ${job.id} completed`);
    });
    this.worker.on('failed', (job: Job | undefined, err: Error) => {
      this.logger.error(`Job ${job?.id} failed: ${err.message}`);
    });
  }

  async enqueue(payload: { title: string; description?: string; targetService?: string; ai?: boolean; webhookUrl?: string }): Promise<{ jobId: string }> {
    const job = await this.queue.add('analyze', payload, {
      removeOnComplete: { age: 3600 * 24 },
      removeOnFail: { age: 3600 * 24 },
    });
    return { jobId: job.id! };
  }

  async getResult(jobId: string): Promise<{ jobId: string; status: string; result?: any; error?: string } | null> {
    try {
      const job = await this.queue.getJob(jobId);
      if (!job) return null;
      if (job.failedReason) return { jobId, status: 'failed', error: job.failedReason };
      const state = await job.getState();
      if (state !== 'completed') return { jobId, status: state };
      return { jobId, status: 'completed', result: job.returnvalue };
    } catch {
      return null;
    }
  }

  private async callWebhook(url: string, data: any) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) this.logger.warn(`Webhook ${url} returned ${response.status}`);
    } catch (err: any) {
      this.logger.warn(`Webhook ${url} failed: ${err.message}`);
    }
  }
}
