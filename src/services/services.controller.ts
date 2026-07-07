import { Controller, Get, Param, Header } from '@nestjs/common';
import { GraphRepository } from '../graph/graph.repository';

@Controller('api/v1/services')
export class ServicesController {
  constructor(private readonly graph: GraphRepository) {}

  private readonly maturityScores: Record<string, number> = { L4: 4, L3: 3, L2: 2, L1: 1 };
  private readonly irScores: Record<string, number> = { 'IR-4': 4, 'IR-3': 3, 'IR-2': 2, 'IR-1': 1 };

  @Get('maturity-index')
  maturityIndex() {
    const services = this.graph.getNodesByType('Service');
    const entries = services.map(s => {
      const ml = (s as any).maturity_level || 'L1';
      const ir = (s as any).impact_readiness || 'IR-1';
      const mScore = this.maturityScores[ml] || 1;
      const irScore = this.irScores[ir] || 1;
      const composite = +((mScore + irScore) / 2).toFixed(2);
      return {
        id: s.id,
        name_ar: (s as any).canonical_name_ar,
        name_en: (s as any).canonical_name_en,
        domain: (s as any).service_domain,
        maturity: ml,
        impact_readiness: ir,
        maturity_score: mScore,
        readiness_score: irScore,
        maturity_index: composite,
        tier: composite >= 4 ? 'متقدم' : composite >= 3 ? 'متوسط' : 'أساسي',
      };
    }).sort((a, b) => b.maturity_index - a.maturity_index);

    const byDomain: Record<string, { count: number; avgIndex: number; services: string[] }> = {};
    for (const e of entries) {
      const d = e.domain || 'Uncategorized';
      if (!byDomain[d]) byDomain[d] = { count: 0, avgIndex: 0, services: [] };
      byDomain[d].count++;
      byDomain[d].avgIndex += e.maturity_index;
      byDomain[d].services.push(e.id);
    }
    for (const d of Object.keys(byDomain)) {
      byDomain[d].avgIndex = +((byDomain[d].avgIndex / byDomain[d].count)).toFixed(2);
    }

    const overall = +(entries.reduce((s, e) => s + e.maturity_index, 0) / entries.length).toFixed(2);

    return {
      overall_index: overall,
      tier: overall >= 4 ? 'متقدم' : overall >= 3 ? 'متوسط' : 'أساسي',
      total_services: entries.length,
      distribution: {
        L4: entries.filter(e => e.maturity === 'L4').length,
        L3: entries.filter(e => e.maturity === 'L3').length,
        L2: entries.filter(e => e.maturity === 'L2').length,
      },
      readiness: {
        'IR-4': entries.filter(e => e.impact_readiness === 'IR-4').length,
        'IR-3': entries.filter(e => e.impact_readiness === 'IR-3').length,
        'IR-2': entries.filter(e => e.impact_readiness === 'IR-2').length,
      },
      by_domain: byDomain,
      entries,
    };
  }

  @Get('maturity-index/mermaid')
  @Header('Content-Type', 'text/plain; charset=utf-8')
  maturityIndexMermaid() {
    const index = this.maturityIndex() as any;
    const lines: string[] = [];
    lines.push('flowchart TB');
    lines.push(`  title["مؤشر النضج: ${index.overall_index}/4 - ${index.tier}"]`);
    lines.push('  style title fill:#1e293b,color:#fff,font-size:16px');
    lines.push('');

    lines.push('  subgraph التوزيع["توزيع مستويات النضج"]');
    lines.push(`    l4["L4: ${index.distribution.L4} خدمات"]`);
    lines.push(`    l3["L3: ${index.distribution.L3} خدمات"]`);
    lines.push(`    l2["L2: ${index.distribution.L2} خدمات"]`);
    lines.push('  end');
    lines.push('');

    lines.push('  subgraph قطاعات["حسب المجال"]');
    for (const [domain, info] of Object.entries(index.by_domain)) {
      const dId = 'domain_' + domain.replace(/[^a-zA-Z0-9]/g, '_');
      const avg = (info as any).avgIndex;
      const color = avg >= 3.5 ? '#4f46e5' : avg >= 2.5 ? '#d97706' : '#dc2626';
      lines.push(`    ${dId}["${domain}: ${avg}/4 (${(info as any).count} خدمات)"]`);
      lines.push(`    style ${dId} fill:${color},color:#fff`);
    }
    lines.push('  end');

    return `\`\`\`mermaid\n${lines.join('\n')}\n\`\`\``;
  }

  @Get()
  list() {
    const services = this.graph.getNodesByType('Service');
    return {
      count: services.length,
      services: services.map(s => ({
        id: s.id,
        name_ar: (s as any).canonical_name_ar,
        name_en: (s as any).canonical_name_en,
        domain: (s as any).service_domain,
        maturity: (s as any).maturity_level,
        impact_readiness: (s as any).impact_readiness,
      })),
    };
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    const service = this.graph.getNode(id);
    if (!service || service.type !== 'Service') {
      return { error: 'Service not found' };
    }

    const screens = this.graph.getServiceScreens(service.id);
    const roles = this.graph.getServiceRoles(service.id);
    const integrations = this.graph.getServiceIntegrations(service.id);
    const deps = this.graph.getServiceDependencies(service.id);
    const documents = this.graph.getIncoming(service.id, 'DOCUMENTS')
      .map(e => this.graph.getNode(e.source_id))
      .filter((n): n is NonNullable<typeof n> => n !== undefined);

    return {
      service,
      screens: screens.map(s => ({ id: s.id, name: (s as any).name_ar, type: (s as any).screen_type })),
      roles: roles.map(r => ({ id: r.id, name: (r as any).name_ar, scope: (r as any).access_scope || (r as any).organization_scope })),
      integrations: integrations.map(i => ({
        name: (i.integration as any).name,
        direction: (i.integration as any).direction,
        systems: i.externalSystems.map(e => (e as any).canonical_name_ar),
      })),
      dependencies: {
        dependsOn: deps.dependsOn.map(d => ({ id: d.id, name: (d as any).canonical_name_ar })),
        dependedBy: deps.dependedBy.map(d => ({ id: d.id, name: (d as any).canonical_name_ar })),
      },
      documents: documents.map(d => ({
        id: d.id,
        name: (d as any).canonical_name_ar || (d as any).canonical_name_en,
        version: (d as any).version,
      })),
    };
  }

  @Get(':id/dependencies')
  getDependencies(@Param('id') id: string) {
    const service = this.graph.getNode(id);
    if (!service || service.type !== 'Service') {
      return { error: 'Service not found' };
    }
    const deps = this.graph.getServiceDependencies(service.id);
    return {
      service: { id: service.id, name: (service as any).canonical_name_ar },
      dependsOn: deps.dependsOn.map(d => ({
        id: d.id,
        name: (d as any).canonical_name_ar,
        type: d.type,
      })),
      dependedBy: deps.dependedBy.map(d => ({
        id: d.id,
        name: (d as any).canonical_name_ar,
        type: d.type,
      })),
    };
  }

  @Get(':id/impact-path')
  getImpactPath(@Param('id') id: string) {
    const service = this.graph.getNode(id);
    if (!service || service.type !== 'Service') {
      return { error: 'Service not found' };
    }

    const screens = this.graph.getServiceScreens(service.id);
    const path: any[] = [];

    for (const screen of screens) {
      const fields = this.graph.getScreenFields(screen.id);
      const actions = this.graph.getScreenActions(screen.id);
      path.push({
        screen: { id: screen.id, name: (screen as any).name_ar },
        fields: fields.map(f => ({
          id: f.id, name: (f as any).name_ar, mode: (f as any).field_mode,
        })),
        actions: actions.map(a => ({
          id: a.id, name: (a as any).name_ar || (a as any).description,
        })),
      });
    }

    const integrations = this.graph.getServiceIntegrations(service.id);
    const integPath = integrations.map(i => ({
      integration: { id: i.integration.id, name: (i.integration as any).name },
      externalSystems: i.externalSystems.map(e => ({ id: e.id, name: (e as any).canonical_name_ar })),
    }));

    return {
      service: { id: service.id, name: (service as any).canonical_name_ar },
      path: { screens: path, integrations: integPath },
    };
  }
}
