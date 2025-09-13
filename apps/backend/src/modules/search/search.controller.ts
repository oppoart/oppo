import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('search')
@Controller('search')
export class SearchController {
  @Get('health')
  getHealth() {
    return { status: 'ok', module: 'search' };
  }
}
