import { Controller, Get, Param, Query, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { GraphRepository } from './graph.repository';
import { paginate } from '../common/dto/api-response.dto';
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
  @ApiQuery({ name: 'page', required: false, example: 1, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, example: 20, description: 'Items per page (max 100)' })
  @ApiResponse({ status: 200, type: GraphNodesResponse })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  listNodes(
    @Query('type') type?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit = 50,
  ) {
    const nodes = type
      ? this.graph.getNodesByType(type)
      : this.graph.getAllNodes();
    const mapped = nodes.map(n => ({
      id: n.id,
      type: n.type,
      label: (n as any).canonical_name_ar || (n as any).name_ar || (n as any).name_en || (n as any).canonical_name_en || n.id,
    }));
    const { data, meta } = paginate(mapped, page, limit);
    return { ...meta, type: type || null, nodes: data };
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
  @ApiQuery({ name: 'page', required: false, example: 1, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, example: 20, description: 'Items per page (max 100)' })
  @ApiResponse({ status: 200 })
  listEdges(
    @Query('type') type?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit = 50,
  ) {
    const allEdges = this.graph.getAllEdges();
    const edges = type ? allEdges.filter(e => e.type === type) : allEdges;
    const { data, meta } = paginate(edges, page, limit);
    return { ...meta, type: type || null, edges: data };
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

  @Get('evidence')
  @ApiOperation({ summary: 'List all evidence spans' })
  @ApiQuery({ name: 'node_id', required: false, description: 'Filter by node ID (returns evidence for edges connected to this node)' })
  @ApiResponse({ status: 200 })
  listEvidence(@Query('node_id') nodeId?: string) {
    if (nodeId) {
      const edges = this.graph.getAllEdges().filter(e =>
        e.source_id === nodeId || e.target_id === nodeId
      );
      const ids = new Set<string>();
      for (const e of edges) {
        if ((e as any).evidence_ids) {
          for (const evId of (e as any).evidence_ids) ids.add(evId);
        }
      }
      const evidence = [...ids].map(id => this.graph.getEvidence(id)).filter(Boolean);
      return { node_id: nodeId, total: evidence.length, evidence };
    }
    return { total: 0, evidence: [] };
  }

  @Get('evidence/:id')
  @ApiOperation({ summary: 'Get a single evidence span by ID' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'Not found' })
  getEvidence(@Param('id') id: string) {
    const ev = this.graph.getEvidence(id);
    if (!ev) return { error: 'Evidence not found' };
    return ev;
  }
}
