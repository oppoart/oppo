import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Put,
  Param,
  Delete,
  UseGuards,
  Req,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { ProfilesService } from './profiles.service';
import { CreateProfileDto, UpdateProfileDto } from './dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { AiService } from '../../shared/services/ai.service';
import { QueryGenerationService } from '../query-generation/query-generation.service';
import { QueryExpansionService } from '../query-generation/services/query-expansion.service';
import { QueryGenerationRequest, QueryType, QueryStrategy } from '../../types/query-generation';

@ApiTags('profiles')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('profiles')
export class ProfilesController {
  constructor(
    private readonly profilesService: ProfilesService,
    private readonly aiService: AiService,
    private readonly queryGenerationService: QueryGenerationService,
    private readonly queryExpansionService: QueryExpansionService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new artist profile' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Profile created successfully' })
  async create(@Req() request: Request, @Body() createProfileDto: CreateProfileDto) {
    const userId = (request as any).user.id;
    const profile = await this.profilesService.create(userId, createProfileDto);
    
    return {
      success: true,
      message: 'Profile created successfully',
      data: profile,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all profiles for the current user' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Profiles retrieved successfully' })
  async findAll(@Req() request: Request) {
    const userId = (request as any).user.id;
    const profiles = await this.profilesService.findAll(userId);
    
    return {
      success: true,
      message: 'Profiles retrieved successfully',
      data: profiles,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific profile' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Profile retrieved successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Profile not found' })
  async findOne(@Req() request: Request, @Param('id') id: string) {
    const userId = (request as any).user.id;
    const profile = await this.profilesService.findOne(id, userId);
    
    return {
      success: true,
      message: 'Profile retrieved successfully',
      data: profile,
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a profile (partial)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Profile updated successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Profile not found' })
  async update(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    const userId = (request as any).user.id;
    const profile = await this.profilesService.update(id, userId, updateProfileDto);
    
    return {
      success: true,
      message: 'Profile updated successfully',
      data: profile,
    };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a profile (full)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Profile updated successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Profile not found' })
  async updateFull(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    const userId = (request as any).user.id;
    const profile = await this.profilesService.update(id, userId, updateProfileDto);
    
    return {
      success: true,
      message: 'Profile updated successfully',
      data: profile,
    };
  }

  @Post(':id/enhance-prompt')
  @ApiOperation({ summary: 'Enhance prompt using AI' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Prompt enhanced successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Profile not found' })
  async enhancePrompt(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() enhanceDto: { prompt: string },
  ) {
    const userId = (request as any).user.id;
    
    // Get the profile to use as context for enhancement
    const profile = await this.profilesService.findOne(id, userId);
    
    // Create context from the artist profile
    const context = profile ? 
      `Artist: ${profile.name || 'Artist'}, Mediums: ${profile.mediums?.join(', ') || 'Various'}, Interests: ${profile.interests?.join(', ') || 'Various'}` :
      undefined;
    
    // Enhance the prompt using AI service
    const enhancedPrompt = await this.aiService.enhancePrompt(enhanceDto.prompt, context);
    
    return {
      success: true,
      message: 'Prompt enhanced successfully',
      data: {
        originalPrompt: enhanceDto.prompt,
        enhancedPrompt: enhancedPrompt,
        aiConfigured: this.aiService.isConfigured(),
      },
    };
  }

  @Post(':id/generate-queries')
  @ApiOperation({ summary: 'Generate search queries for opportunities based on artist profile' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Queries generated successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Profile not found' })
  async generateQueries(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() generateDto: {
      queryTypes?: QueryType[];
      strategy?: QueryStrategy;
      maxQueries?: number;
      location?: string;
      customKeywords?: string[];
      excludeKeywords?: string[];
    } = {},
  ) {
    const userId = (request as any).user.id;
    
    // Verify profile exists and belongs to user
    await this.profilesService.findOne(id, userId);
    
    const queryRequest: QueryGenerationRequest = {
      profileId: id,
      ...generateDto,
    };
    
    const result = await this.queryGenerationService.generateQueries(queryRequest);
    
    return result;
  }

  @Post(':id/quick-queries')
  @ApiOperation({ summary: 'Generate quick search queries with default settings' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Quick queries generated successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Profile not found' })
  async generateQuickQueries(
    @Req() request: Request,
    @Param('id') id: string,
  ) {
    const userId = (request as any).user.id;

    // Verify profile exists and belongs to user
    await this.profilesService.findOne(id, userId);

    const queryRequest: QueryGenerationRequest = {
      profileId: id,
      strategy: 'semantic',
      maxQueries: 10,
    };

    const result = await this.queryGenerationService.generateQueries(queryRequest);

    return result;
  }

  @Get(':id/expanded-queries')
  @ApiOperation({ summary: 'Get all expanded queries for a profile based on its parameters' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Expanded queries generated successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Profile not found' })
  async getExpandedQueries(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() body: {
      groupId?: string;
      limit?: number;
      includeIncomplete?: boolean;
    } = {},
  ) {
    const userId = (request as any).user.id;

    // Verify profile exists and belongs to user
    await this.profilesService.findOne(id, userId);

    const result = await this.queryExpansionService.expandQueriesForProfile(id, body);

    return result;
  }

  @Get(':id/expansion-preview')
  @ApiOperation({ summary: 'Get a preview of how many queries would be generated' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Preview generated successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Profile not found' })
  async getExpansionPreview(
    @Req() request: Request,
    @Param('id') id: string,
  ) {
    const userId = (request as any).user.id;

    // Verify profile exists and belongs to user
    await this.profilesService.findOne(id, userId);

    const preview = await this.queryExpansionService.getExpansionPreview(id);

    return {
      success: true,
      message: 'Preview generated successfully',
      data: preview,
    };
  }

  @Post(':id/analyze')
  @ApiOperation({ summary: 'Analyze profile completeness and provide recommendations' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Profile analyzed successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Profile not found' })
  async analyzeProfile(
    @Req() request: Request,
    @Param('id') id: string,
  ) {
    const userId = (request as any).user.id;

    // Verify profile exists and belongs to user
    const profile = await this.profilesService.findOne(id, userId);

    // Calculate completeness score
    const requiredFields = ['locations', 'opportunityTypes', 'amountRanges', 'themes'];
    const filledFields = requiredFields.filter(field =>
      profile[field] && Array.isArray(profile[field]) && profile[field].length > 0
    );

    const completenessScore = Math.round((filledFields.length / requiredFields.length) * 100);

    // Get missing fields
    const missingFields = requiredFields.filter(field =>
      !profile[field] || !Array.isArray(profile[field]) || profile[field].length === 0
    );

    // Get expansion preview
    const preview = await this.queryExpansionService.getExpansionPreview(id);

    // Generate recommendations
    const recommendations: string[] = [];

    if (missingFields.includes('locations')) {
      recommendations.push('Add locations to target specific geographic areas');
    }
    if (missingFields.includes('opportunityTypes')) {
      recommendations.push('Add opportunity types (e.g., grants, residencies, exhibitions)');
    }
    if (missingFields.includes('amountRanges')) {
      recommendations.push('Add funding amount ranges to filter relevant opportunities');
    }
    if (missingFields.includes('themes')) {
      recommendations.push('Add thematic interests to refine search results');
    }

    if (!profile.artistStatement || profile.artistStatement.length < 200) {
      recommendations.push('Expand your artist statement to at least 200 characters for better matching');
    }

    if (!profile.bio || profile.bio.length < 100) {
      recommendations.push('Add a bio of at least 100 characters to improve profile completeness');
    }

    return {
      success: true,
      message: 'Profile analyzed successfully',
      data: {
        profileId: id,
        completenessScore,
        missingFields,
        recommendations,
        queryGenerationPotential: {
          current: preview.estimatedQueries,
          withAllParameters: preview.totalTemplates * Math.max(1,
            (missingFields.length === 0 ? 1 : 2) * preview.totalCombinations
          ),
        },
      },
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a profile' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Profile deleted successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Profile not found' })
  async remove(@Req() request: Request, @Param('id') id: string) {
    const userId = (request as any).user.id;
    await this.profilesService.remove(id, userId);
    
    return {
      success: true,
      message: 'Profile deleted successfully',
    };
  }
}
