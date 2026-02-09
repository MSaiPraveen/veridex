import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

/**
 * OpenAPI Specification for Veridex API Gateway
 */
export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Veridex API',
    description: `
# Veridex API Documentation

Veridex is a compliance-focused product management platform for the cannabis industry.

## Authentication

All protected endpoints require a Bearer token in the Authorization header:

\`\`\`
Authorization: Bearer <your-jwt-token>
\`\`\`

## API Versioning

The API supports multiple versions. You can specify the version using:

1. **URL prefix**: \`/api/v1/products\`
2. **Header**: \`X-API-Version: v1\`
3. **Accept header**: \`Accept: application/vnd.veridex.v1+json\`

Current version: **v1**

## Idempotency

For POST, PUT, and PATCH requests, you can include an \`Idempotency-Key\` header to prevent duplicate processing:

\`\`\`
Idempotency-Key: <unique-uuid>
\`\`\`

## Rate Limiting

The API enforces rate limits. Check the following response headers:
- \`X-RateLimit-Limit\`: Maximum requests per window
- \`X-RateLimit-Remaining\`: Remaining requests in current window
- \`X-RateLimit-Reset\`: Time when the window resets

## Error Responses

All errors follow this format:

\`\`\`json
{
  "error": "Error Type",
  "message": "Detailed error message",
  "details": {} // Optional additional information
}
\`\`\`
    `,
    version: '1.0.0',
    contact: {
      name: 'Veridex API Support',
      email: 'api-support@veridex.io',
      url: 'https://docs.veridex.io',
    },
    license: {
      name: 'Proprietary',
    },
  },
  servers: [
    {
      url: 'http://localhost:3001',
      description: 'Development server',
    },
    {
      url: 'https://api.veridex.io',
      description: 'Production server',
    },
  ],
  tags: [
    { name: 'Authentication', description: 'Login, registration, and token management' },
    { name: 'Users', description: 'User profile management' },
    { name: 'Organizations', description: 'Organization management' },
    { name: 'Products', description: 'Product catalog and management' },
    { name: 'Documents', description: 'Document upload and management' },
    { name: 'Compliance', description: 'Compliance checks and status' },
    { name: 'Notifications', description: 'Notification management' },
    { name: 'Admin', description: 'Administrative operations' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT token obtained from /auth/login',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string', description: 'Error type' },
          message: { type: 'string', description: 'Human-readable error message' },
          details: { type: 'object', description: 'Additional error details' },
        },
        required: ['error', 'message'],
      },
      PaginatedResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: { type: 'array', items: {} },
          total: { type: 'integer' },
          page: { type: 'integer' },
          limit: { type: 'integer' },
          totalPages: { type: 'integer' },
        },
      },
      User: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          email: { type: 'string', format: 'email' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          role: { type: 'string', enum: ['ADMIN', 'MERCHANT', 'CONSUMER'] },
          organizationId: { type: 'string' },
          isActive: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      Product: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          name: { type: 'string' },
          sku: { type: 'string' },
          description: { type: 'string' },
          category: {
            type: 'string',
            enum: ['FLOWER', 'EDIBLE', 'CONCENTRATE', 'TOPICAL', 'TINCTURE', 'PRE_ROLL', 'ACCESSORY', 'OTHER'],
          },
          price: { type: 'number' },
          quantity: { type: 'integer' },
          thcContent: { type: 'number' },
          cbdContent: { type: 'number' },
          complianceStatus: {
            type: 'string',
            enum: ['PENDING', 'COMPLIANT', 'NON_COMPLIANT', 'UNDER_REVIEW'],
          },
          organizationId: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      Organization: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          name: { type: 'string' },
          type: {
            type: 'string',
            enum: ['MERCHANT', 'VENDOR', 'DISPENSARY', 'CULTIVATOR', 'MANUFACTURER'],
          },
          licenseNumber: { type: 'string' },
          licenseState: { type: 'string' },
          isVerified: { type: 'boolean' },
          isActive: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 },
        },
      },
      LoginResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          accessToken: { type: 'string' },
          refreshToken: { type: 'string' },
          user: { $ref: '#/components/schemas/User' },
        },
      },
      RegisterRequest: {
        type: 'object',
        required: ['email', 'password', 'role'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 },
          role: { type: 'string', enum: ['MERCHANT', 'CONSUMER'] },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
        },
      },
      CreateProductRequest: {
        type: 'object',
        required: ['name', 'sku', 'category', 'price'],
        properties: {
          name: { type: 'string', maxLength: 200 },
          sku: { type: 'string', maxLength: 50 },
          description: { type: 'string', maxLength: 2000 },
          category: { type: 'string' },
          price: { type: 'number', minimum: 0 },
          quantity: { type: 'integer', minimum: 0 },
          thcContent: { type: 'number', minimum: 0, maximum: 100 },
          cbdContent: { type: 'number', minimum: 0, maximum: 100 },
          strain: { type: 'string' },
          strainType: { type: 'string', enum: ['INDICA', 'SATIVA', 'HYBRID'] },
        },
      },
    },
    responses: {
      Unauthorized: {
        description: 'Authentication required',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: {
              error: 'Unauthorized',
              message: 'Authentication required',
            },
          },
        },
      },
      Forbidden: {
        description: 'Insufficient permissions',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: {
              error: 'Forbidden',
              message: 'Insufficient permissions for this operation',
            },
          },
        },
      },
      NotFound: {
        description: 'Resource not found',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: {
              error: 'Not Found',
              message: 'The requested resource was not found',
            },
          },
        },
      },
      ValidationError: {
        description: 'Validation failed',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: {
              error: 'Validation Error',
              message: 'Request validation failed',
              details: { field: 'error message' },
            },
          },
        },
      },
    },
  },
  paths: {
    // Authentication
    '/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Login',
        description: 'Authenticate with email and password',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginRequest' },
            },
          },
        },
        responses: {
          200: {
            description: 'Successful login',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/LoginResponse' },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/auth/register': {
      post: {
        tags: ['Authentication'],
        summary: 'Register',
        description: 'Register a new user account',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RegisterRequest' },
            },
          },
        },
        responses: {
          201: {
            description: 'User registered successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/LoginResponse' },
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
        },
      },
    },
    '/auth/refresh': {
      post: {
        tags: ['Authentication'],
        summary: 'Refresh token',
        description: 'Get a new access token using a refresh token',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['refreshToken'],
                properties: {
                  refreshToken: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Token refreshed',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    accessToken: { type: 'string' },
                    refreshToken: { type: 'string' },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    
    // Products
    '/products': {
      get: {
        tags: ['Products'],
        summary: 'List products',
        description: 'Get a paginated list of products',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, maximum: 100 } },
          { name: 'category', in: 'query', schema: { type: 'string' } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'complianceStatus', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          200: {
            description: 'List of products',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/PaginatedResponse' },
                    {
                      properties: {
                        data: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/Product' },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
      post: {
        tags: ['Products'],
        summary: 'Create product',
        description: 'Create a new product',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateProductRequest' },
            },
          },
        },
        responses: {
          201: {
            description: 'Product created',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { $ref: '#/components/schemas/Product' },
                  },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/products/{id}': {
      get: {
        tags: ['Products'],
        summary: 'Get product',
        description: 'Get a product by ID',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: {
            description: 'Product details',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { $ref: '#/components/schemas/Product' },
                  },
                },
              },
            },
          },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      patch: {
        tags: ['Products'],
        summary: 'Update product',
        description: 'Update an existing product',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateProductRequest' },
            },
          },
        },
        responses: {
          200: {
            description: 'Product updated',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { $ref: '#/components/schemas/Product' },
                  },
                },
              },
            },
          },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      delete: {
        tags: ['Products'],
        summary: 'Delete product',
        description: 'Delete a product',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: {
            description: 'Product deleted',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    message: { type: 'string' },
                  },
                },
              },
            },
          },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/products/bulk-import/csv': {
      post: {
        tags: ['Products'],
        summary: 'Bulk import from CSV',
        description: 'Import multiple products from CSV data',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['csvData'],
                properties: {
                  csvData: { type: 'string', description: 'CSV content as a string' },
                  skipDuplicates: { type: 'boolean', default: false },
                  updateExisting: { type: 'boolean', default: false },
                  validateOnly: { type: 'boolean', default: false },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Import results',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    totalRows: { type: 'integer' },
                    successCount: { type: 'integer' },
                    errorCount: { type: 'integer' },
                    errors: { type: 'array' },
                    imported: { type: 'array' },
                  },
                },
              },
            },
          },
        },
      },
    },
    
    // Organizations
    '/organizations': {
      get: {
        tags: ['Organizations'],
        summary: 'List organizations',
        description: 'Get a list of organizations (admin sees all, others see their own)',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'List of organizations',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/PaginatedResponse' },
              },
            },
          },
        },
      },
      post: {
        tags: ['Organizations'],
        summary: 'Create organization',
        description: 'Create a new organization',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'type'],
                properties: {
                  name: { type: 'string' },
                  type: { type: 'string' },
                  licenseNumber: { type: 'string' },
                  licenseState: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Organization created',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { $ref: '#/components/schemas/Organization' },
                  },
                },
              },
            },
          },
        },
      },
    },
    
    // Health
    '/health': {
      get: {
        tags: ['System'],
        summary: 'Health check',
        description: 'Simple health check endpoint',
        responses: {
          200: {
            description: 'Service is healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', enum: ['ok'] },
                    service: { type: 'string' },
                    timestamp: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/version': {
      get: {
        tags: ['System'],
        summary: 'API version info',
        description: 'Get information about supported API versions',
        responses: {
          200: {
            description: 'Version information',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    currentVersion: { type: 'string' },
                    supportedVersions: { type: 'array', items: { type: 'string' } },
                    deprecatedVersions: { type: 'array', items: { type: 'string' } },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

/**
 * OpenAPI Plugin
 * 
 * Serves OpenAPI specification and documentation UI
 */
const openApiPlugin: FastifyPluginAsync = async (app: FastifyInstance) => {
  // Serve OpenAPI JSON spec
  app.get('/openapi.json', async (request, reply) => {
    reply.header('Content-Type', 'application/json');
    return openApiSpec;
  });
  
  // Serve OpenAPI YAML spec (optional)
  app.get('/openapi.yaml', async (request, reply) => {
    reply.header('Content-Type', 'text/yaml');
    // Simple YAML serialization (for production, use a proper YAML library)
    return JSON.stringify(openApiSpec, null, 2);
  });
  
  // Serve Swagger UI HTML
  app.get('/docs', async (request, reply) => {
    reply.header('Content-Type', 'text/html');
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Veridex API Documentation</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui.css" />
  <style>
    body { margin: 0; padding: 0; }
    .topbar { display: none; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-bundle.js"></script>
  <script>
    window.onload = () => {
      window.ui = SwaggerUIBundle({
        url: '/openapi.json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIBundle.SwaggerUIStandalonePreset
        ],
        layout: "BaseLayout",
        persistAuthorization: true,
      });
    };
  </script>
</body>
</html>
    `;
  });
  
  // Serve ReDoc as alternative UI
  app.get('/redoc', async (request, reply) => {
    reply.header('Content-Type', 'text/html');
    return `
<!DOCTYPE html>
<html>
<head>
  <title>Veridex API Documentation</title>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link href="https://fonts.googleapis.com/css?family=Montserrat:300,400,700|Roboto:300,400,700" rel="stylesheet">
  <style>
    body { margin: 0; padding: 0; }
  </style>
</head>
<body>
  <redoc spec-url='/openapi.json'></redoc>
  <script src="https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js"></script>
</body>
</html>
    `;
  });
};

export default fp(openApiPlugin, {
  name: 'openapi',
  fastify: '4.x',
});
