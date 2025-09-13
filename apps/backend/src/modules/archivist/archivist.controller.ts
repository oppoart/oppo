import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('archivist')
@Controller('archivist')
export class ArchivistController {
  @Get('health')
  getHealth() {
    return { status: 'ok', module: 'archivist' };
  }
}
