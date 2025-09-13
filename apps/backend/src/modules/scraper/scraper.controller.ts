import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('scraper')
@Controller('scraper')
export class ScraperController {
  @Get('health')
  getHealth() {
    return { status: 'ok', module: 'scraper' };
  }
}
