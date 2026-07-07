import { Controller, Get, Param, Query } from '@nestjs/common';
import { GraphRepository } from './graph.repository';

@Controller('api/v1/graph')
export class GraphController {
  constructor(private readonly graph: GraphRepository) {}

  @Get('stats')
  stats() {
    const nodes = this.graph.getAllNodes();
    const edges = this.graph.getAllEdges();
    const byType: Record<string, number> = {};
    for (const n of nodes) {
      byType[n.type] = (byType[n.type] || 0) + 1;
    }
    return {
      total_nodes: nodes.length,
      total_edges: edges.length,
      by_type: Object.fromEntries(
        Object.entries(byType).sort((a, b) => b[1] - a[1])
      ),
    };
  }

  @Get('nodes')
  listNodes(@Query('type') type?: string) {
    const nodes = type
      ? this.graph.getNodesByType(type)
      : this.graph.getAllNodes();
    return {
      count: nodes.length,
      type: type || null,
      nodes: nodes.map(n => ({
        id: n.id,
        type: n.type,
        label: (n as any).canonical_name_ar || (n as any).name_ar || (n as any).name_en || (n as any).canonical_name_en || n.id,
      })),
    };
  }

  @Get('nodes/:id')
  getNode(@Param('id') id: string) {
    const node = this.graph.getNode(id);
    if (!node) return { error: 'Node not found' };
    return { node };
  }

  @Get('edges')
  listEdges(@Query('type') type?: string) {
    const allEdges = this.graph.getAllEdges();
    const edges = type ? allEdges.filter(e => e.type === type) : allEdges;
    return { count: edges.length, type: type || null, edges };
  }

  @Get('edges/:id')
  getEdge(@Param('id') id: string) {
    const edge = this.graph.getEdge(id);
    if (!edge) return { error: 'Edge not found' };
    return { edge };
  }

  @Get('types')
  nodeTypes() {
    const nodes = this.graph.getAllNodes();
    const types = [...new Set(nodes.map(n => n.type))].sort();
    return { node_types: types.map(t => ({ type: t, count: nodes.filter(n => n.type === t).length })) };
  }
}
