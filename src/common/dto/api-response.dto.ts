import { ApiProperty } from '@nestjs/swagger';

export class PaginationMeta {
  @ApiProperty({ example: 1 }) page: number;
  @ApiProperty({ example: 50 }) limit: number;
  @ApiProperty({ example: 25 }) total: number;
  @ApiProperty({ example: 1 }) totalPages: number;
}

export class ApiError {
  @ApiProperty({ example: 404 }) statusCode: number;
  @ApiProperty({ example: 'Service not found' }) message: string;
  @ApiProperty({ example: 'Not Found' }) error: string;
}

export class PaginatedResponse<T> {
  data: T[];
  @ApiProperty() meta: PaginationMeta;
}
