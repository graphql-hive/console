#/bin/sh
set -e

echo "💀 Killing all running Docker containers..."
docker kill $(docker ps -q) || true

echo "🧹 Clearing existing Docker volumes..."
rm -rf ../docker/.hive || true

echo "🧹 Clearing old artifacts..."
rm -rf ../packages/migrations/dist || true

echo "✨ Clearing unused Docker images and volumes..."
docker system prune -f

echo "🔨 Build services and libraries for running locally..."
pnpm prepare:env

echo "🌲 Configuring environment variables..."
export COMMIT_SHA="local"
export RELEASE="local"
export BRANCH_NAME="local"
export BUILD_TYPE=""
export DOCKER_TAG=":local"
export DOCKER_REGISTRY=""

echo "📦 Building local Docker images..."
cd ..
docker buildx bake -f docker/docker.hcl integration-tests --load

echo "⬆️ Running all local containers..."
docker compose -f ./docker/docker-compose.community.yml -f ./integration-tests/docker-compose.integration.yaml --env-file ./integration-tests/.env up -d --build --wait

echo "✅ Integration tests environment is ready. To run tests now, use:"
echo ""
echo "    pnpm test:integration"
