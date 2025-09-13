/**
 * AnalystService Singleton
 * 
 * Provides a single shared instance of AnalystService to avoid conflicts
 * between manual (/api/analyst) and agentic (/api/research) workflows
 */

import { PrismaClient } from '@prisma/client';
import { AnalystService } from '../../../../packages/services/analyst';

class AnalystServiceSingleton {
  private static instance: AnalystService | null = null;
  private static prisma: PrismaClient | null = null;
  private static initialized = false;

  /**
   * Get the singleton AnalystService instance
   */
  static getInstance(): AnalystService {
    if (!this.instance) {
      if (!this.prisma) {
        this.prisma = new PrismaClient();
      }
      
      console.log('🧠 Creating AnalystService singleton instance...');
      this.instance = new AnalystService(this.prisma);
    }
    
    return this.instance;
  }

  /**
   * Initialize the AnalystService (call once at startup)
   */
  static async initialize(): Promise<AnalystService> {
    const instance = this.getInstance();
    
    if (!this.initialized) {
      console.log('🚀 Initializing AnalystService singleton...');
      await instance.initialize();
      this.initialized = true;
      console.log('✅ AnalystService singleton initialized successfully');
    }
    
    return instance;
  }

  /**
   * Get the shared Prisma client
   */
  static getPrisma(): PrismaClient {
    if (!this.prisma) {
      this.prisma = new PrismaClient();
    }
    return this.prisma;
  }

  /**
   * Cleanup (for testing or shutdown)
   */
  static async cleanup(): Promise<void> {
    if (this.prisma) {
      await this.prisma.$disconnect();
    }
    this.instance = null;
    this.prisma = null;
    this.initialized = false;
  }
}

export default AnalystServiceSingleton;
