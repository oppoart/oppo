import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('query-bucket')
@Controller('query-bucket')
export class QueryBucketController {
  @Get('health')
  getHealth() {
    return { status: 'ok', module: 'query-bucket' };
  }
}
