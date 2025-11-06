import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { QueryTemplatesService } from './query-templates.service';
import { AuthGuard } from '../../common/guards/auth.guard';

@Controller('query-templates')
@UseGuards(AuthGuard)
export class QueryTemplatesController {
  constructor(private readonly queryTemplatesService: QueryTemplatesService) {}

  @Get('groups')
  async getAllGroups() {
    return this.queryTemplatesService.getAll();
  }

  @Get(':id')
  async getTemplate(@Param('id') id: string) {
    return this.queryTemplatesService.getTemplate(id);
  }

  @Post()
  async createTemplate(
    @Body()
    body: {
      groupId: string;
      template: string;
      placeholders: string[];
      order?: number;
    },
  ) {
    return this.queryTemplatesService.createTemplate(body);
  }

  @Put(':id')
  async updateTemplate(
    @Param('id') id: string,
    @Body()
    body: {
      template?: string;
      placeholders?: string[];
      order?: number;
      groupId?: string;
    },
  ) {
    return this.queryTemplatesService.updateTemplate(id, body);
  }

  @Delete(':id')
  async deleteTemplate(@Param('id') id: string) {
    return this.queryTemplatesService.deleteTemplate(id);
  }

  @Post('groups')
  async createGroup(
    @Body()
    body: {
      name: string;
      description?: string;
      order?: number;
    },
  ) {
    return this.queryTemplatesService.createGroup(body);
  }

  @Put('groups/:id')
  async updateGroup(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      description?: string;
      order?: number;
    },
  ) {
    return this.queryTemplatesService.updateGroup(id, body);
  }

  @Delete('groups/:id')
  async deleteGroup(@Param('id') id: string) {
    return this.queryTemplatesService.deleteGroup(id);
  }
}
