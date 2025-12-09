#!/bin/bash
# Quick deployment script for Kubernetes

set -e

NAMESPACE="ojat-production"
DOCKER_USERNAME="${1:-YOUR_DOCKERHUB_USERNAME}"
IMAGE_TAG="${2:-latest}"

echo "🚀 Deploying OJAT to Kubernetes..."
echo "Namespace: $NAMESPACE"
echo "Image: $DOCKER_USERNAME/devops_cat_onlinejob:$IMAGE_TAG"

# Create namespace
echo "📦 Creating namespace..."
kubectl apply -f k8s/namespace.yaml

# Update secrets (you should edit this with real values)
echo "🔐 Creating secrets..."
kubectl create secret generic ojat-secrets \
  --from-literal=DB_PASSWORD='changeme123' \
  --from-literal=JWT_SECRET='your-secret-key-here' \
  -n $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -

# Apply ConfigMap
echo "⚙️  Applying configuration..."
kubectl apply -f k8s/configmap.yaml

# Deploy MySQL
echo "🗄️  Deploying MySQL..."
kubectl apply -f k8s/mysql-deployment.yaml
echo "Waiting for MySQL to be ready..."
kubectl wait --for=condition=ready pod -l app=mysql -n $NAMESPACE --timeout=300s

# Update image in deployment
echo "🔄 Updating deployment image..."
sed "s|YOUR_DOCKERHUB_USERNAME|$DOCKER_USERNAME|g" k8s/app-deployment.yaml | \
sed "s|:latest|:$IMAGE_TAG|g" | kubectl apply -f -

# Wait for rollout
echo "⏳ Waiting for rollout to complete..."
kubectl rollout status deployment/ojat-app -n $NAMESPACE --timeout=5m

# Verify deployment
echo "✅ Verifying deployment..."
kubectl get pods -n $NAMESPACE
kubectl get svc -n $NAMESPACE
kubectl get hpa -n $NAMESPACE

# Get service URL
echo ""
echo "🌐 Service Information:"
LOADBALANCER_IP=$(kubectl get svc ojat-service -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "pending")

if [ "$LOADBALANCER_IP" != "pending" ] && [ -n "$LOADBALANCER_IP" ]; then
  echo "LoadBalancer IP: $LOADBALANCER_IP"
  echo "Application URL: http://$LOADBALANCER_IP"
  echo "Health Check: http://$LOADBALANCER_IP/health"
else
  echo "LoadBalancer IP is still pending. Run this command to check:"
  echo "kubectl get svc ojat-service -n $NAMESPACE"
fi

echo ""
echo "✨ Deployment complete!"
