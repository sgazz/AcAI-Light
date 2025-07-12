# AcAIA - Docker Management Makefile

.PHONY: help build build-dev up up-dev down down-dev logs logs-dev clean clean-dev restart restart-dev status status-dev

# Default target
help:
	@echo "🚀 AcAIA Docker Management Commands:"
	@echo ""
	@echo "📦 Build Commands:"
	@echo "  build      - Build production Docker images"
	@echo "  build-dev  - Build development Docker images"
	@echo "  prod-build - Build production images with monitoring"
	@echo ""
	@echo "▶️  Start Commands:"
	@echo "  up         - Start production services"
	@echo "  up-dev     - Start development services"
	@echo "  prod-up    - Start production services with monitoring"
	@echo ""
	@echo "⏹️  Stop Commands:"
	@echo "  down       - Stop production services"
	@echo "  down-dev   - Stop development services"
	@echo "  prod-down  - Stop production services"
	@echo ""
	@echo "📊 Monitoring Commands:"
	@echo "  logs       - Show production logs"
	@echo "  logs-dev   - Show development logs"
	@echo "  prod-logs  - Show production logs"
	@echo "  status     - Show production status"
	@echo "  status-dev - Show development status"
	@echo "  prod-status- Show production status"
	@echo ""
	@echo "🔄 Restart Commands:"
	@echo "  restart    - Restart production services"
	@echo "  restart-dev- Restart development services"
	@echo "  prod-restart- Restart production services"
	@echo ""
	@echo "🧪 Test Commands:"
	@echo "  test       - Run all tests"
	@echo "  test-backend - Run backend tests only"
	@echo "  test-frontend- Run frontend tests only"
	@echo "  test-integration- Run integration tests"
	@echo "  test-e2e   - Run E2E tests"
	@echo "  test-clean - Clean test containers"
	@echo ""
	@echo "🧹 Clean Commands:"
	@echo "  clean      - Clean production containers and images"
	@echo "  clean-dev  - Clean development containers and images"

# Build commands
build:
	@echo "🔨 Building production Docker images..."
	docker-compose build

build-dev:
	@echo "🔨 Building development Docker images..."
	docker-compose -f docker-compose.dev.yml build

# Start commands
up:
	@echo "🚀 Starting production services..."
	docker-compose up -d
	@echo "✅ Production services started!"
	@echo "📱 Frontend: http://localhost:3000"
	@echo "🔧 Backend: http://localhost:8001"
	@echo "📊 Health: http://localhost:8001/health"

up-dev:
	@echo "🚀 Starting development services..."
	docker-compose -f docker-compose.dev.yml up -d
	@echo "✅ Development services started!"
	@echo "📱 Frontend: http://localhost:3000 (hot reload)"
	@echo "🔧 Backend: http://localhost:8001 (hot reload)"
	@echo "📊 Health: http://localhost:8001/health"

# Stop commands
down:
	@echo "⏹️  Stopping production services..."
	docker-compose down

down-dev:
	@echo "⏹️  Stopping development services..."
	docker-compose -f docker-compose.dev.yml down

# Log commands
logs:
	@echo "📊 Production logs:"
	docker-compose logs -f

logs-dev:
	@echo "📊 Development logs:"
	docker-compose -f docker-compose.dev.yml logs -f

# Status commands
status:
	@echo "📊 Production status:"
	docker-compose ps

status-dev:
	@echo "📊 Development status:"
	docker-compose -f docker-compose.dev.yml ps

# Restart commands
restart:
	@echo "🔄 Restarting production services..."
	docker-compose restart

restart-dev:
	@echo "🔄 Restarting development services..."
	docker-compose -f docker-compose.dev.yml restart

# Clean commands
clean:
	@echo "🧹 Cleaning production containers and images..."
	docker-compose down --rmi all --volumes --remove-orphans
	docker system prune -f

clean-dev:
	@echo "🧹 Cleaning development containers and images..."
	docker-compose -f docker-compose.dev.yml down --rmi all --volumes --remove-orphans
	docker system prune -f

# Quick commands
quick-start:
	@echo "⚡ Quick start - building and running development environment..."
	$(MAKE) build-dev
	$(MAKE) up-dev

quick-stop:
	@echo "⚡ Quick stop - stopping all services..."
	$(MAKE) down
	$(MAKE) down-dev

# Test commands
test:
	@echo "🧪 Running all tests..."
	docker-compose -f docker-compose.test.yml up --abort-on-container-exit

test-backend:
	@echo "🧪 Running backend tests..."
	docker-compose -f docker-compose.test.yml up backend-tests --abort-on-container-exit

test-frontend:
	@echo "🧪 Running frontend tests..."
	docker-compose -f docker-compose.test.yml up frontend-tests --abort-on-container-exit

test-integration:
	@echo "🧪 Running integration tests..."
	docker-compose -f docker-compose.test.yml up integration-tests --abort-on-container-exit

test-e2e:
	@echo "🧪 Running E2E tests..."
	docker-compose -f docker-compose.test.yml up e2e-tests --abort-on-container-exit

test-clean:
	@echo "🧹 Cleaning test containers..."
	docker-compose -f docker-compose.test.yml down -v

# Health check
health:
	@echo "🏥 Checking service health..."
	@echo "Backend health:"
	@curl -f http://localhost:8001/health || echo "❌ Backend not responding"
	@echo "Frontend health:"
	@curl -f http://localhost:3000 || echo "❌ Frontend not responding"

# Database commands
db-reset:
	@echo "🗄️  Resetting database..."
	docker-compose down -v
	docker-compose up -d postgres
	@echo "⏳ Waiting for database to start..."
	@sleep 10
	@echo "✅ Database reset complete"

# Backup commands
backup:
	@echo "💾 Creating backup..."
	@mkdir -p backups
	@docker-compose exec postgres pg_dump -U acaia_user acaia > backups/backup_$(shell date +%Y%m%d_%H%M%S).sql
	@echo "✅ Backup created in backups/ directory"

# Production commands
prod-build:
	@echo "🏭 Building production images..."
	docker-compose -f docker-compose.prod.yml build

prod-up:
	@echo "🚀 Starting production services..."
	docker-compose -f docker-compose.prod.yml up -d
	@echo "✅ Production services started!"
	@echo "📱 Frontend: http://localhost:3000"
	@echo "🔧 Backend: http://localhost:8001"
	@echo "📊 Prometheus: http://localhost:9090"
	@echo "📈 Grafana: http://localhost:3001"

prod-down:
	@echo "⏹️  Stopping production services..."
	docker-compose -f docker-compose.prod.yml down

prod-logs:
	@echo "📊 Production logs:"
	docker-compose -f docker-compose.prod.yml logs -f

prod-status:
	@echo "📊 Production status:"
	docker-compose -f docker-compose.prod.yml ps

prod-restart:
	@echo "🔄 Restarting production services..."
	docker-compose -f docker-compose.prod.yml restart

# Update commands
update:
	@echo "🔄 Updating services..."
	git pull
	$(MAKE) build
	$(MAKE) restart
	@echo "✅ Services updated!" 