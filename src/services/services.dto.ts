import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ServiceListItem {
  @ApiProperty({ example: 'svc:wafed' }) id: string;
  @ApiProperty({ example: 'تأييد التعاقد لغير السعوديين - وافد' }) name_ar: string;
  @ApiProperty({ example: 'Contract Endorsement for Non-Saudis - WAFED' }) name_en: string;
  @ApiPropertyOptional() description: string | null;
  @ApiProperty({ example: 'Employment' }) domain: string;
  @ApiProperty({ example: 'L4' }) maturity: string;
  @ApiProperty({ example: 'IR-4' }) impact_readiness: string;
}

export class ServiceListResponse {
  @ApiProperty({ example: 25 }) count: number;
  @ApiProperty({ type: [ServiceListItem] }) services: ServiceListItem[];
}

export class ScreenDto {
  @ApiProperty() id: string;
  @ApiProperty({ example: 'تقديم طلب تعاقد' }) name: string;
  @ApiProperty({ example: 'FORM' }) type: string;
}

export class RoleDto {
  @ApiProperty() id: string;
  @ApiProperty({ example: 'مختص جهة حكومية' }) name: string;
  @ApiProperty({ example: 'Government' }) scope: string;
}

export class IntegrationDto {
  @ApiProperty({ example: 'JICS Integration - WAFED' }) name: string;
  @ApiProperty({ example: 'BIDIRECTIONAL' }) direction: string;
  @ApiProperty({ example: ['النظام المركزي'] }) systems: string[];
}

export class DependencyRef {
  @ApiProperty({ example: 'svc:jics' }) id: string;
  @ApiProperty({ example: 'النظام المركزي' }) name: string;
}

export class DependenciesDto {
  @ApiProperty({ type: [DependencyRef] }) dependsOn: DependencyRef[];
  @ApiProperty({ type: [DependencyRef] }) dependedBy: DependencyRef[];
}

export class DocumentRef {
  @ApiProperty() id: string;
  @ApiProperty({ example: 'وثيقة معمارية الحل - وافد' }) name: string;
  @ApiProperty({ example: '1.0' }) version: string;
}

export class ServiceDetailResponse {
  @ApiProperty() service: Record<string, unknown>;
  @ApiProperty({ type: [ScreenDto] }) screens: ScreenDto[];
  @ApiProperty({ type: [RoleDto] }) roles: RoleDto[];
  @ApiProperty({ type: [IntegrationDto] }) integrations: IntegrationDto[];
  @ApiProperty() dependencies: DependenciesDto;
  @ApiProperty({ type: [DocumentRef] }) documents: DocumentRef[];
}

export class MaturityEntry {
  @ApiProperty() id: string;
  @ApiProperty() name_ar: string;
  @ApiProperty() name_en: string;
  @ApiProperty() domain: string;
  @ApiProperty({ example: 'L4' }) maturity: string;
  @ApiProperty({ example: 'IR-4' }) impact_readiness: string;
  @ApiProperty({ example: 4 }) maturity_score: number;
  @ApiProperty({ example: 4 }) readiness_score: number;
  @ApiProperty({ example: 4 }) maturity_index: number;
  @ApiProperty({ example: 'متقدم' }) tier: string;
}

export class MaturityByDomain {
  @ApiProperty({ example: 5 }) count: number;
  @ApiProperty({ example: 3.5 }) avgIndex: number;
  @ApiProperty({ type: [String] }) services: string[];
}

export class MaturityIndexResponse {
  @ApiProperty({ example: 3.04 }) overall_index: number;
  @ApiProperty({ example: 'متوسط' }) tier: string;
  @ApiProperty({ example: 25 }) total_services: number;
  @ApiProperty({ example: { L4: 6, L3: 14, L2: 5 } }) distribution: Record<string, number>;
  @ApiProperty({ example: { 'IR-4': 2, 'IR-3': 22, 'IR-2': 1 } }) readiness: Record<string, number>;
  @ApiProperty({ additionalProperties: { $ref: '#/components/schemas/MaturityByDomain' } }) by_domain: Record<string, MaturityByDomain>;
  @ApiProperty({ type: [MaturityEntry] }) entries: MaturityEntry[];
}

export class ImpactPathScreen {
  @ApiProperty() screen: { id: string; name: string };
  @ApiProperty({ type: [Object] }) fields: { id: string; name: string; mode: string }[];
  @ApiProperty({ type: [Object] }) actions: { id: string; name: string }[];
}

export class ImpactPathIntegration {
  @ApiProperty() integration: { id: string; name: string };
  @ApiProperty({ type: [Object] }) externalSystems: { id: string; name: string }[];
}

export class ImpactPathResponse {
  @ApiProperty() service: { id: string; name: string };
  @ApiProperty() path: { screens: ImpactPathScreen[]; integrations: ImpactPathIntegration[] };
}
