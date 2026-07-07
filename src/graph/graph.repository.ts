import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as readline from 'readline';
import { join } from 'path';
import { GraphNode, GraphEdge, EvidenceSpan } from './graph.types';

@Injectable()
export class GraphRepository implements OnModuleInit {
  private readonly logger = new Logger(GraphRepository.name);
  private nodes = new Map<string, GraphNode>();
  private edges = new Map<string, GraphEdge>();
  private evidence = new Map<string, EvidenceSpan>();
  private edgesBySource = new Map<string, GraphEdge[]>();
  private edgesByTarget = new Map<string, GraphEdge[]>();
  private nodesByType = new Map<string, GraphNode[]>();
  private graphDir: string;

  constructor() {
    this.graphDir = process.env.GRAPH_DIR || join(__dirname, '../../data/v0.2');
  }

  async onModuleInit() {
    await this.load();
  }

  private async load() {
    await Promise.all([
      this.loadFile('graph.nodes.jsonl', this.parseNode.bind(this)),
      this.loadFile('graph.edges.jsonl', this.parseEdge.bind(this)),
      this.loadFile('graph.evidence.jsonl', this.parseEvidence.bind(this)),
    ]);
    this.buildIndexes();
    this.logger.log(`Graph loaded: ${this.nodes.size} nodes, ${this.edges.size} edges, ${this.evidence.size} evidence spans`);
  }

  private async loadFile(filename: string, parseFn: (data: unknown) => void) {
    const filePath = join(this.graphDir, filename);
    if (!fs.existsSync(filePath)) {
      this.logger.warn(`File not found: ${filePath}`);
      return;
    }
    const stream = fs.createReadStream(filePath, { encoding: 'utf-8' });
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
    for await (const line of rl) {
      if (line.trim()) parseFn(JSON.parse(line));
    }
  }

  private parseNode(data: unknown) {
    const node = data as GraphNode;
    this.nodes.set(node.id, node);
    const list = this.nodesByType.get(node.type) || [];
    list.push(node);
    this.nodesByType.set(node.type, list);
  }

  private parseEdge(data: unknown) {
    const edge = data as GraphEdge;
    this.edges.set(edge.id, edge);
  }

  private parseEvidence(data: unknown) {
    const ev = data as EvidenceSpan;
    this.evidence.set(ev.id, ev);
  }

  private buildIndexes() {
    for (const edge of this.edges.values()) {
      const bySource = this.edgesBySource.get(edge.source_id) || [];
      bySource.push(edge);
      this.edgesBySource.set(edge.source_id, bySource);
      const byTarget = this.edgesByTarget.get(edge.target_id) || [];
      byTarget.push(edge);
      this.edgesByTarget.set(edge.target_id, byTarget);
    }
  }

  getNode(id: string): GraphNode | undefined {
    return this.nodes.get(id);
  }

  getAllNodes(): GraphNode[] {
    return [...this.nodes.values()];
  }

  getNodesByType(type: string): GraphNode[] {
    return this.nodesByType.get(type) || [];
  }

  getEdge(id: string): GraphEdge | undefined {
    return this.edges.get(id);
  }

  getAllEdges(): GraphEdge[] {
    return [...this.edges.values()];
  }

  getOutgoing(id: string, type?: string): GraphEdge[] {
    const edges = this.edgesBySource.get(id) || [];
    return type ? edges.filter(e => e.type === type) : edges;
  }

  getIncoming(id: string, type?: string): GraphEdge[] {
    const edges = this.edgesByTarget.get(id) || [];
    return type ? edges.filter(e => e.type === type) : edges;
  }

  getEvidence(id: string): EvidenceSpan | undefined {
    return this.evidence.get(id);
  }

  findService(query: string): GraphNode[] {
    const services = this.getNodesByType('Service');
    const q = query.toLowerCase();
    return services.filter(s => {
      const ar = (s as any).canonical_name_ar;
      const en = (s as any).canonical_name_en;
      const aliases = (s as any).aliases as string[] | undefined;
      return (ar && ar.includes(query)) ||
        (en && en.toLowerCase().includes(q)) ||
        (aliases && aliases.some(a => a.toLowerCase().includes(q)));
    });
  }

  getServiceScreens(serviceId: string): GraphNode[] {
    return this.getOutgoing(serviceId, 'HAS_SCREEN')
      .map(e => this.getNode(e.target_id))
      .filter((n): n is GraphNode => n !== undefined);
  }

  getServiceRoles(serviceId: string): GraphNode[] {
    return this.getIncoming(serviceId, 'USED_BY_ROLE')
      .map(e => this.getNode(e.source_id))
      .filter((n): n is GraphNode => n !== undefined);
  }

  getScreenFields(screenId: string): GraphNode[] {
    return this.getOutgoing(screenId, 'HAS_FIELD')
      .map(e => this.getNode(e.target_id))
      .filter((n): n is GraphNode => n !== undefined);
  }

  getScreenActions(screenId: string): GraphNode[] {
    return this.getOutgoing(screenId, 'HAS_ACTION')
      .map(e => this.getNode(e.target_id))
      .filter((n): n is GraphNode => n !== undefined);
  }

  getServiceIntegrations(serviceId: string) {
    return this.getOutgoing(serviceId, 'INTEGRATES_WITH')
      .map(e => {
        const intPoint = this.getNode(e.target_id);
        if (!intPoint) return null;
        const sysEdges = this.getOutgoing(intPoint.id, 'CONNECTS_TO_SYSTEM');
        const systems = sysEdges.map(se => this.getNode(se.target_id)).filter((n): n is GraphNode => n !== undefined);
        return { integration: intPoint, externalSystems: systems };
      })
      .filter((item): item is { integration: GraphNode; externalSystems: GraphNode[] } => item !== null);
  }

  getServiceDependencies(serviceId: string) {
    const dependsOn = this.getOutgoing(serviceId, 'DEPENDS_ON')
      .map(e => this.getNode(e.target_id))
      .filter((n): n is GraphNode => n !== undefined);
    const dependedBy = this.getIncoming(serviceId, 'DEPENDS_ON')
      .map(e => this.getNode(e.source_id))
      .filter((n): n is GraphNode => n !== undefined);
    return { dependsOn, dependedBy };
  }

  search(query: string): { id: string; type: string; label: string }[] {
    const q = query.toLowerCase();
    const results: { id: string; type: string; label: string }[] = [];
    for (const node of this.nodes.values()) {
      const searchable = [
        node.id, (node as any).name_ar, (node as any).name_en,
        (node as any).canonical_name_ar, (node as any).canonical_name_en,
        (node as any).description, (node as any).purpose, (node as any).text,
      ].filter(Boolean).map(s => String(s).toLowerCase());

      if (searchable.some(s => s.includes(q))) {
        results.push({
          id: node.id,
          type: node.type,
          label: String((node as any).name_ar || (node as any).canonical_name_ar || (node as any).name_en || (node as any).canonical_name_en || node.id),
        });
      }
    }
    return results;
  }
}
