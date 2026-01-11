# Veridex Kubernetes Deployment

Production-grade Kubernetes manifests for the Veridex platform.

## Prerequisites

- Kubernetes cluster (1.25+)
- kubectl configured
- NGINX Ingress Controller installed
- Container registry with built images

## Deployment Order

```bash
# 1. Create namespace and base infrastructure
kubectl apply -f base/

# 2. Create secrets and configuration
kubectl apply -f config/

# 3. Deploy services
kubectl apply -f services/
```

## Verify Deployment

```bash
# Check all resources in veridex namespace
kubectl get all -n veridex

# Check pods are running
kubectl get pods -n veridex

# Check services
kubectl get svc -n veridex

# View logs
kubectl logs -n veridex deployment/auth-service
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Ingress                              │
│                    api.veridex.local                         │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Gateway                             │
│                       (port 3000)                            │
└─────────────────────┬───────────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┬─────────────┐
        ▼             ▼             ▼             ▼
   ┌─────────┐  ┌──────────┐  ┌─────────┐  ┌──────────┐
   │  Auth   │  │ User-Org │  │ Product │  │ Document │
   │ :3001   │  │  :3003   │  │  :3004  │  │  :3005   │
   └────┬────┘  └────┬─────┘  └────┬────┘  └────┬─────┘
        │            │             │             │
        └────────────┴─────────────┴─────────────┘
                           │
                    ┌──────┴──────┐
                    ▼             ▼
               ┌────────┐   ┌─────────┐
               │ Kafka  │   │ MongoDB │
               │ :9092  │   │ (Atlas) │
               └────────┘   └─────────┘
```

## Service Ports

| Service              | Port | Replicas |
|----------------------|------|----------|
| API Gateway          | 3000 | 2        |
| Auth Service         | 3001 | 2        |
| User-Org Service     | 3003 | 2        |
| Product Service      | 3004 | 2        |
| Document Service     | 3005 | 2        |
| Compliance Service   | 3006 | 2        |
| Notification Service | 3007 | 1        |
| Audit Log Service    | 3008 | 1        |

## Secrets Management

**WARNING**: The `secrets.yaml` file contains placeholder values.

For production:
1. Use sealed-secrets, external-secrets, or HashiCorp Vault
2. Never commit real secrets to version control
3. Rotate secrets regularly

```bash
# Create secrets from env file (alternative)
kubectl create secret generic veridex-secrets \
  --from-env-file=.env.production \
  -n veridex
```

## Scaling

```bash
# Scale a deployment
kubectl scale deployment auth-service --replicas=3 -n veridex

# Enable HPA (requires metrics-server)
kubectl autoscale deployment product-service \
  --min=2 --max=10 --cpu-percent=70 -n veridex
```

## Troubleshooting

### Pods not starting
```bash
kubectl describe pod <pod-name> -n veridex
kubectl logs <pod-name> -n veridex
```

### Service unreachable
```bash
kubectl get endpoints -n veridex
kubectl exec -it <pod> -n veridex -- curl http://auth-service:3001/health
```

### Database connection issues
Check secrets are correctly applied:
```bash
kubectl get secret veridex-secrets -n veridex -o yaml
```

## Local Development with Minikube

```bash
# Start minikube
minikube start --memory=4096 --cpus=2

# Enable ingress
minikube addons enable ingress

# Add to /etc/hosts
echo "$(minikube ip) api.veridex.local app.veridex.local" | sudo tee -a /etc/hosts

# Deploy
kubectl apply -f base/
kubectl apply -f config/
kubectl apply -f services/
```
