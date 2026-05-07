#/bin/sh

echo "Killing all running Docker containers..."
docker kill $(docker ps -q)

echo "Clearing existing Docker volumes..."
rm -rf ../docker/.hive || true

echo "Clearing unused Docker images and volumes..."
docker system prune -f

echo "Build services and libraries for running locally..."
pnpm build

echo "Configuring environment variables..."
export COMMIT_SHA="local"
export RELEASE="local"
export BRANCH_NAME="local"
export BUILD_TYPE=""
export DOCKER_TAG=":local"
export DOCKER_REGISTRY=""

echo "Building local Docker images..."
cd ..
docker buildx bake -f docker/docker.hcl build --load

echo "Running all local containers..."
docker compose -f ./docker/docker-compose.community.yml -f ./docker/docker-compose.end2end.yml --env-file ./integration-tests/.env up -d --wait

echo "E2E tests environment is ready. To run tests now, use:"
echo ""
echo "    HIVE_APP_BASE_URL=http://localhost:8080 pnpm test:e2e"
echo ""
echo "    or to open Playwright UI:"
echo ""
echo "    HIVE_APP_BASE_URL=http://localhost:8080 pnpm test:e2e:open"
