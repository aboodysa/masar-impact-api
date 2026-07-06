import { Controller, Get, Post, Param, Query, Body, Header } from '@nestjs/common';
import { MermaidService } from './mermaid.service';
import { ImpactService } from '../impact/impact.service';
import { GraphRepository } from '../graph/graph.repository';

@Controller('api/v1/mermaid')
export class MermaidController {
  constructor(
    private readonly mermaid: MermaidService,
    private readonly impact: ImpactService,
    private readonly graph: GraphRepository,
  ) {}

  @Get('service/:id')
  @Header('Content-Type', 'text/plain; charset=utf-8')
  serviceArchitecture(@Param('id') id: string) {
    const result = this.mermaid.serviceArchitecture(id);
    if (!result) return { error: 'Service not found' };
    return result;
  }

  @Get('dependencies/:id')
  @Header('Content-Type', 'text/plain; charset=utf-8')
  dependencies(@Param('id') id: string) {
    const result = this.mermaid.dependencies(id);
    if (!result) return { error: 'Service not found' };
    return result;
  }

  @Get('search')
  @Header('Content-Type', 'text/plain; charset=utf-8')
  search(@Query('q') q: string) {
    if (!q || q.length < 2) return { error: 'q (query) must be at least 2 characters' };
    const result = this.mermaid.searchGraph(q);
    if (!result) return { error: 'No results found' };
    return result;
  }

  @Post('analyze')
  @Header('Content-Type', 'text/plain; charset=utf-8')
  analyze(@Body() body: any) {
    const changeRequest = body?.changeRequest;
    if (!changeRequest?.title) return { error: 'changeRequest.title is required' };

    const analysis = this.impact.analyze(changeRequest);
    const lines: string[] = [];
    lines.push('flowchart TB');
    lines.push(`  title["تحليل تأثير: ${changeRequest.title}"]`);
    lines.push('  style title fill:#1e293b,color:#fff,font-size:16px');
    lines.push('');

    for (const imp of analysis.impacts) {
      const impId = 'imp_' + imp.id.replace(/[^a-zA-Z0-9]/g, '_');
      lines.push(`  ${impId}["${imp.name} | ${imp.impactLevel}"]`);
      lines.push(`  style ${impId} fill:${imp.impactLevel === 'high' ? '#dc2626' : '#d97706'},color:#fff`);
      lines.push('');

      if (imp.details) {
        for (const det of imp.details) {
          const detId = impId + '_' + (det.id || Math.random().toString(36).substring(2, 6));
          lines.push(`  ${detId}["${det.name || det.type}"]`);
          lines.push(`  ${impId} --> ${detId}`);
          lines.push(`  style ${detId} fill:#f3f4f6,stroke:#6b7280`);

          if (det.fields) {
            for (const f of det.fields) {
              const fId = detId + '_' + f.id.replace(/[^a-zA-Z0-9]/g, '_');
              lines.push(`  ${fId}["${f.name}"]`);
              lines.push(`  ${detId} --> ${fId}`);
              lines.push(`  style ${fId} fill:#e0e7ff,stroke:#6366f1`);
            }
          }
        }
      }
    }

    lines.push('');
    lines.push('  subgraph risks["المخاطر"]');
    for (let i = 0; i < analysis.risks.length; i++) {
      const r = analysis.risks[i];
      const rId = 'risk_' + i;
      lines.push(`    ${rId}["${r.description.substring(0, 40)}..."]`);
      lines.push(`    style ${rId} fill:#fef2f2,stroke:#dc2626`);
    }
    lines.push('  end');

    return `\`\`\`mermaid\n${lines.join('\n')}\n\`\`\``;
  }

  @Get('explore')
  @Header('Content-Type', 'text/plain; charset=utf-8')
  explore() {
    const services = this.graph.getNodesByType('Service');
    const lines: string[] = [];
    lines.push('flowchart TB');
    lines.push('  title["MASAR - جميع الخدمات"]');
    lines.push('  style title fill:#1e293b,color:#fff,font-size:18px');
    lines.push('');

    for (const svc of services) {
      const svcId = this.safeId(svc.id);
      const maturity = (svc as any).maturity_level || 'N/A';
      const readiness = (svc as any).impact_readiness || 'N/A';
      lines.push(`  ${svcId}["${this.label(svc, 25)} | ${maturity} | ${readiness}"]`);
      lines.push(`  style ${svcId} fill:#4f46e5,color:#fff,stroke:#3730a3`);

      const screens = this.graph.getServiceScreens(svc.id);
      for (const scr of screens) {
        const scrId = this.safeId(scr.id);
        lines.push(`  ${scrId}["${this.label(scr, 20)}"]`);
        lines.push(`  ${svcId} --> ${scrId}`);
        lines.push(`  style ${scrId} fill:#e0e7ff,stroke:#6366f1`);
      }

      const deps = this.graph.getServiceDependencies(svc.id);
      for (const d of deps.dependsOn) {
        const dId = this.safeId(d.id);
        lines.push(`  ${svcId} -.->|dep| ${dId}`);
      }
      for (const d of deps.dependedBy) {
        const dId = this.safeId(d.id);
        lines.push(`  ${dId} -.->|dep| ${svcId}`);
      }
    }

    return `\`\`\`mermaid\n${lines.join('\n')}\n\`\`\``;
  }

  private safeId(id: string): string {
    return 'n' + id.replace(/[^a-zA-Z0-9]/g, '_');
  }

  private label(node: any, maxLen: number): string {
    const name = String(
      node.canonical_name_ar || node.name_ar || node.canonical_name_en || node.name_en || node.name || node.id
    );
    return name.length > maxLen ? name.substring(0, maxLen) + '...' : name;
  }
}
