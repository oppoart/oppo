import { plainToInstance } from 'class-transformer';
import { IsEnum, IsNumber, IsString, IsUrl, IsOptional, validateSync } from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment = Environment.Development;

  @IsNumber()
  PORT: number = 3001;

  @IsOptional()
  @IsString()
  FRONTEND_URL: string = 'http://localhost:3000';

  @IsString()
  DATABASE_URL: string;

  @IsString()
  JWT_SECRET: string;

  @IsNumber()
  BCRYPT_ROUNDS: number = 12;

  @IsNumber()
  SESSION_TIMEOUT_HOURS: number = 24;

  @IsString()
  OPENAI_API_KEY: string;

  @IsOptional()
  @IsString()
  ANTHROPIC_API_KEY?: string;

  @IsString()
  AI_MODEL_PRIMARY: string = 'gpt-4';

  @IsString()
  AI_MODEL_FALLBACK: string = 'gpt-3.5-turbo';

  @IsNumber()
  AI_MAX_TOKENS: number = 2000;

  @IsNumber()
  AI_RATE_LIMIT: number = 100;

  @IsOptional()
  @IsString()
  FIRECRAWL_API_KEY?: string;

  @IsOptional()
  @IsString()
  GOOGLE_SEARCH_API_KEY?: string;

  @IsOptional()
  @IsString()
  GOOGLE_SEARCH_ENGINE_ID?: string;

  @IsOptional()
  @IsString()
  SENDGRID_API_KEY?: string;

  @IsOptional()
  @IsString()
  RESEND_API_KEY?: string;

  @IsOptional()
  @IsString()
  FROM_EMAIL?: string;

  @IsNumber()
  RATE_LIMIT_WINDOW_MS: number = 900000; // 15 minutes

  @IsNumber()
  RATE_LIMIT_MAX_REQUESTS: number = 100;

  @IsNumber()
  AUTH_RATE_LIMIT_MAX: number = 5;
}

export function validateEnvironment(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(
      `Environment validation failed:\n${errors
        .map((error) => Object.values(error.constraints || {}).join(', '))
        .join('\n')}`,
    );
  }

  return validatedConfig;
}
