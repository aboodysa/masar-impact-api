import { Injectable, Logger } from '@nestjs/common';
import { GraphRepository } from '../graph/graph.repository';
import { ChangeRequestInput } from '../graph/graph.types';

@Injectable()
export class ImpactService {
  private readonly logger = new Logger(ImpactService.name);
  constructor(private readonly graph: GraphRepository) {}

  private buildContext(): any {
    const services = this.graph.getNodesByType('Service').map(s => {
      const screens = this.graph.getServiceScreens(s.id).map(screen => ({
        id: screen.id,
        name: (screen as any).name_ar || (screen as any).canonical_name_ar,
        fields: this.graph.getScreenFields(screen.id).map(f => ({
          id: f.id,
          name: (f as any).name_ar,
          mode: (f as any).field_mode,
        })),
        actions: this.graph.getScreenActions(screen.id).map(a => ({
          id: a.id,
          name: (a as any).name_ar || (a as any).name_en,
        })),
      }));
      const integrations = this.graph.getServiceIntegrations(s.id).map(int => ({
        id: int.integration.id,
        name: (int.integration as any).name,
        systems: int.externalSystems.map(sys =>
          (sys as any).canonical_name_ar || (sys as any).canonical_name_en,
        ),
      }));
      const roles = this.graph.getServiceRoles(s.id).map(r => ({
        id: r.id,
        name: (r as any).name_ar,
        scope: (r as any).access_scope || (r as any).organization_scope,
      }));
      const deps = this.graph.getServiceDependencies(s.id);
      return {
        id: s.id,
        canonical_name_ar: (s as any).canonical_name_ar,
        canonical_name_en: (s as any).canonical_name_en,
        domain: (s as any).service_domain,
        maturity: (s as any).maturity_level,
        impact_readiness: (s as any).impact_readiness,
        description: (s as any).description,
        screens,
        integrations,
        roles,
        dependsOn: deps.dependsOn.map(d => (d as any).canonical_name_ar || d.id),
        dependedBy: deps.dependedBy.map(d => (d as any).canonical_name_ar || d.id),
      };
    });

    const externalSystems = this.graph.getNodesByType('ExternalSystem').map(s => ({
      id: s.id,
      name_ar: (s as any).canonical_name_ar,
      name_en: (s as any).canonical_name_en,
    }));

    return { services, externalSystems };
  }

  async analyzeWithAI(changeRequest: ChangeRequestInput): Promise<{
    summary: any; impacts: any[]; risks: any[];
    recommendedActions: string[]; findings: any[];
  }> {
    const context = this.buildContext();
    const matchedServices = this.graph.findService(
      changeRequest.targetService || changeRequest.title,
    );
    const matchedIds = new Set(matchedServices.map(s => s.id));

    const prompt = `You are a MASAR impact analysis expert. Analyze the impact of this change request.

## Change Request
Title: ${changeRequest.title}
Description: ${changeRequest.description || '(none)'}
Target Service: ${changeRequest.targetService || '(auto-detected)'}

## Full MASAR Graph Context
${JSON.stringify(context, null, 2)}

## Matched Service IDs
${JSON.stringify([...matchedIds])}

## Analysis instructions
1. Identify which services, screens, integrations, fields, and roles are affected
2. Consider cross-service cascading impact (dependencies, shared integrations, same domain)
3. Rate impact: "high" (service level change), "medium" (screen/integration changes), "low" (field changes)
4. Consider the maturity and impact_readiness of affected services
5. Identify risks (dependencies, integrations, security, data flow)
6. Provide actionable recommendations in Arabic
7. Return ONLY valid JSON (no markdown, no explanation) matching this structure:
{
  "summary": {
    "totalServices": <number>,
    "highImpact": <count>,
    "mediumImpact": <count>,
    "risks": <count>,
    "totalScreens": <count>,
    "totalIntegrations": <count>,
    "totalFields": <count>,
    "totalRoles": <count>
  },
  "impacts": [{
    "type": "service",
    "id": "<service id>",
    "name": "<arabic name>",
    "impactLevel": "high|medium|low",
    "reason": "<arabic explanation>",
    "details": [
      { "type": "screen", "id": "...", "name": "...", "impactLevel": "medium", "reason": "...", "fields": [...] },
      { "type": "integration", "id": "...", "name": "...", "impactLevel": "medium", "reason": "...", "systems": [...] },
      { "type": "roles", "roles": [{ "id": "...", "name": "...", "scope": "..." }] }
    ]
  }],
  "risks": [{ "type": "dependency|cascade|integration|security", "severity": "high|medium", "description": "<arabic>", "recommendation": "<arabic>" }],
  "recommendedActions": ["<arabic action 1>", "<arabic action 2>"],
  "findings": [{ "type": "warning|info", "message": "<arabic message>" }]
}`;

    try {
      const apiKey = process.env.OPENAI_API_KEY;
      const model = process.env.OPENAI_MODEL || 'gpt-4o';
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.1,
          max_tokens: 4096,
        }),
        signal: AbortSignal.timeout(120000),
      });
      if (!response.ok) {
        this.logger.warn(`OpenAI API error: ${response.status} ${response.statusText}`);
        return this.analyze(changeRequest);
      }
      const data: any = await response.json();
      const fullText = data.choices?.[0]?.message?.content || '';
      const jsonMatch = fullText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        if (result.summary) return result;
      }
      this.logger.warn('AI response missing valid JSON, falling back');
    } catch (err: any) {
      this.logger.warn(`AI analysis error: ${err.message}, falling back`);
    }
    return this.analyze(changeRequest);
  }

  analyze(changeRequest: ChangeRequestInput) {
    const { title, description, targetService } = changeRequest;
    const findings: { type: string; message: string }[] = [];
    const risks: { type: string; severity: string; description: string; recommendation: string }[] = [];
    const recommendedActions: string[] = [];
    const impacts: any[] = [];

    const matchedServices = this.graph.findService(targetService || title);
    let totalScreens = 0;
    let totalIntegrations = 0;
    let totalFields = 0;
    let totalRoles = 0;

    for (const svc of matchedServices) {
      const screens = this.graph.getServiceScreens(svc.id);
      const integs = this.graph.getServiceIntegrations(svc.id);
      const roles = this.graph.getServiceRoles(svc.id);
      const deps = this.graph.getServiceDependencies(svc.id);

      const svcImpact: any = {
        type: 'service',
        id: svc.id,
        name: (svc as any).canonical_name_ar || (svc as any).canonical_name_en,
        impactLevel: 'high',
        reason: `الخدمة "${(svc as any).canonical_name_ar}" تتأثر بالتغيير المطلوب`,
        details: [],
      };

      for (const screen of screens) {
        const fields = this.graph.getScreenFields(screen.id);
        totalFields += fields.length;
        const screenImpact: any = {
          type: 'screen',
          id: screen.id,
          name: (screen as any).name_ar,
          impactLevel: 'medium',
          reason: `شاشة "${(screen as any).name_ar}" ضمن الخدمة`,
          fields: fields.map(f => ({
            id: f.id,
            name: (f as any).name_ar,
            mode: (f as any).field_mode,
          })),
        };
        svcImpact.details.push(screenImpact);
      }
      totalScreens += screens.length;

      for (const integ of integs) {
        const systemNames = integ.externalSystems.map(s => (s as any).canonical_name_ar).filter(Boolean);
        svcImpact.details.push({
          type: 'integration',
          id: integ.integration.id,
          name: (integ.integration as any).name,
          impactLevel: 'medium',
          reason: `نقطة تكامل مع ${systemNames.join(', ') || 'أنظمة خارجية'}`,
          systems: systemNames,
        });
      }
      totalIntegrations += integs.length;

      if (roles.length) {
        totalRoles += roles.length;
        svcImpact.details.push({
          type: 'roles',
          roles: roles.map(r => ({
            id: r.id,
            name: (r as any).name_ar,
            scope: (r as any).access_scope || (r as any).organization_scope,
          })),
        });
      }

      if (deps.dependsOn.length) {
        risks.push({
          type: 'dependency',
          severity: 'high',
          description: `الخدمة "${(svc as any).canonical_name_ar}" تعتمد على: ${deps.dependsOn.map(d => (d as any).canonical_name_ar).join('، ')}`,
          recommendation: 'تأكد من عدم تأثير التغيير على الخدمات المعتمد عليها',
        });
      }

      if (deps.dependedBy.length) {
        risks.push({
          type: 'cascade',
          severity: 'high',
          description: `خدمات أخرى تعتمد على "${(svc as any).canonical_name_ar}": ${deps.dependedBy.map(d => (d as any).canonical_name_ar).join('، ')}`,
          recommendation: 'التنسيق مع فرق الخدمات المعتمدة لضمان التوافق',
        });
      }

      impacts.push(svcImpact);
    }

    if (!matchedServices.length) {
      findings.push({
        type: 'warning',
        message: `لم يتم العثور على خدمة تطابق "${targetService}"`,
      });
    } else {
      const domain = (matchedServices[0] as any).service_domain;
      if (domain) {
        const sameDomain = this.graph.getNodesByType('Service')
          .filter(s => (s as any).service_domain === domain && !matchedServices.find(ms => ms.id === s.id));
        if (sameDomain.length) {
          findings.push({
            type: 'info',
            message: `خدمات أخرى في نفس المجال "${domain}": ${sameDomain.map(s => (s as any).canonical_name_ar).join('، ')}`,
          });
        }
      }

      if (!totalIntegrations && !totalFields) {
        findings.push({
          type: 'warning',
          message: 'بيانات الرسوم البيانية محدودة — قد تكون هناك تأثيرات إضافية غير م capture في النموذج الحالي',
        });
      }
    }

    recommendedActions.push('تحديث وثيقة المتطلب التفصيلي', 'تحديث معايير القبول', 'إضافة حالات اختبار للتغيير المطلوب');
    if (totalIntegrations > 0) {
      recommendedActions.push('مراجعة نقاط التكامل المتأثرة');
    }
    if (totalRoles > 0) {
      recommendedActions.push('مراجعة الأدوار والصلاحيات المتأثرة');
    }
    if (risks.some(r => r.type === 'cascade')) {
      recommendedActions.push('التنسيق مع الفرق المعنية للخدمات المتأثرة بالتسلسل');
    }

    return {
      summary: {
        totalServices: matchedServices.length,
        highImpact: impacts.filter(i => i.impactLevel === 'high').length,
        mediumImpact: totalScreens + totalIntegrations,
        risks: risks.length,
        totalScreens,
        totalIntegrations,
        totalFields,
        totalRoles,
      },
      impacts,
      risks,
      recommendedActions: [...new Set(recommendedActions)],
      findings,
    };
  }
}
