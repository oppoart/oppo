import { Injectable } from '@nestjs/common';
import { QueryGenerationRequest, QueryGenerationContext } from '../../../types/query-generation';

@Injectable()
export class QueryTemplateEngine {
  
  populateTemplate(
    template: string, 
    context: QueryGenerationContext, 
    request: QueryGenerationRequest
  ): string {
    let populatedQuery = template;
    
    // Replace placeholders
    const mediums = context.profile.mediums;
    if (mediums.length > 0) {
      populatedQuery = populatedQuery.replace(/{medium}/g, mediums[0]);
    }
    
    const location = request.location || context.profile.location;
    if (location) {
      populatedQuery = populatedQuery.replace(/{location}/g, location as string);
    }
    
    populatedQuery = populatedQuery.replace(/{year}/g, new Date().getFullYear().toString());
    
    // Add custom keywords if provided
    if (request.customKeywords && Array.isArray(request.customKeywords) && request.customKeywords.length > 0) {
      populatedQuery += ` ${request.customKeywords.join(' ')}`;
    }
    
    return populatedQuery;
  }

  extractTemplateVariables(template: string): string[] {
    const variablePattern = /{(\w+)}/g;
    const variables: string[] = [];
    let match;
    
    while ((match = variablePattern.exec(template)) !== null) {
      variables.push(match[1]);
    }
    
    return [...new Set(variables)]; // Remove duplicates
  }
}