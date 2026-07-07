import { Controller, Get, Param, Query, DefaultValuePipe, ParseIntPipe, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { GraphRepository } from '../graph/graph.repository';
import { paginate } from '../common/dto/api-response.dto';
import { IntegrationListResponse, IntegrationDetailResponse } from './integrations.dto';

@ApiTags('Integrations')
@ApiBearerAuth()
@Controller('api/v1/integrations')
export class IntegrationsController {
  constructor(private readonly graph: GraphRepository) {}

  @Get()
  @ApiOperation({ summary: 'List all integration points with their external system and service' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiResponse({ status: 200, type: IntegrationListResponse })
  list(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit = 50,
  ) {
    const points = this.graph.getNodesByType('IntegrationPoint');
    const mapped = points.map(p => {
      const sysEdges = this.graph.getOutgoing(p.id, 'CONNECTS_TO_SYSTEM');
      const svcEdges = this.graph.getIncoming(p.id, 'INTEGRATES_WITH');
      const extSys = sysEdges
        .map(e => this.graph.getNode(e.target_id))
        .find((n): n is NonNullable<typeof n> => !!n);
      const svc = svcEdges
        .map(e => this.graph.getNode(e.source_id))
        .find((n): n is NonNullable<typeof n> => !!n);
      return {
        id: p.id,
        name: (p as any).name,
        direction: (p as any).direction,
        external_system: extSys ? { id: extSys.id, name: (extSys as any).canonical_name_ar } : null,
        service: svc ? { id: svc.id, name: (svc as any).canonical_name_ar } : null,
      };
    });
    const { data, meta } = paginate(mapped, page, limit);
    return { ...meta, integrations: data };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get integration point detail with connected external systems and services' })
  @ApiParam({ name: 'id', example: 'int:wafed:nic' })
  @ApiResponse({ status: 200, type: IntegrationDetailResponse })
  @ApiResponse({ status: 404, description: 'Integration point not found' })
  getById(@Param('id') id: string) {
    const intId = id.startsWith('int:') ? id : `int:${id}`;
    const point = this.graph.getNode(intId);
    if (!point || point.type !== 'IntegrationPoint') {
      throw new NotFoundException('Integration point not found');
    }
    const sysEdges = this.graph.getOutgoing(intId, 'CONNECTS_TO_SYSTEM');
    const svcEdges = this.graph.getIncoming(intId, 'INTEGRATES_WITH');
    return {
      integration_point: point,
      external_systems: sysEdges
        .map(e => this.graph.getNode(e.target_id))
        .filter((n): n is NonNullable<typeof n> => !!n)
        .map(n => ({ id: n.id, name: (n as any).canonical_name_ar })),
      services: svcEdges
        .map(e => this.graph.getNode(e.source_id))
        .filter((n): n is NonNullable<typeof n> => !!n)
        .map(n => ({ id: n.id, name: (n as any).canonical_name_ar })),
    };
  }
}
