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

@Controller('users/me/query-templates')
@UseGuards(AuthGuard)
export class UserQueryTemplatesController {
  constructor(private readonly queryTemplatesService: QueryTemplatesService) {}

  @Get()
  async getUserTemplates(@Request() req) {
    return this.queryTemplatesService.getUserTemplates(req.user.id);
  }

  @Post()
  async updateUserTemplates(
    @Request() req,
    @Body() body: { templateIds: string[] },
  ) {
    return this.queryTemplatesService.updateUserTemplates(
      req.user.id,
      body.templateIds,
    );
  }

  @Get('search-queries')
  async generateSearchQueries(
    @Request() req,
    @Body()
    body?: {
      mediums?: string[];
      location?: string;
      interests?: string[];
    },
  ) {
    return this.queryTemplatesService.generateSearchQueries(req.user.id, body);
  }
}
