# Veridex Local Infrastructure

Local development environment using Docker Compose.

## Prerequisites

- Docker Desktop installed and running
- Sufficient memory allocated (at least 4GB recommended)

## Quick Start

### 1. Start Dependencies

```bash
# Start MongoDB
docker compose -f mongo.yml up -d

# Start Kafka (optional, for event-driven flows)
docker compose -f kafka.yml up -d
```

### 2. Verify Dependencies

```bash
# Check containers are running
docker ps

# Test MongoDB connection
docker exec veridex-mongo mongosh --eval "db.adminCommand('ping')"
```

### 3. Start Services

```bash
# Build and start all services
docker compose -f services.yml up --build

# Or run in detached mode
docker compose -f services.yml up --build -d
```

## Service Ports

| Service              | Port |
|----------------------|------|
| API Gateway          | 3000 |
| Auth Service         | 3001 |
| User-Org Service     | 3003 |
| Product Service      | 3004 |
| Document Service     | 3005 |
| Compliance Service   | 3006 |
| Notification Service | 3007 |
| Audit Log Service    | 3008 |
| MongoDB              | 27017|
| Kafka                | 9092 |
| Zookeeper            | 2181 |

## Database Access

MongoDB creates databases lazily. Each service connects to its own database:

- `veridex-auth`
- `veridex-user-org`
- `veridex-products`
- `veridex-documents`
- `veridex-compliance`
- `veridex-notifications`
- `veridex-audit`

## Stopping Services

```bash
# Stop services
docker compose -f services.yml down

# Stop dependencies
docker compose -f kafka.yml down
docker compose -f mongo.yml down

# Remove volumes (WARNING: deletes all data)
docker compose -f mongo.yml down -v
```

## Logs

```bash
# All services
docker compose -f services.yml logs -f

# Specific service
docker compose -f services.yml logs -f auth-service
```

## Troubleshooting

### Port already in use
Stop conflicting processes or change ports in the yml files.

### MongoDB connection refused
Ensure mongo.yml is running before starting services.

### Services can't find each other
When running locally, services connect to `localhost`. 
For inter-container communication, use Docker networks.
