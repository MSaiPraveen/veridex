# Veridex Development Setup Guide

## Running Services Overview

### Frontend Applications

| Application | URL | Port | Description |
|-------------|-----|------|-------------|
| **Public Dashboard** | http://localhost:3000 | 3000 | Consumer/Merchant facing dashboard |
| **Admin Portal** | http://localhost:4000 | 4000 | Internal admin management portal |

### Backend Services (Docker)

| Service | URL | Port | Description |
|---------|-----|------|-------------|
| **API Gateway** | http://localhost:3002 | 3002 | Main API entry point |
| **Auth Service** | http://localhost:3001 | 3001 | Authentication & JWT management |
| **User/Org Service** | http://localhost:3003 | 3003 | User & organization management |
| **Product Service** | http://localhost:3004 | 3004 | Product catalog management |
| **Document Service** | http://localhost:3005 | 3005 | Document upload & processing |
| **Compliance Service** | http://localhost:3006 | 3006 | Compliance workflow engine |
| **Notification Service** | http://localhost:3007 | 3007 | Email/SMS notifications |
| **Audit Log Service** | http://localhost:3008 | 3008 | Audit trail & logging |

### Infrastructure (Docker)

| Service | URL | Port | Description |
|---------|-----|------|-------------|
| **Redis** | localhost:6379 | 6379 | Session caching & rate limiting |
| **Kafka** | localhost:9092 | 9092 | Event streaming |
| **Zookeeper** | localhost:2181 | 2181 | Kafka coordination |

---

## Quick Start Commands

### Start Backend (Docker)
```powershell
cd c:\Users\saipr\ReactApps\veridex
docker-compose up -d
```

### Start Public Frontend
```powershell
cd c:\Users\saipr\ReactApps\veridex\apps\frontend-dashboard
npm run dev
```

### Start Admin Portal
```powershell
cd c:\Users\saipr\ReactApps\veridex\apps\admin-portal
npm run dev
```

### Stop All Docker Services
```powershell
cd c:\Users\saipr\ReactApps\veridex
docker-compose down
```

### View Docker Logs
```powershell
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api-gateway
docker-compose logs -f auth-service
```

---

## Sample Test Credentials

### Public Dashboard (Consumer/Merchant)

#### Consumer Account
```json
{
  "email": "consumer@example.com",
  "password": "Consumer123!",
  "role": "CONSUMER"
}
```

#### Merchant Account
```json
{
  "email": "merchant@example.com", 
  "password": "Merchant123!",
  "role": "MERCHANT",
  "organization": "Sample Merchant LLC"
}
```

### Admin Portal

#### Super Admin (Full Access)
```json
{
  "email": "superadmin@veridex.com",
  "password": "SuperAdmin123!",
  "role": "SUPER_ADMIN",
  "mfaEnabled": true,
  "permissions": ["*"]
}
```

#### Admin (Operations)
```json
{
  "email": "admin@veridex.com",
  "password": "Admin123!",
  "role": "ADMIN",
  "mfaEnabled": true,
  "permissions": [
    "org.read", "org.review", "org.approve", "org.suspend",
    "doc.read", "doc.review", "doc.approve",
    "product.read", "product.review",
    "compliance.read", "compliance.review"
  ]
}
```

#### Compliance Reviewer
```json
{
  "email": "reviewer@veridex.com",
  "password": "Reviewer123!",
  "role": "COMPLIANCE_REVIEWER",
  "mfaEnabled": true,
  "permissions": [
    "doc.read", "doc.review",
    "compliance.read", "compliance.review", "compliance.approve"
  ]
}
```

#### Viewer (Read-Only)
```json
{
  "email": "viewer@veridex.com",
  "password": "Viewer123!",
  "role": "VIEWER",
  "mfaEnabled": false,
  "permissions": [
    "org.read", "doc.read", "product.read", 
    "compliance.read", "audit.read"
  ]
}
```

---

## API Testing Examples

### Health Check
```bash
curl http://localhost:3002/health
```

### Public Auth - Register Consumer
```bash
curl -X POST http://localhost:3002/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "Password123!",
    "firstName": "John",
    "lastName": "Doe",
    "role": "CONSUMER"
  }'
```

### Public Auth - Login
```bash
curl -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "consumer@example.com",
    "password": "Consumer123!"
  }'
```

### Admin Auth - Login
```bash
curl -X POST http://localhost:3002/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "superadmin@veridex.com",
    "password": "SuperAdmin123!"
  }'
```

### Admin Auth - Verify MFA
```bash
curl -X POST http://localhost:3002/api/admin/auth/mfa/verify \
  -H "Content-Type: application/json" \
  -d '{
    "sessionToken": "<mfa_session_token>",
    "code": "123456"
  }'
```

### Get Organizations (Admin)
```bash
curl http://localhost:3002/api/admin/organizations \
  -H "Authorization: Bearer <admin_access_token>"
```

### Get Compliance Queue (Admin)
```bash
curl http://localhost:3002/api/admin/workflows/queue \
  -H "Authorization: Bearer <admin_access_token>"
```

---

## Sample Data for Testing

### Sample Organization
```json
{
  "name": "Acme Pharmaceuticals",
  "type": "MERCHANT",
  "status": "PENDING_VERIFICATION",
  "businessDetails": {
    "legalName": "Acme Pharmaceuticals Inc.",
    "registrationNumber": "REG-2024-001234",
    "taxId": "12-3456789",
    "industry": "Pharmaceuticals",
    "address": {
      "street": "123 Pharma Lane",
      "city": "Boston",
      "state": "MA",
      "postalCode": "02101",
      "country": "USA"
    }
  },
  "contacts": {
    "primary": {
      "name": "Jane Smith",
      "email": "jane.smith@acmepharma.com",
      "phone": "+1-555-123-4567"
    }
  }
}
```

### Sample Product
```json
{
  "name": "CardioGuard Pro",
  "sku": "CG-PRO-2024",
  "category": "Medical Device",
  "status": "PENDING_COMPLIANCE",
  "manufacturer": "Acme Pharmaceuticals",
  "description": "Advanced cardiac monitoring device",
  "complianceInfo": {
    "fdaApprovalNumber": "K241234",
    "ceMarking": true,
    "isoCompliant": true
  }
}
```

### Sample Document
```json
{
  "type": "FDA_APPROVAL",
  "name": "FDA 510(k) Clearance Letter",
  "status": "PENDING_REVIEW",
  "uploadedBy": "merchant-user-id",
  "organizationId": "org-id",
  "productId": "product-id",
  "metadata": {
    "approvalNumber": "K241234",
    "approvalDate": "2024-06-15",
    "expiryDate": "2029-06-15"
  }
}
```

---

## Database Connection (MongoDB Atlas)

The application uses MongoDB Atlas. Connection strings are configured in docker-compose.yml environment variables.

**Databases:**
- `veridex-auth` - Authentication & admin users
- `veridex-users` - User & organization data
- `veridex-products` - Product catalog
- `veridex-documents` - Document metadata
- `veridex-compliance` - Compliance workflows
- `veridex-notifications` - Notification templates & logs
- `veridex-audit` - Audit trail

---

## Troubleshooting

### Docker Services Not Starting
```powershell
# Check logs for specific service
docker-compose logs auth-service

# Restart all services
docker-compose down
docker-compose up -d
```

### Frontend Build Errors
```powershell
# Clear node_modules and reinstall
cd apps/frontend-dashboard
Remove-Item -Recurse -Force node_modules
npm install
npm run dev
```

### Port Already in Use
```powershell
# Find and kill process on port
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Kafka Connection Issues
```powershell
# Ensure Kafka is healthy
docker-compose logs kafka
docker-compose restart kafka
```
