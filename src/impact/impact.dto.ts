import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ChangeRequestInput {
  @ApiProperty({ example: 'تعديل شاشة إنهاء التعاقد' })
  title: string;

  @ApiPropertyOptional({ example: 'إضافة إدخال يدوي لفئة الوظيفة والمسمى الوظيفي' })
  description?: string;

  @ApiPropertyOptional({ example: 'svc:wafed' })
  targetService?: string;
}

export class ImpactAnalyzeRequest {
  @ApiProperty()
  changeRequest: ChangeRequestInput;
}

export class ImpactSummary {
  @ApiProperty({ example: 3 }) totalServices: number;
  @ApiProperty({ example: 1 }) highImpact: number;
  @ApiProperty({ example: 2 }) mediumImpact: number;
  @ApiProperty({ example: 0 }) risks: number;
}

export class ImpactRisk {
  @ApiProperty({ example: 'integration' }) type: string;
  @ApiProperty({ example: 'high' }) severity: string;
  @ApiProperty({ example: 'JICS dependency may cause cascading failures' }) description: string;
  @ApiProperty({ example: 'Review integration contracts before change' }) recommendation: string;
}

export class ImpactFinding {
  @ApiProperty({ example: 'info' }) type: string;
  @ApiProperty({ example: 'Screen fields map to external system sarf' }) message: string;
}

export class ImpactAnalyzeResponse {
  @ApiProperty({ example: 'REQ-ABC123' }) requestId: string;
  @ApiProperty({ example: 'completed' }) status: string;
  @ApiProperty() timestamp: string;
  @ApiProperty() summary: ImpactSummary;
  @ApiProperty({ type: [Object] }) impacts: unknown[];
  @ApiProperty({ type: [ImpactRisk] }) risks: ImpactRisk[];
  @ApiProperty({ type: [String] }) recommendedActions: string[];
  @ApiProperty({ type: [ImpactFinding] }) findings: ImpactFinding[];
}

export class SearchResult {
  @ApiProperty() id: string;
  @ApiProperty() type: string;
  @ApiProperty() label: string;
}

export class SearchResponse {
  @ApiProperty({ example: 'ترقيات' }) query: string;
  @ApiProperty({ example: 5 }) count: number;
  @ApiProperty({ type: [SearchResult] }) results: SearchResult[];
}

export class CreateJobRequest {
  @ApiProperty({ example: 'تحليل تأثير تعديل وافد' })
  title: string;

  @ApiPropertyOptional({ example: 'تغيير شاشة إنهاء التعاقد' })
  description?: string;

  @ApiPropertyOptional({ example: 'svc:wafed' })
  targetService?: string;
}
