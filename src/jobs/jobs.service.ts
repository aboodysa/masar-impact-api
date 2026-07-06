import { Injectable, Logger } from '@nestjs/common';
import { GraphRepository } from '../graph/graph.repository';

interface Job {
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  payload: { title: string; description?: string; targetService?: string };
  createdAt: string;
  updatedAt: string;
  resultUrl: string | null;
  result: unknown | null;
  error: string | null;
}

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);
  private jobs = new Map<string, Job>();

  constructor(private readonly graph: GraphRepository) {}

  create(payload: { title: string; description?: string; targetService?: string }) {
    const jobId = `JOB-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const job: Job = {
      jobId,
      status: 'queued',
      payload,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      resultUrl: null,
      result: null,
      error: null,
    };
    this.jobs.set(jobId, job);
    this.process(job);
    return { jobId, status: job.status };
  }

  get(jobId: string) {
    return this.jobs.get(jobId) || null;
  }

  getResult(jobId: string) {
    const job = this.jobs.get(jobId);
    if (!job) return null;
    if (job.status !== 'completed') return { jobId, status: job.status };
    return { jobId, status: job.status, result: job.result };
  }

  list(limit = 20) {
    return Array.from(this.jobs.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit)
      .map(j => ({ jobId: j.jobId, status: j.status, createdAt: j.createdAt }));
  }

  private async process(job: Job) {
    job.status = 'processing';
    job.updatedAt = new Date().toISOString();
    try {
      const { ImpactService } = await import('../impact/impact.service');
      const impactService = new ImpactService(this.graph);
      const result = impactService.analyze({
        title: job.payload.title,
        description: job.payload.description,
        targetService: job.payload.targetService,
      });
      job.status = 'completed';
      job.result = result;
      job.resultUrl = `/api/v1/impact/jobs/${job.jobId}/result`;
    } catch (err: any) {
      this.logger.error(`Job ${job.jobId} failed: ${err.message}`);
      job.status = 'failed';
      job.error = err.message;
    }
    job.updatedAt = new Date().toISOString();
  }
}
