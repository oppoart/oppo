import { IsString, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class StartWorkflowDto {
  @ApiProperty({ description: 'Type of workflow to start' })
  @IsString()
  workflowType: string;

  @ApiPropertyOptional({ description: 'Workflow parameters' })
  @IsOptional()
  @IsObject()
  params?: any;
}

export class ScheduleTaskDto {
  @ApiProperty({ description: 'Type of task to schedule' })
  @IsString()
  taskType: string;

  @ApiProperty({ description: 'Cron schedule expression' })
  @IsString()
  schedule: string;

  @ApiPropertyOptional({ description: 'Task parameters' })
  @IsOptional()
  @IsObject()
  params?: any;
}

export class QueryAgentDto {
  @ApiProperty({ description: 'Question to ask the agent' })
  @IsString()
  question: string;

  @ApiPropertyOptional({ description: 'Additional context for the query' })
  @IsOptional()
  @IsObject()
  context?: any;
}
