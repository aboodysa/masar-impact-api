import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class IntegrationListItem {
  @ApiProperty({ example: 'int:wafed:nic' }) id: string;
  @ApiProperty({ example: 'تكامل مع مركز المعلومات الوطني' }) name: string;
  @ApiPropertyOptional({ example: 'bidirectional' }) direction?: string;
  @ApiPropertyOptional() external_system: { id: string; name: string };
  @ApiPropertyOptional() service: { id: string; name: string };
}

export class IntegrationListResponse {
  @ApiProperty({ example: 1 }) page: number;
  @ApiProperty({ example: 50 }) limit: number;
  @ApiProperty({ example: 87 }) total: number;
  @ApiProperty({ example: 2 }) totalPages: number;
  @ApiProperty({ type: [IntegrationListItem] }) integrations: IntegrationListItem[];
}

export class IntegrationServiceRef {
  @ApiProperty() id: string;
  @ApiProperty({ example: 'وافد' }) name: string;
}

export class IntegrationExternalSystemRef {
  @ApiProperty() id: string;
  @ApiProperty({ example: 'مركز المعلومات الوطني' }) name: string;
}

export class IntegrationDetailResponse {
  @ApiProperty() integration_point: Record<string, unknown>;
  @ApiPropertyOptional({ type: [IntegrationExternalSystemRef] })
  external_systems: IntegrationExternalSystemRef[];
  @ApiPropertyOptional({ type: [IntegrationServiceRef] })
  services: IntegrationServiceRef[];
}
