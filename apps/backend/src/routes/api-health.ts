import express from 'express';
import { apiKeyManager } from '../../../packages/shared/src/config/ApiKeyManager';

const router = express.Router();

/**
 * GET /api/health/api-keys
 * Returns the status of all API keys
 */
router.get('/api-keys', async (req, res) => {
  try {
    const validation = await apiKeyManager.validateAllKeys();
    const statuses = apiKeyManager.getAllServiceStatuses();
    
    res.json({
      success: true,
      data: {
        overall: {
          valid: validation.valid,
          configuredCount: validation.configured.length,
          missingCount: validation.missing.length,
          invalidCount: validation.invalid.length
        },
        services: {
          configured: validation.configured,
          missing: validation.missing,
          invalid: validation.invalid
        },
        warnings: validation.warnings,
        statuses: statuses,
        recommendations: {
          bestSearchService: apiKeyManager.getBestSearchService(),
          bestAiService: apiKeyManager.getBestAiService()
        },
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('API key health check failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check API key status',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/health/api-keys/:service
 * Returns the status of a specific API service
 */
router.get('/api-keys/:service', async (req, res) => {
  try {
    const { service } = req.params;
    const serviceUpper = service.toUpperCase();
    
    const isConfigured = apiKeyManager.isServiceConfigured(serviceUpper);
    const status = apiKeyManager.getServiceStatus(serviceUpper);
    const healthCheck = await apiKeyManager.healthCheckService(serviceUpper);
    
    if (!status && !isConfigured) {
      return res.status(404).json({
        success: false,
        error: `Unknown API service: ${service}`,
        availableServices: apiKeyManager.getConfiguredServices()
      });
    }
    
    res.json({
      success: true,
      data: {
        service: serviceUpper,
        configured: isConfigured,
        status: status,
        healthCheck: healthCheck,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error(`Health check failed for service ${req.params.service}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to check service status',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/health/api-keys/validate
 * Validates all API keys and returns detailed report
 */
router.post('/validate', async (req, res) => {
  try {
    const validation = await apiKeyManager.validateAllKeys();
    const report = apiKeyManager.generateReport();
    
    // Run health checks for configured services
    const healthChecks: { [key: string]: boolean } = {};
    for (const service of validation.configured) {
      try {
        healthChecks[service] = await apiKeyManager.healthCheckService(service);
      } catch (error) {
        healthChecks[service] = false;
      }
    }
    
    res.json({
      success: true,
      data: {
        validation,
        healthChecks,
        report,
        recommendations: {
          searchServices: {
            best: apiKeyManager.getBestSearchService(),
            available: validation.configured.filter(s => 
              s.includes('SEARCH') || s.includes('SERP') || s.includes('BING')
            )
          },
          aiServices: {
            best: apiKeyManager.getBestAiService(),
            available: validation.configured.filter(s => 
              s.includes('OPENAI') || s.includes('ANTHROPIC') || s.includes('AI')
            )
          }
        },
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('API key validation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate API keys',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/health/api-keys/report
 * Returns a detailed configuration report for debugging
 */
router.get('/report', async (req, res) => {
  try {
    const report = apiKeyManager.generateReport();
    const validation = await apiKeyManager.validateAllKeys();
    
    // Return as both JSON and text format
    const format = req.query.format === 'text' ? 'text' : 'json';
    
    if (format === 'text') {
      res.setHeader('Content-Type', 'text/plain');
      res.send(report);
    } else {
      res.json({
        success: true,
        data: {
          report,
          validation,
          timestamp: new Date().toISOString(),
          environment: process.env.NODE_ENV || 'development'
        }
      });
    }
  } catch (error) {
    console.error('Failed to generate API key report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate report',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
