import { Controller, Get, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from './common/decorators/public.decorator';
import { GraphRepository } from './graph/graph.repository';

@ApiTags('Health')
@Controller()
export class AppController {
  constructor(
    @Inject(GraphRepository) private readonly graphRepo: GraphRepository,
  ) {}

  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Health check — does not require authentication' })
  @ApiResponse({ status: 200, description: 'API is healthy' })
  health() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Public()
  @Get('health/deep')
  @ApiOperation({ summary: 'Deep health check — verifies graph data is loaded' })
  @ApiResponse({ status: 200, description: 'API is healthy and graph data is loaded' })
  @ApiResponse({ status: 503, description: 'Graph data not loaded' })
  deepHealth() {
    const nodes = this.graphRepo.getAllNodes();
    const edges = this.graphRepo.getAllEdges();
    const types = [...new Set(nodes.map(n => n.type))];

    const checks = {
      nodes_loaded: nodes.length > 0,
      edges_loaded: edges.length > 0,
      types_found: types.length,
      total_nodes: nodes.length,
      total_edges: edges.length,
    };

    const healthy = checks.nodes_loaded && checks.edges_loaded;
    return {
      status: healthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      ...checks,
    };
  }
}
