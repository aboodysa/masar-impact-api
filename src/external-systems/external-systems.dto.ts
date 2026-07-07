import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ExternalSystemListItem {
  @ApiProperty({ example: 'ext:nic' }) id: string;
  @ApiProperty({ example: 'مركز المعلومات الوطني' }) name_ar: string;
  @ApiPropertyOptional() name_en?: string;
  @ApiProperty({ example: ['svc:wafed', 'svc:bayan'] }) connected_services: string[];
  @ApiProperty({ example: 15 }) integration_count: number;
}

export class ExternalSystemListResponse {
  @ApiProperty({ example: 1 }) page: number;
  @ApiProperty({ example: 50 }) limit: number;
  @ApiProperty({ example: 25 }) total: number;
  @ApiProperty({ example: 1 }) totalPages: number;
  @ApiProperty({ type: [ExternalSystemListItem] }) external_systems: ExternalSystemListItem[];
}

export class IntegrationServiceRef {
  @ApiProperty() id: string;
  @ApiProperty({ example: 'وافد' }) name: string;
}

export class IntegrationPointRef {
  @ApiProperty() id: string;
  @ApiProperty({ example: 'تكامل مع مركز المعلومات الوطني' }) name: string;
}

export class IntegrationDetail {
  @ApiProperty() integration_point: IntegrationPointRef;
  @ApiProperty({ type: [IntegrationServiceRef] }) services: IntegrationServiceRef[];
}

export class ExternalSystemDetailResponse {
  @ApiProperty() external_system: Record<string, unknown>;
  @ApiProperty({ type: [IntegrationDetail] }) integrations: IntegrationDetail[];
}
