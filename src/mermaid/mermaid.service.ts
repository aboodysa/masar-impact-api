import { Injectable } from '@nestjs/common';
import { GraphRepository } from '../graph/graph.repository';
import { GraphNode } from '../graph/graph.types';

@Injectable()
export class MermaidService {
  constructor(private readonly graph: GraphRepository) {}

  serviceArchitecture(svcId: string): string | null {
    const svc = this.graph.getNode(svcId);
    if (!svc) return null;

    const lines: string[] = [];
    lines.push('flowchart TB');
    lines.push(`  svc["${this.label(svc, 30)}"]`);
    lines.push(`  svc -->|"مجال: ${(svc as any).service_domain || '-'}"| domain["${(svc as any).service_domain || '-'}"]`);
    lines.push(`  style svc fill:#4f46e5,color:#fff,stroke:#3730a3`);

    const screens = this.graph.getServiceScreens(svcId);
    for (const scr of screens) {
      const scrId = this.safeId(scr.id);
      lines.push(`  ${scrId}["${this.label(scr, 25)}"]`);
      lines.push(`  svc -->|شاشة| ${scrId}`);
      lines.push(`  style ${scrId} fill:#e0e7ff,stroke:#6366f1`);

      const fields = this.graph.getScreenFields(scr.id);
      for (const f of fields) {
        const fId = this.safeId(f.id);
        const mode = (f as any).field_mode || 'default';
        lines.push(`  ${fId}["${this.label(f, 20)} (${mode})"]`);
        lines.push(`  ${scrId} --> ${fId}`);
        lines.push(`  style ${fId} fill:#dbeafe,stroke:#3b82f6`);
      }
    }

    const roles = this.graph.getServiceRoles(svcId);
    for (const r of roles) {
      const rId = this.safeId(r.id);
      const scope = (r as any).access_scope || (r as any).organization_scope || '';
      lines.push(`  ${rId}["${this.label(r, 20)}"]`);
      lines.push(`  ${rId} -->|${scope}| svc`);
      lines.push(`  style ${rId} fill:#f3e8ff,stroke:#9333ea`);
    }

    const integs = this.graph.getServiceIntegrations(svcId);
    for (const i of integs) {
      const iId = this.safeId(i.integration.id);
      lines.push(`  ${iId}["${(i.integration as any).name || this.label(i.integration, 20)}"]`);
      lines.push(`  svc -.->|${(i.integration as any).direction || 'تكامل'}| ${iId}`);
      lines.push(`  style ${iId} fill:#fef3c7,stroke:#d97706`);
      for (const sys of i.externalSystems) {
        const sId = this.safeId(sys.id);
        lines.push(`  ${sId}["${this.label(sys, 20)}"]`);
        lines.push(`  ${iId} --> ${sId}`);
        lines.push(`  style ${sId} fill:#fce7f3,stroke:#ec4899`);
      }
    }

    return `\`\`\`mermaid\n${lines.join('\n')}\n\`\`\``;
  }

  dependencies(svcId: string): string | null {
    const svc = this.graph.getNode(svcId);
    if (!svc) return null;

    const lines: string[] = [];
    lines.push('flowchart LR');
    lines.push(`  svc["${this.label(svc, 30)}"]`);
    lines.push(`  style svc fill:#4f46e5,color:#fff,stroke:#3730a3`);

    const deps = this.graph.getServiceDependencies(svcId);

    for (const d of deps.dependsOn) {
      const dId = this.safeId(d.id);
      lines.push(`  ${dId}["${this.label(d, 25)}"]`);
      lines.push(`  svc -->|يعتمد على| ${dId}`);
      lines.push(`  style ${dId} fill:#fecaca,stroke:#dc2626`);
    }

    for (const d of deps.dependedBy) {
      const dId = this.safeId(d.id);
      lines.push(`  ${dId}["${this.label(d, 25)}"]`);
      lines.push(`  ${dId} -->|يعتمد علي| svc`);
      lines.push(`  style ${dId} fill:#bbf7d0,stroke:#16a34a`);
    }

    if (!deps.dependsOn.length && !deps.dependedBy.length) {
      lines.push(`  noDeps["لا توجد تبعيات"]`);
      lines.push(`  style noDeps fill:#f3f4f6,stroke:#9ca3af`);
    }

    return `\`\`\`mermaid\n${lines.join('\n')}\n\`\`\``;
  }

  searchGraph(query: string): string | null {
    const results = this.graph.search(query);
    if (!results.length) return null;

    const lines: string[] = [];
    lines.push('flowchart TB');
    lines.push(`  subgraph نتائج["نتائج البحث: ${query}"]`);
    lines.push(`  direction TB`);

    const typeColors: Record<string, string> = {
      Service: '#4f46e5',
      Screen: '#6366f1',
      Field: '#3b82f6',
      Role: '#9333ea',
      Integration: '#d97706',
      System: '#ec4899',
      Document: '#059669',
    };

    for (const r of results) {
      const rId = this.safeId(r.id);
      const color = typeColors[r.type] || '#6b7280';
      lines.push(`  ${rId}["${r.label} (${r.type})"]`);
      lines.push(`  style ${rId} fill:${color},color:#fff`);
    }
    lines.push('  end');

    return `\`\`\`mermaid\n${lines.join('\n')}\n\`\`\``;
  }

  private safeId(id: string): string {
    return 'n' + id.replace(/[^a-zA-Z0-9]/g, '_');
  }

  private label(node: GraphNode, maxLen: number): string {
    const name = String(
      (node as any).canonical_name_ar ||
      (node as any).name_ar ||
      (node as any).canonical_name_en ||
      (node as any).name_en ||
      (node as any).name ||
      node.id
    );
    return name.length > maxLen ? name.substring(0, maxLen) + '...' : name;
  }
}
