import { LiaisonConfig } from '../types';
export declare const defaultLiaisonConfig: LiaisonConfig;
export declare const productionLiaisonConfig: Partial<LiaisonConfig>;
export declare const developmentLiaisonConfig: Partial<LiaisonConfig>;
export declare function getLiaisonConfig(env?: 'development' | 'production' | 'test'): LiaisonConfig;
export declare function validateLiaisonConfig(config: Partial<LiaisonConfig>): string[];
export declare const ConfigHelpers: {
    fromEnv(): Partial<LiaisonConfig>;
    getWebSocketUrl(): string | undefined;
};
