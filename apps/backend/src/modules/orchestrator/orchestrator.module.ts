import { Module } from '@nestjs/common';
import { OrchestratorService } from './orchestrator.service';
import { OrchestratorController } from './orchestrator.controller';
import { RAGAgentService } from './services/rag-agent.service';
import { WorkflowService } from './services/workflow.service';
import { SchedulingService } from './services/scheduling.service';

@Module({
  controllers: [OrchestratorController],
  providers: [
    OrchestratorService,
    RAGAgentService,
    WorkflowService,
    SchedulingService,
  ],
  exports: [OrchestratorService, RAGAgentService, WorkflowService],
})
export class OrchestratorModule {}
