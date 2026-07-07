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

export function paginate<T>(items: T[], page: number, limit: number) {
  const safePage = Math.max(1, page);
  const safeLimit = Math.min(Math.max(1, limit), 100);
  const total = items.length;
  const totalPages = Math.ceil(total / safeLimit);
  const start = (safePage - 1) * safeLimit;
  const data = items.slice(start, start + safeLimit);
  return { data, meta: { page: safePage, limit: safeLimit, total, totalPages } };
}
