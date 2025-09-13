import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('liaison')
@Controller('liaison')
export class LiaisonController {
  @Get('health')
  getHealth() {
    return { status: 'ok', module: 'liaison' };
  }
}
