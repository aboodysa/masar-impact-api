import { Module } from '@nestjs/common';
import { MermaidController } from './mermaid.controller';
import { MermaidService } from './mermaid.service';
import { ImpactModule } from '../impact/impact.module';

@Module({
  imports: [ImpactModule],
  controllers: [MermaidController],
  providers: [MermaidService],
})
export class MermaidModule {}
