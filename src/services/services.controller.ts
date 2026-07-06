import { Controller, Get, Param } from '@nestjs/common';
import { GraphRepository } from '../graph/graph.repository';

@Controller('api/v1/services')
export class ServicesController {
  constructor(private readonly graph: GraphRepository) {}

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
