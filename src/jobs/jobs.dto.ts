import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class JobDto {
  @ApiProperty() id: string;
  @ApiProperty({ example: 'تحليل تأثير تعديل وافد' }) title: string;
  @ApiPropertyOptional() description?: string;
  @ApiPropertyOptional() targetService?: string;
  @ApiProperty({ example: 'completed', enum: ['queued', 'running', 'completed', 'failed'] }) status: string;
  @ApiProperty({ example: 100 }) progress: number;
  @ApiProperty() createdAt: string;
  @ApiPropertyOptional() startedAt?: string;
  @ApiPropertyOptional() completedAt?: string;
  @ApiPropertyOptional() error?: string;
  @ApiPropertyOptional() resultId?: string;
}

export class JobListResponse {
  @ApiProperty({ example: 1 }) page: number;
  @ApiProperty({ example: 50 }) limit: number;
  @ApiProperty({ example: 2 }) total: number;
  @ApiProperty({ example: 1 }) totalPages: number;
  @ApiProperty({ type: [JobDto] }) jobs: JobDto[];
}

export class JobDetailResponse {
  @ApiProperty() job: JobDto;
}

export class JobResultResponse {
  @ApiProperty() result: Record<string, unknown>;
}
