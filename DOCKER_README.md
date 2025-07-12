# 🐳 AcAIA Docker Setup

Ovaj dokument objašnjava kako pokrenuti AcAIA aplikaciju koristeći Docker.

## 📋 Preduslovi

- Docker (20.10+)
- Docker Compose (2.0+)
- Make (opciono, za lakše upravljanje)

## 🚀 Brzi Start

### 1. Kloniranje repozitorijuma
```bash
git clone <repository-url>
cd AcAIA
```

### 2. Postavljanje environment varijabli
```bash
# Kopirajte example fajl
cp backend/env.example .env

# Uredite .env fajl sa vašim podešavanjima
nano .env
```

### 3. Pokretanje aplikacije
```bash
# Development (preporučeno za prvi put)
make quick-start

# Ili production
make build
make up
```

## 📁 Struktura Docker Fajlova

```
AcAIA/
├── Dockerfile              # Production Docker image
├── Dockerfile.dev          # Development Docker image
├── docker-compose.yml      # Production services
├── docker-compose.dev.yml  # Development services
├── start.sh               # Production start script
├── start-dev.sh           # Development start script
├── .dockerignore          # Docker ignore rules
├── Makefile               # Management commands
├── nginx/
│   └── nginx.conf         # Nginx reverse proxy
└── DOCKER_README.md       # Ovaj fajl
```

## 🛠️ Komande

### Osnovne komande (Makefile)

```bash
# Pomoć
make help

# Build
make build          # Production build
make build-dev      # Development build

# Start
make up             # Start production
make up-dev         # Start development

# Stop
make down           # Stop production
make down-dev       # Stop development

# Logs
make logs           # Production logs
make logs-dev       # Development logs

# Status
make status         # Production status
make status-dev     # Development status

# Restart
make restart        # Restart production
make restart-dev    # Restart development

# Clean
make clean          # Clean production
make clean-dev      # Clean development

# Quick commands
make quick-start    # Build and start development
make quick-stop     # Stop all services
make health         # Health check
```

### Docker Compose komande

```bash
# Production
docker-compose up -d
docker-compose down
docker-compose logs -f

# Development
docker-compose -f docker-compose.dev.yml up -d
docker-compose -f docker-compose.dev.yml down
docker-compose -f docker-compose.dev.yml logs -f
```

## 🌐 Pristup aplikaciji

Nakon pokretanja, aplikacija je dostupna na:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8001
- **Health Check**: http://localhost:8001/health
- **Nginx Proxy**: http://localhost:80 (ako je pokrenut)

## 🔧 Konfiguracija

### Environment varijable

Kreirajte `.env` fajl na osnovu `backend/env.example`:

```bash
# Database
DATABASE_URL=postgresql://acaia_user:acaia_password@localhost:5432/acaia

# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key

# AI Services
OLLAMA_BASE_URL=http://localhost:11434
OPENAI_API_KEY=your_openai_key

# Security
SECRET_KEY=your_secret_key
```

### Portovi

- **3000**: Frontend (Next.js)
- **8001**: Backend (FastAPI)
- **5432**: PostgreSQL
- **6379**: Redis
- **80**: Nginx (HTTP)
- **443**: Nginx (HTTPS)

## 📊 Monitoring

### Health Checks

```bash
# Provera zdravlja servisa
make health

# Ili direktno
curl http://localhost:8001/health
curl http://localhost:3000
```

### Logovi

```bash
# Svi logovi
make logs

# Specifični servis
docker-compose logs backend
docker-compose logs frontend
```

### Status servisa

```bash
make status
```

## 🗄️ Baza podataka

### Reset baze

```bash
make db-reset
```

### Backup

```bash
make backup
```

### Pristup bazi

```bash
# Kroz Docker
docker-compose exec postgres psql -U acaia_user -d acaia

# Direktno
psql -h localhost -p 5432 -U acaia_user -d acaia
```

## 🔄 Development

### Hot Reload

Development verzija podržava hot reload:

- **Backend**: Automatski restart na promene u Python fajlovima
- **Frontend**: Automatski refresh na promene u React komponentama

### Debugging

```bash
# Pristup container-u
docker-compose exec backend bash
docker-compose exec frontend bash

# Logovi u realnom vremenu
docker-compose logs -f backend
```

## 🚀 Production Deployment

### 1. Build production image

```bash
make build
```

### 2. Postavljanje environment varijabli

```bash
# Production .env
cp backend/env.example .env.prod
nano .env.prod
```

### 3. Pokretanje

```bash
make up
```

### 4. SSL/HTTPS (opciono)

Uncomment SSL sekciju u `nginx/nginx.conf` i dodajte sertifikate u `nginx/ssl/`.

## 🧹 Održavanje

### Čišćenje

```bash
# Čišćenje svih container-a i image-a
make clean

# Čišćenje samo development
make clean-dev
```

### Update

```bash
make update
```

### Backup i restore

```bash
# Backup
make backup

# Restore (ručno)
docker-compose exec postgres psql -U acaia_user -d acaia < backup_file.sql
```

## 🐛 Troubleshooting

### Česti problemi

1. **Portovi zauzeti**
   ```bash
   # Proverite koji procesi koriste portove
   lsof -i :3000
   lsof -i :8001
   ```

2. **Permission problemi**
   ```bash
   # Dajte prava na fajlove
   chmod +x start.sh start-dev.sh
   ```

3. **Memory problemi**
   ```bash
   # Povećajte Docker memory limit
   # Docker Desktop -> Settings -> Resources -> Memory
   ```

4. **Database connection**
   ```bash
   # Proverite da li je baza pokrenuta
   docker-compose ps postgres
   ```

### Debug mode

```bash
# Pokretanje sa debug logovima
DEBUG=1 docker-compose up
```

## 📞 Podrška

Za probleme sa Docker setup-om:

1. Proverite logove: `make logs`
2. Proverite status: `make status`
3. Proverite health: `make health`
4. Restart servisa: `make restart`

## 🔗 Korisni linkovi

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Next.js Documentation](https://nextjs.org/docs) 