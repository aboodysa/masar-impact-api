import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { GraphModule } from './graph/graph.module';
import { ImpactModule } from './impact/impact.module';
import { JobsModule } from './jobs/jobs.module';
import { ServicesModule } from './services/services.module';
import { MermaidModule } from './mermaid/mermaid.module';
import { ExternalSystemsModule } from './external-systems/external-systems.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { AuthGuard } from './common/guards/auth.guard';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

@Module({
  imports: [GraphModule, ImpactModule, JobsModule, ServicesModule, MermaidModule, ExternalSystemsModule, IntegrationsModule],
  controllers: [AppController],
  providers: [
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class AppModule {}
