import { Controller, Get, Param, Query, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { GraphRepository } from '../graph/graph.repository';
import { paginate } from '../common/dto/api-response.dto';
import { ExternalSystemListResponse, ExternalSystemDetailResponse } from './external-systems.dto';

@ApiTags('External Systems')
@ApiBearerAuth()
@Controller('api/v1/external-systems')
export class ExternalSystemsController {
  constructor(private readonly graph: GraphRepository) {}

  @Get()
  @ApiOperation({ summary: 'List all external systems with integration counts' })
  @ApiQuery({ name: 'page', required: false, example: 1, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, example: 20, description: 'Items per page (max 100)' })
  @ApiResponse({ status: 200, type: ExternalSystemListResponse })
  list(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit = 50,
  ) {
    const systems = this.graph.getNodesByType('ExternalSystem');
    const mapped = systems.map(s => {
      const incoming = this.graph.getIncoming(s.id, 'CONNECTS_TO_SYSTEM');
      const serviceIds = incoming
        .map(e => {
          const intNode = this.graph.getNode(e.source_id);
          if (!intNode) return null;
          const svcEdges = this.graph.getIncoming(intNode.id, 'INTEGRATES_WITH');
          return svcEdges.map(se => se.source_id);
        })
        .flat()
        .filter((id): id is string => !!id);
      return {
        id: s.id,
        name_ar: (s as any).canonical_name_ar,
        name_en: (s as any).canonical_name_en,
        connected_services: [...new Set(serviceIds)],
        integration_count: incoming.length,
      };
    });
    const { data, meta } = paginate(mapped, page, limit);
    return { ...meta, external_systems: data };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get external system detail with connected services and integrations' })
  @ApiParam({ name: 'id', example: 'ext:nic', description: 'External system ID (with or without ext: prefix)' })
  @ApiResponse({ status: 200, type: ExternalSystemDetailResponse })
  @ApiResponse({ status: 404, description: 'External system not found' })
  getById(@Param('id') id: string) {
    const extId = id.startsWith('ext:') ? id : `ext:${id}`;
    const system = this.graph.getNode(extId);
    if (!system || system.type !== 'ExternalSystem') {
      return { error: 'External system not found' };
    }
    const incoming = this.graph.getIncoming(extId, 'CONNECTS_TO_SYSTEM');
    const integrations = incoming
      .map(e => {
        const intPoint = this.graph.getNode(e.source_id);
        if (!intPoint) return null;
        const svcEdges = this.graph.getIncoming(intPoint.id, 'INTEGRATES_WITH');
        const services = svcEdges
          .map(se => this.graph.getNode(se.source_id))
          .filter((n): n is NonNullable<typeof n> => !!n);
        return {
          integration_point: { id: intPoint.id, name: (intPoint as any).name },
          services: services.map(s => ({
            id: s.id,
            name: (s as any).canonical_name_ar,
          })),
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
    return { external_system: system, integrations };
  }
}
