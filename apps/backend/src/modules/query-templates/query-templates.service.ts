import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class QueryTemplatesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get all template groups with their templates
   */
  async getAll() {
    return this.prisma.queryTemplateGroup.findMany({
      include: {
        templates: {
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { order: 'asc' },
    });
  }

  /**
   * Get a single template by ID
   */
  async getTemplate(id: string) {
    const template = await this.prisma.queryTemplate.findUnique({
      where: { id },
      include: { group: true },
    });

    if (!template) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }

    return template;
  }

  /**
   * Create a new template
   */
  async createTemplate(data: {
    groupId: string;
    template: string;
    placeholders: string[];
    order?: number;
  }) {
    return this.prisma.queryTemplate.create({
      data,
      include: { group: true },
    });
  }

  /**
   * Update a template
   */
  async updateTemplate(
    id: string,
    data: {
      template?: string;
      placeholders?: string[];
      order?: number;
      groupId?: string;
    },
  ) {
    try {
      return await this.prisma.queryTemplate.update({
        where: { id },
        data,
        include: { group: true },
      });
    } catch (error) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }
  }

  /**
   * Delete a template
   */
  async deleteTemplate(id: string) {
    try {
      return await this.prisma.queryTemplate.delete({
        where: { id },
      });
    } catch (error) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }
  }

  /**
   * Create a new template group
   */
  async createGroup(data: {
    name: string;
    description?: string;
    order?: number;
  }) {
    return this.prisma.queryTemplateGroup.create({
      data,
    });
  }

  /**
   * Update a template group
   */
  async updateGroup(
    id: string,
    data: {
      name?: string;
      description?: string;
      order?: number;
    },
  ) {
    try {
      return await this.prisma.queryTemplateGroup.update({
        where: { id },
        data,
      });
    } catch (error) {
      throw new NotFoundException(`Group with ID ${id} not found`);
    }
  }

  /**
   * Delete a template group
   */
  async deleteGroup(id: string) {
    try {
      return await this.prisma.queryTemplateGroup.delete({
        where: { id },
      });
    } catch (error) {
      throw new NotFoundException(`Group with ID ${id} not found`);
    }
  }
}
