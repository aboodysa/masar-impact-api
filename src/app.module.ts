import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { AppController } from './app.controller';
import { GraphModule } from './graph/graph.module';
import { ImpactModule } from './impact/impact.module';
import { JobsModule } from './jobs/jobs.module';
import { ServicesModule } from './services/services.module';
import { MermaidModule } from './mermaid/mermaid.module';
import { ExternalSystemsModule } from './external-systems/external-systems.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

@Module({
  imports: [GraphModule, ImpactModule, JobsModule, ServicesModule, MermaidModule, ExternalSystemsModule],
  controllers: [AppController],
  providers: [
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
export class AppModule {}
