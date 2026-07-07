import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GraphNodeDto {
  @ApiProperty({ example: 'svc:wafed' }) id: string;
  @ApiProperty({ example: 'Service' }) type: string;
  @ApiPropertyOptional({ example: 'تأييد التعاقد لغير السعوديين - وافد' }) canonical_name_ar?: string;
  @ApiPropertyOptional({ example: 'Contract Endorsement for Non-Saudis - WAFED' }) canonical_name_en?: string;
  @ApiPropertyOptional({ example: 'Employment' }) service_domain?: string;
  @ApiPropertyOptional({ example: 'L4' }) maturity_level?: string;
  @ApiPropertyOptional({ example: 'IR-4' }) impact_readiness?: string;
  @ApiPropertyOptional() description?: string;
  @ApiPropertyOptional() confidence?: number;
}

export class GraphNodeRef {
  @ApiProperty() id: string;
  @ApiProperty() type: string;
  @ApiProperty() label: string;
}

export class GraphEdgeDto {
  @ApiProperty({ example: 'edge:svc:wafed:has_screen:screen:wafed:contract-submit' }) id: string;
  @ApiProperty({ example: 'svc:wafed' }) source_id: string;
  @ApiProperty({ example: 'screen:wafed:contract-submit' }) target_id: string;
  @ApiProperty({ example: 'HAS_SCREEN' }) type: string;
  @ApiProperty() evidence_ids: string[];
  @ApiProperty({ example: 'high' }) impact_strength: string;
  @ApiProperty({ example: 'functional' }) impact_category: string;
  @ApiPropertyOptional() reason?: string;
  @ApiProperty({ example: 0.9 }) confidence: number;
}

export class GraphStatsDto {
  @ApiProperty({ example: 364 }) total_nodes: number;
  @ApiProperty({ example: 406 }) total_edges: number;
  @ApiProperty({ example: { Service: 25, Screen: 64 } }) by_type: Record<string, number>;
}

export class NodeTypeCount {
  @ApiProperty({ example: 'Service' }) type: string;
  @ApiProperty({ example: 25 }) count: number;
}

export class GraphNodesResponse {
  @ApiProperty({ example: 64 }) count: number;
  @ApiProperty({ example: 'Screen', nullable: true }) type: string | null;
  @ApiProperty({ type: [GraphNodeRef] }) nodes: GraphNodeRef[];
}
