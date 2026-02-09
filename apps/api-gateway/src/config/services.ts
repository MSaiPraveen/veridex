// For local development, use localhost. For Docker, use container names.
const isDocker = process.env.DOCKER_ENV === 'true';

function serviceUrl(name: string, port: number): string {
  return isDocker 
    ? `http://${name}:${port}` 
    : `http://localhost:${port}`;
}

export const services = {
  auth: serviceUrl('auth-service', 3001),
  audit: serviceUrl('audit-log-service', 3008),  // Fixed: was 3002, should be 3008
  userOrg: serviceUrl('user-org-service', 3003),
  product: serviceUrl('product-service', 3004),
  document: serviceUrl('document-service', 3005),
  compliance: serviceUrl('compliance-service', 3006),
  notification: serviceUrl('notification-service', 3007),
};
