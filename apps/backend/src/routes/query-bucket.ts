import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { prisma } from '../lib/prisma';

const router = Router();

// Apply authentication to all routes
router.use(requireAuth);

// Validation schemas
const addQuerySchema = z.object({
  query: z.string().min(1).max(500),
  profileId: z.string().optional(),
  source: z.enum(['manual', 'generated', 'ai']).default('manual'),
  tags: z.array(z.string()).default([])
});

const removeQuerySchema = z.object({
  query: z.string().min(1)
});

// GET /api/query-bucket - Get all queries in user's bucket
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const queries = await prisma.queryBucket.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      queries: queries.map(q => ({
        id: q.id,
        query: q.query,
        source: q.source,
        tags: q.tags,
        profileId: q.profileId,
        createdAt: q.createdAt,
        updatedAt: q.updatedAt
      }))
    });

  } catch (error: any) {
    console.error('Query bucket fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch query bucket'
    });
  }
});

// POST /api/query-bucket - Add query to bucket
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const validation = addQuerySchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request data',
        errors: validation.error.errors
      });
    }

    const { query, profileId, source, tags } = validation.data;

    // Check if query already exists for this user
    const existingQuery = await prisma.queryBucket.findUnique({
      where: {
        userId_query: {
          userId,
          query
        }
      }
    });

    if (existingQuery) {
      return res.status(409).json({
        success: false,
        message: 'Query already exists in bucket'
      });
    }

    const newQuery = await prisma.queryBucket.create({
      data: {
        userId,
        query,
        profileId,
        source,
        tags
      }
    });

    res.status(201).json({
      success: true,
      query: {
        id: newQuery.id,
        query: newQuery.query,
        source: newQuery.source,
        tags: newQuery.tags,
        profileId: newQuery.profileId,
        createdAt: newQuery.createdAt,
        updatedAt: newQuery.updatedAt
      }
    });

  } catch (error: any) {
    console.error('Query bucket add error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add query to bucket'
    });
  }
});

// DELETE /api/query-bucket - Remove query from bucket
router.delete('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const validation = removeQuerySchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request data',
        errors: validation.error.errors
      });
    }

    const { query } = validation.data;

    const deletedQuery = await prisma.queryBucket.deleteMany({
      where: {
        userId,
        query
      }
    });

    if (deletedQuery.count === 0) {
      return res.status(404).json({
        success: false,
        message: 'Query not found in bucket'
      });
    }

    res.json({
      success: true,
      message: 'Query removed from bucket'
    });

  } catch (error: any) {
    console.error('Query bucket remove error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove query from bucket'
    });
  }
});

// DELETE /api/query-bucket/clear - Clear all queries from bucket
router.delete('/clear', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    await prisma.queryBucket.deleteMany({
      where: { userId }
    });

    res.json({
      success: true,
      message: 'Query bucket cleared'
    });

  } catch (error: any) {
    console.error('Query bucket clear error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear query bucket'
    });
  }
});

// PUT /api/query-bucket/:id - Update query tags or metadata
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { tags } = req.body;

    if (!Array.isArray(tags)) {
      return res.status(400).json({
        success: false,
        message: 'Tags must be an array'
      });
    }

    const updatedQuery = await prisma.queryBucket.updateMany({
      where: {
        id,
        userId // Ensure user can only update their own queries
      },
      data: {
        tags,
        updatedAt: new Date()
      }
    });

    if (updatedQuery.count === 0) {
      return res.status(404).json({
        success: false,
        message: 'Query not found or access denied'
      });
    }

    res.json({
      success: true,
      message: 'Query updated successfully'
    });

  } catch (error: any) {
    console.error('Query bucket update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update query'
    });
  }
});

export default router;