import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('research')
@Controller('research')
export class ResearchController {
  @Get('health')
  getHealth() {
    return { status: 'ok', module: 'research' };
  }
}
