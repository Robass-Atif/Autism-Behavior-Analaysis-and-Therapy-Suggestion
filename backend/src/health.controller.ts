import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Check server health' })
  @ApiResponse({ status: 200, description: 'Server is running' })
  check() {
    return {
      success: true,
      message: 'Server is running',
      timestamp: new Date().toISOString(),
    };
  }
}
