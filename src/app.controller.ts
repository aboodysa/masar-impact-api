import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from './common/decorators/public.decorator';

@ApiTags('Health')
@Controller()
export class AppController {
  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Health check — does not require authentication' })
  @ApiResponse({ status: 200, description: 'API is healthy' })
  health() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
