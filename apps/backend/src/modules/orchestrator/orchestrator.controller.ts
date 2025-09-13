import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { OrchestratorService } from './orchestrator.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { StartWorkflowDto, ScheduleTaskDto, QueryAgentDto } from './dto';

@ApiTags('orchestrator')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('orchestrator')
export class OrchestratorController {
  constructor(private readonly orchestratorService: OrchestratorService) {}

  @Post('workflows')
  @ApiOperation({ summary: 'Start a new workflow' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Workflow started successfully' })
  async startWorkflow(@Body() startWorkflowDto: StartWorkflowDto) {
    return {
      success: true,
      data: await this.orchestratorService.startWorkflow(
        startWorkflowDto.workflowType,
        startWorkflowDto.params,
      ),
    };
  }

  @Delete('workflows/:id')
  @ApiOperation({ summary: 'Stop a running workflow' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Workflow stopped successfully' })
  async stopWorkflow(@Param('id') workflowId: string) {
    return {
      success: true,
      data: await this.orchestratorService.stopWorkflow(workflowId),
    };
  }

  @Get('workflows/:id')
  @ApiOperation({ summary: 'Get workflow status' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Workflow status retrieved' })
  async getWorkflowStatus(@Param('id') workflowId: string) {
    return {
      success: true,
      data: await this.orchestratorService.getWorkflowStatus(workflowId),
    };
  }

  @Post('schedule')
  @ApiOperation({ summary: 'Schedule a recurring task' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Task scheduled successfully' })
  async scheduleTask(@Body() scheduleTaskDto: ScheduleTaskDto) {
    return {
      success: true,
      data: await this.orchestratorService.scheduleTask(
        scheduleTaskDto.taskType,
        scheduleTaskDto.schedule,
        scheduleTaskDto.params,
      ),
    };
  }

  @Get('schedule')
  @ApiOperation({ summary: 'Get all scheduled tasks' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Scheduled tasks retrieved' })
  async getScheduledTasks() {
    return {
      success: true,
      data: await this.orchestratorService.getScheduledTasks(),
    };
  }

  @Post('agent/query')
  @ApiOperation({ summary: 'Query the RAG agent' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Agent response generated' })
  async queryAgent(@Body() queryAgentDto: QueryAgentDto) {
    return {
      success: true,
      data: await this.orchestratorService.queryAgent(
        queryAgentDto.question,
        queryAgentDto.context,
      ),
    };
  }

  @Get('agent/metrics')
  @ApiOperation({ summary: 'Get agent performance metrics' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Agent metrics retrieved' })
  async getAgentMetrics() {
    return {
      success: true,
      data: await this.orchestratorService.getAgentMetrics(),
    };
  }
}
