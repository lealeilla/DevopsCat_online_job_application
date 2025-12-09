# Phase 6: Kubernetes Deployment Guide

## Overview
This deployment configuration implements production-grade Kubernetes deployment with:
- Rolling updates (zero-downtime deployments)
- Horizontal Pod Autoscaling (HPA)
- Resource limits and requests
- Health checks and probes
- LoadBalancer service

## Resource Requirements Calculation

### Application Pod (Node.js)
**Per Pod:**
- **CPU Request**: 250m (0.25 cores)
- **CPU Limit**: 500m (0.5 cores)
- **Memory Request**: 256Mi
- **Memory Limit**: 512Mi

**Calculation for 3 replicas:**
- Total CPU Request: 750m (0.75 cores)
- Total CPU Limit: 1500m (1.5 cores)
- Total Memory Request: 768Mi
- Total Memory Limit: 1.5Gi

**With HPA scaling to 10 replicas (peak load):**
- Total CPU Request: 2500m (2.5 cores)
- Total CPU Limit: 5000m (5 cores)
- Total Memory Request: 2.5Gi
- Total Memory Limit: 5Gi

### MySQL Database
**Single instance:**
- **CPU Request**: 500m (0.5 cores)
- **CPU Limit**: 1000m (1 core)
- **Memory Request**: 512Mi
- **Memory Limit**: 1Gi
- **Storage**: 10Gi PersistentVolume

### Total Cluster Requirements

**Minimum (3 app replicas + 1 MySQL):**
- **CPU**: 1.25 cores (requests), 2.5 cores (limits)
- **Memory**: 1.25Gi (requests), 2.5Gi (limits)
- **Storage**: 10Gi for MySQL

**Peak Load (10 app replicas + 1 MySQL):**
- **CPU**: 3 cores (requests), 6 cores (limits)
- **Memory**: 3Gi (requests), 6Gi (limits)
- **Storage**: 10Gi for MySQL

**Recommended Cluster Size:**
- **3 worker nodes** (2 vCPU, 4GB RAM each) = 6 vCPU, 12GB RAM total
- This provides headroom for system pods and burst capacity

## Deployment Architecture

### Rolling Update Strategy
```yaml
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxSurge: 1        # Add 1 new pod before removing old
    maxUnavailable: 0   # Keep all pods available during update
```

**Benefits:**
- Zero downtime deployments
- Gradual rollout (1 pod at a time)
- Automatic rollback on failure
- Health checks prevent bad deployments

### Horizontal Pod Autoscaler (HPA)
```yaml
minReplicas: 3
maxReplicas: 10
CPU target: 70%
Memory target: 80%
```

**Scaling Behavior:**
- Scale up: Fast (max 100% or 2 pods per 30s)
- Scale down: Gradual (max 50% per 60s, 5min cooldown)

## Prerequisites

### 1. Kubernetes Cluster
You need a Kubernetes cluster. Options:
- **Cloud**: GKE, EKS, AKS
- **Local**: Minikube, Kind, k3s
- **Managed**: DigitalOcean Kubernetes, Linode LKE

### 2. kubectl Configuration
```bash
# Verify kubectl is installed
kubectl version --client

# Configure cluster access
kubectl config use-context YOUR_CLUSTER_CONTEXT

# Verify connection
kubectl cluster-info
```

### 3. GitHub Secrets
Add these secrets to your repository:
- `KUBE_CONFIG`: Base64-encoded kubeconfig file
  ```bash
  cat ~/.kube/config | base64 | pbcopy
  ```
- `DOCKER_USERNAME`: Your Docker Hub username
- `SLACK_WEBHOOK_URL`: (Optional) Slack webhook for notifications

## Deployment Instructions

### Step 1: Update Configuration
Edit `k8s/app-deployment.yaml` and replace:
```yaml
image: YOUR_DOCKERHUB_USERNAME/devops_cat_onlinejob:latest
```
With your actual Docker Hub username.

### Step 2: Create Secrets
```bash
# Create namespace
kubectl apply -f k8s/namespace.yaml

# Update secrets with real values
kubectl create secret generic ojat-secrets \
  --from-literal=DB_PASSWORD='your_secure_password' \
  --from-literal=JWT_SECRET='your_jwt_secret' \
  -n ojat-production --dry-run=client -o yaml | kubectl apply -f -
```

### Step 3: Deploy MySQL
```bash
kubectl apply -f k8s/mysql-deployment.yaml
kubectl wait --for=condition=ready pod -l app=mysql -n ojat-production --timeout=300s
```

### Step 4: Deploy Application
```bash
# Apply ConfigMap
kubectl apply -f k8s/configmap.yaml

# Deploy application
kubectl apply -f k8s/app-deployment.yaml

# Wait for rollout
kubectl rollout status deployment/ojat-app -n ojat-production
```

### Step 5: Verify Deployment
```bash
# Check pods
kubectl get pods -n ojat-production

# Check services
kubectl get svc -n ojat-production

# Check HPA
kubectl get hpa -n ojat-production

# View logs
kubectl logs -f deployment/ojat-app -n ojat-production
```

### Step 6: Access Application
```bash
# Get LoadBalancer IP
kubectl get svc ojat-service -n ojat-production

# Test health endpoint
curl http://LOADBALANCER_IP/health
```

## CI/CD Automated Deployment

### Trigger via Git Tag (Automatic)
```bash
# Create and push a version tag
git tag -a v1.0.1 -m "Release v1.0.1"
git push origin v1.0.1
```

This will:
1. Build Docker image
2. Push to Docker Hub
3. Automatically deploy to Kubernetes
4. Perform rolling update
5. Verify deployment health
6. Rollback on failure

### Manual Deployment via GitHub Actions
1. Go to: https://github.com/YOUR_USERNAME/DevopsCat_online_job_application/actions
2. Select "Deploy to Kubernetes" workflow
3. Click "Run workflow"
4. Choose environment and image tag
5. Click "Run workflow"

## Monitoring Deployment

### Watch Rolling Update
```bash
kubectl rollout status deployment/ojat-app -n ojat-production
kubectl get pods -n ojat-production -w
```

### View Pod Events
```bash
kubectl describe deployment ojat-app -n ojat-production
kubectl describe pod POD_NAME -n ojat-production
```

### Check Resource Usage
```bash
kubectl top nodes
kubectl top pods -n ojat-production
```

## Rollback Procedure

### Automatic Rollback
The deployment workflow automatically rolls back on failure.

### Manual Rollback
```bash
# View rollout history
kubectl rollout history deployment/ojat-app -n ojat-production

# Rollback to previous version
kubectl rollout undo deployment/ojat-app -n ojat-production

# Rollback to specific revision
kubectl rollout undo deployment/ojat-app -n ojat-production --to-revision=2
```

## Scaling

### Manual Scaling
```bash
# Scale to 5 replicas
kubectl scale deployment ojat-app --replicas=5 -n ojat-production
```

### Auto-scaling (HPA)
Automatically enabled. Monitors:
- CPU: Scales when average >70%
- Memory: Scales when average >80%

View HPA status:
```bash
kubectl get hpa ojat-hpa -n ojat-production --watch
```

## Blue-Green Deployment (Alternative)

To implement blue-green deployment:

1. **Create blue and green deployments:**
```bash
# Current production (blue)
kubectl apply -f k8s/app-deployment.yaml

# New version (green)
kubectl apply -f k8s/app-deployment-green.yaml
```

2. **Switch service selector:**
```bash
kubectl patch service ojat-service -n ojat-production -p '{"spec":{"selector":{"version":"v1.1.0"}}}'
```

3. **Rollback if needed:**
```bash
kubectl patch service ojat-service -n ojat-production -p '{"spec":{"selector":{"version":"v1.0.0"}}}'
```

## Ingress Configuration (Optional)

To expose via domain name:

1. Install NGINX Ingress Controller:
```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.2/deploy/static/provider/cloud/deploy.yaml
```

2. Update `k8s/ingress.yaml` with your domain

3. Apply ingress:
```bash
kubectl apply -f k8s/ingress.yaml
```

## Troubleshooting

### Pods not starting
```bash
kubectl describe pod POD_NAME -n ojat-production
kubectl logs POD_NAME -n ojat-production
```

### Database connection issues
```bash
# Check MySQL pod
kubectl logs deployment/mysql -n ojat-production

# Verify service
kubectl get svc mysql-service -n ojat-production

# Test connection from app pod
kubectl exec -it POD_NAME -n ojat-production -- nc -zv mysql-service 3306
```

### LoadBalancer pending
```bash
# Check service events
kubectl describe svc ojat-service -n ojat-production

# Some cloud providers take 2-5 minutes to provision
kubectl get svc ojat-service -n ojat-production --watch
```

## Cost Optimization

### Development/Staging
Reduce resources for non-production:
```yaml
replicas: 1
resources:
  requests:
    memory: "128Mi"
    cpu: "100m"
  limits:
    memory: "256Mi"
    cpu: "200m"
```

### Production
- Use spot/preemptible instances for worker nodes (40-80% cost savings)
- Enable cluster autoscaler
- Set appropriate HPA targets
- Use PersistentVolume with appropriate IOPS

## Security Best Practices

1. **Never commit secrets to Git**
2. **Use Kubernetes Secrets** or external secret managers
3. **Enable RBAC** and limit permissions
4. **Use network policies** to restrict pod communication
5. **Scan images** for vulnerabilities
6. **Keep Kubernetes updated**

## Next Steps

1. Set up monitoring (Prometheus + Grafana)
2. Configure logging (ELK or Loki stack)
3. Implement backup strategy for MySQL
4. Set up alerts for critical metrics
5. Configure SSL/TLS certificates
6. Implement rate limiting and security policies
