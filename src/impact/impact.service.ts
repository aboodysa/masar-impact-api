import { Injectable, Logger } from '@nestjs/common';
import { GraphRepository } from '../graph/graph.repository';
import { ChangeRequestInput } from '../graph/graph.types';

@Injectable()
export class ImpactService {
  private readonly logger = new Logger(ImpactService.name);
  constructor(private readonly graph: GraphRepository) {}

  analyze(changeRequest: ChangeRequestInput) {
    const { title, description, targetService } = changeRequest;
    const findings: { type: string; message: string }[] = [];
    const risks: { type: string; severity: string; description: string; recommendation: string }[] = [];
    const recommendedActions: string[] = [];
    const impacts: any[] = [];

    const matchedServices = this.graph.findService(targetService || title);
    for (const svc of matchedServices) {
      const svcImpact: any = {
        type: 'service',
        id: svc.id,
        name: (svc as any).canonical_name_ar || (svc as any).canonical_name_en,
        impactLevel: 'high',
        reason: `الخدمة "${(svc as any).canonical_name_ar}" تتأثر بالتغيير المطلوب`,
        details: [],
      };

      const screens = this.graph.getServiceScreens(svc.id);
      for (const screen of screens) {
        const screenImpact: any = {
          type: 'screen',
          id: screen.id,
          name: (screen as any).name_ar,
          impactLevel: 'medium',
          reason: `شاشة "${(screen as any).name_ar}" ضمن الخدمة`,
          fields: [],
        };
        const fields = this.graph.getScreenFields(screen.id);
        for (const field of fields) {
          screenImpact.fields.push({
            id: field.id,
            name: (field as any).name_ar,
            mode: (field as any).field_mode,
          });
        }
        svcImpact.details.push(screenImpact);
      }

      const integs = this.graph.getServiceIntegrations(svc.id);
      for (const integ of integs) {
        svcImpact.details.push({
          type: 'integration',
          id: integ.integration.id,
          name: (integ.integration as any).name,
          impactLevel: 'medium',
          reason: `نقطة تكامل مع ${integ.externalSystems.map(s => (s as any).canonical_name_ar).join(', ')}`,
          systems: integ.externalSystems.map(s => (s as any).canonical_name_ar),
        });
      }

      const roles = this.graph.getServiceRoles(svc.id);
      if (roles.length) {
        svcImpact.details.push({
          type: 'roles',
          roles: roles.map(r => ({
            id: r.id,
            name: (r as any).name_ar,
            scope: (r as any).access_scope || (r as any).organization_scope,
          })),
        });
      }

      const deps = this.graph.getServiceDependencies(svc.id);
      if (deps.dependsOn.length) {
        risks.push({
          type: 'dependency',
          severity: 'high',
          description: `الخدمة تعتمد على: ${deps.dependsOn.map(d => (d as any).canonical_name_ar).join(', ')}`,
          recommendation: 'تأكد من عدم تأثير التغيير على الخدمات المعتمد عليها',
        });
      }

      impacts.push(svcImpact);
    }

    if (!matchedServices.length) {
      findings.push({
        type: 'warning',
        message: `لم يتم العثور على خدمة تطابق "${targetService}"`,
      });
    }

    recommendedActions.push('تحديث وثيقة المتطلب التفصيلي', 'تحديث معايير القبول', 'إضافة حالات اختبار للتغيير المطلوب');
    if (impacts.some(i => (i.details as any[])?.some((d: any) => d.type === 'integration'))) {
      recommendedActions.push('مراجعة نقاط التكامل المتأثرة');
    }

    return {
      summary: {
        totalServices: matchedServices.length,
        highImpact: impacts.filter(i => i.impactLevel === 'high').length,
        mediumImpact: impacts.filter(i => (i.details as any[])?.some((d: any) => d.impactLevel === 'medium')).length,
        risks: risks.length,
      },
      impacts,
      risks,
      recommendedActions: [...new Set(recommendedActions)],
      findings,
    };
  }
}
