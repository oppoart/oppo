import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface QueryBucketItem {
  id: string;
  query: string;
  source: string;
  tags: string[];
  profileId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AddQueryRequest {
  query: string;
  profileId?: string;
  source?: 'manual' | 'generated' | 'ai';
  tags?: string[];
}

@Injectable()
export class QueryBucketService {
  private readonly logger = new Logger(QueryBucketService.name);

  constructor(private readonly prismaService: PrismaService) {}

  async getQueries(userId: string): Promise<QueryBucketItem[]> {
    try {
      const queries = await this.prismaService.queryBucket.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });

      return queries.map(query => ({
        id: query.id,
        query: query.query,
        source: query.source,
        tags: query.tags,
        profileId: query.profileId || undefined,
        createdAt: query.createdAt.toISOString(),
        updatedAt: query.updatedAt.toISOString(),
      }));
    } catch (error) {
      this.logger.error('Failed to get queries from bucket', error);
      throw new Error('Failed to retrieve queries from bucket');
    }
  }

  async addQuery(userId: string, request: AddQueryRequest): Promise<QueryBucketItem> {
    try {
      const query = await this.prismaService.queryBucket.create({
        data: {
          userId,
          query: request.query,
          source: request.source || 'manual',
          tags: request.tags || [],
          profileId: request.profileId,
        },
      });

      return {
        id: query.id,
        query: query.query,
        source: query.source,
        tags: query.tags,
        profileId: query.profileId || undefined,
        createdAt: query.createdAt.toISOString(),
        updatedAt: query.updatedAt.toISOString(),
      };
    } catch (error) {
      if (error.code === 'P2002') {
        throw new Error('Query already exists in your bucket');
      }
      this.logger.error('Failed to add query to bucket', error);
      throw new Error('Failed to add query to bucket');
    }
  }

  async removeQuery(userId: string, query: string): Promise<void> {
    try {
      await this.prismaService.queryBucket.deleteMany({
        where: {
          userId,
          query,
        },
      });
    } catch (error) {
      this.logger.error('Failed to remove query from bucket', error);
      throw new Error('Failed to remove query from bucket');
    }
  }

  async clearBucket(userId: string): Promise<void> {
    try {
      await this.prismaService.queryBucket.deleteMany({
        where: { userId },
      });
    } catch (error) {
      this.logger.error('Failed to clear query bucket', error);
      throw new Error('Failed to clear query bucket');
    }
  }

  async updateQuery(userId: string, queryId: string, tags: string[]): Promise<void> {
    try {
      await this.prismaService.queryBucket.updateMany({
        where: {
          id: queryId,
          userId,
        },
        data: { tags },
      });
    } catch (error) {
      this.logger.error('Failed to update query tags', error);
      throw new Error('Failed to update query tags');
    }
  }
}
