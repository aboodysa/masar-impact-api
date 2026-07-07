import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { GraphRepository } from './graph.repository';
import { GraphStatsDto, GraphNodeRef, GraphEdgeDto, NodeTypeCount, GraphNodesResponse } from './graph.dto';

@ApiTags('Graph')
@ApiBearerAuth()
@Controller('api/v1/graph')
export class GraphController {
  constructor(private readonly graph: GraphRepository) {}

  @Get('stats')
  @ApiOperation({ summary: 'Graph statistics — counts per node type' })
  @ApiResponse({ status: 200, type: GraphStatsDto })
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
  @ApiOperation({ summary: 'List graph nodes, optionally filtered by type' })
  @ApiQuery({ name: 'type', required: false, example: 'Screen', description: 'Filter by node type' })
  @ApiResponse({ status: 200, type: GraphNodesResponse })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
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
  @ApiOperation({ summary: 'Get a single graph node by ID' })
  @ApiResponse({ status: 200, description: 'Node found' })
  @ApiResponse({ status: 404, description: 'Node not found' })
  getNode(@Param('id') id: string) {
    const node = this.graph.getNode(id);
    if (!node) return { error: 'Node not found' };
    return { node };
  }

  @Get('edges')
  @ApiOperation({ summary: 'List graph edges, optionally filtered by type' })
  @ApiQuery({ name: 'type', required: false, example: 'DEPENDS_ON', description: 'Filter by edge type' })
  @ApiResponse({ status: 200, type: [GraphEdgeDto] })
  listEdges(@Query('type') type?: string) {
    const allEdges = this.graph.getAllEdges();
    const edges = type ? allEdges.filter(e => e.type === type) : allEdges;
    return { count: edges.length, type: type || null, edges };
  }

  @Get('edges/:id')
  @ApiOperation({ summary: 'Get a single edge by ID' })
  @ApiResponse({ status: 200, description: 'Edge found' })
  @ApiResponse({ status: 404, description: 'Edge not found' })
  getEdge(@Param('id') id: string) {
    const edge = this.graph.getEdge(id);
    if (!edge) return { error: 'Edge not found' };
    return { edge };
  }

  @Get('types')
  @ApiOperation({ summary: 'List all node types with counts' })
  @ApiResponse({ status: 200, type: [NodeTypeCount] })
  nodeTypes() {
    const nodes = this.graph.getAllNodes();
    const types = [...new Set(nodes.map(n => n.type))].sort();
    return { node_types: types.map(t => ({ type: t, count: nodes.filter(n => n.type === t).length })) };
  }
}
