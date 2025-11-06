import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface PlaceholderContext {
  mediums?: string[];
  location?: string;
  interests?: string[];
}

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
   * Get profile's selected templates
   */
  async getProfileTemplates(profileId: string) {
    const selections = await this.prisma.profileQueryTemplate.findMany({
      where: { profileId },
      include: {
        template: {
          include: { group: true },
        },
      },
    });

    return selections.map((s) => s.template);
  }

  /**
   * Update profile's template selections (bulk)
   */
  async updateProfileTemplates(profileId: string, templateIds: string[]) {
    // Delete existing selections
    await this.prisma.profileQueryTemplate.deleteMany({
      where: { profileId },
    });

    // Create new selections
    if (templateIds.length > 0) {
      await this.prisma.profileQueryTemplate.createMany({
        data: templateIds.map((templateId) => ({
          profileId,
          templateId,
          enabled: true,
        })),
      });
    }

    return this.getProfileTemplates(profileId);
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

  /**
   * Generate search queries from profile's selected templates with placeholder replacement
   */
  async generateSearchQueries(
    profileId: string,
    context?: PlaceholderContext,
  ): Promise<
    Array<{
      template: string;
      query: string;
      group: string;
      placeholders: string[];
    }>
  > {
    const templates = await this.getProfileTemplates(profileId);

    const now = new Date();
    const month = now.toLocaleString('en', { month: 'long' });
    const year = now.getFullYear().toString();

    const replacements: Record<string, string> = {
      medium: context?.mediums?.[0] || 'art',
      month,
      year,
      'opportunity-type': 'exhibitions',
      location: context?.location || 'United States',
      'city/state/country': context?.location || 'California',
      amount: '$5000',
      'grant/award/exhibition/residency': 'grants',
      'grant/competition/exhibition': 'grants',
      'grant/exhibition': 'grants',
      'theme/subject': context?.interests?.[0] || 'contemporary',
      theme: context?.interests?.[0] || 'contemporary art',
      'social-issue': 'sustainability',
    };

    return templates.map((template) => {
      let query = template.template;

      // Replace each placeholder
      template.placeholders.forEach((placeholder) => {
        const value = replacements[placeholder] || placeholder;
        const regex = new RegExp(
          `\\[${placeholder.replace(/[/]/g, '\\$&')}\\]`,
          'g',
        );
        query = query.replace(regex, value);
      });

      return {
        template: template.template,
        query,
        group: template.group?.name || 'Unknown',
        placeholders: template.placeholders,
      };
    });
  }
}
