# Deployment Guide

This document describes the deployment setup for the Garchen Archive Web UI.

## Overview

The application is deployed to **Digital Ocean App Platform** with three environments. Staging and Production use pre-built Docker images from **Digital Ocean Container Registry (DOCR)**, while Preview environments build from source.

## Architecture

```
GitHub Repository → GitHub Actions → DOCR → Digital Ocean App Platform
                                      ↓
                         [Preview (per PR)] [Staging] [Production]
```

## Environments

### Preview (`garchen-archive-webui-preview-*`)
- **Trigger:** Pull requests to `main` (changes in `web-ui/`)
- **Workflow:** `.github/workflows/deploy-preview.yaml`
- **Build:** Source builds (Dockerfile)
- **Instance:** apps-s-1vcpu-0.5gb
- **Lifecycle:** Temporary, auto-deleted when PR closes

### Staging (`garchen-archive-webui-staging`)
- **Trigger:** Automatic on merge to `main` (changes in `web-ui/`)
- **Workflow:** `.github/workflows/deploy-staging.yaml`
- **Build:** Pre-built DOCR images
- **Instance:** apps-s-1vcpu-1gb
- **Lifecycle:** Persistent

### Production (`garchen-archive-webui-prod`)
- **Trigger:** Manual deployment only
- **Workflow:** `.github/workflows/deploy-production.yaml`
- **Build:** Pre-built DOCR images (same as staging)
- **Instance:** apps-s-1vcpu-1gb
- **Lifecycle:** Persistent

## Workflow

```
┌─────────────┐
│ Local Dev   │
└──────┬──────┘
       │
       ▼
┌─────────────┐     ┌──────────────┐
│ Create PR   │────▶│ Preview Auto │
└──────┬──────┘     │   Deploys    │
       │            └──────────────┘
       │
       ▼
┌─────────────┐
│ Code Review │
└──────┬──────┘
       │
       ▼
┌─────────────┐     ┌──────────────┐
│ Merge to    │────▶│ Staging Auto │
│    main     │     │   Deploys    │
└─────────────┘     └──────┬───────┘
                           │
                           ▼
                    ┌──────────────┐
                    │  Manual      │
                    │  Production  │
                    │  Deploy      │
                    └──────────────┘
```

## Configuration Files

### App Specs (`.do/`)
- `app.yaml` - Production configuration
- `app.staging.yaml` - Staging configuration
- `app.preview.yaml` - Preview configuration

### GitHub Workflows (`.github/workflows/`)
- `deploy-staging.yaml` - Build, push to DOCR, deploy to staging
- `deploy-preview.yaml` - Deploy PR previews
- `deploy-production.yaml` - Manual production deployment
- `delete-preview.yaml` - Cleanup preview apps on PR close

## Required GitHub Secrets

Set these in repository Settings → Secrets and variables → Actions → Secrets.

Create separate environments (`staging`, `production`, `preview`) with their own secrets.

### All Environments

| Secret | Description |
|--------|-------------|
| `DO_ACCESS_TOKEN` | Digital Ocean API token |
| `DO_REGISTRY_NAME` | DOCR registry name (e.g., `garchen-registry`) |

### Per Environment

| Secret | Description | Example |
|--------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db?sslmode=require` |
| `NEXTAUTH_URL` | Base URL for authentication | `https://staging.example.com` |
| `NEXTAUTH_SECRET` | NextAuth.js secret | Random 32+ character string |

## GitHub Environments Setup

1. Go to repository Settings → Environments
2. Create three environments: `preview`, `staging`, `production`
3. Add environment-specific secrets to each

### Example Environment Secrets

**Preview:**
- `DATABASE_URL`: Shared preview/dev database
- `NEXTAUTH_URL`: Will be set dynamically per PR
- `NEXTAUTH_SECRET`: Dev secret

**Staging:**
- `DATABASE_URL`: Staging database
- `NEXTAUTH_URL`: `https://staging-webui.example.com`
- `NEXTAUTH_SECRET`: Staging secret

**Production:**
- `DATABASE_URL`: Production database
- `NEXTAUTH_URL`: `https://webui.example.com`
- `NEXTAUTH_SECRET`: Production secret (unique, secure)

## Manual Operations

### Deploy to Production

**Via GitHub Actions UI:**
1. Go to repository → Actions tab
2. Select "Deploy to Production" workflow
3. Click "Run workflow"
4. Type `deploy-to-production` in confirmation field
5. Click "Run workflow" button

**Via GitHub CLI:**
```bash
gh workflow run deploy-production.yaml -f confirm=deploy-to-production
```

### Build and Push Image Manually

```bash
# Install doctl
brew install doctl

# Authenticate
doctl auth init

# Login to DOCR
doctl registry login

# Build image
cd web-ui
docker build -t registry.digitalocean.com/<registry-name>/garchen-archive-webui:latest .

# Push image
docker push registry.digitalocean.com/<registry-name>/garchen-archive-webui:latest
```

## Health Check

The application exposes a health check endpoint at `/api/health` that:
- Returns 200 if healthy
- Returns 503 if unhealthy
- Checks database connectivity

Digital Ocean uses this endpoint to monitor application health.

## Monitoring

- **Health Check:** `GET /api/health` checked every 10 seconds
- **Logs:** Available in Digital Ocean dashboard or via `doctl apps logs <app-id>`
- **Metrics:** CPU, memory, and request metrics in DO dashboard

## Troubleshooting

### Health Check Failing

1. Ensure `/api/health` endpoint returns 200 status
2. Check `initial_delay_seconds` allows enough startup time (15s for staging/prod, 20s for preview)
3. Verify app binds to port 3000
4. Check database connectivity (most common issue)

### Build Fails

1. Check Node.js version compatibility
2. Verify `npm ci` succeeds locally
3. Check TypeScript compilation: `npm run type-check`

### Missing Secrets

If app fails to start with config errors:
1. Verify all required secrets are set in GitHub environment
2. Check secret names match exactly (case-sensitive)
3. Verify the workflow uses the correct environment

## Setup Instructions

### 1. Create Digital Ocean Container Registry

```bash
doctl auth init
doctl registry create <registry-name>
```

### 2. Set GitHub Secrets

In repository Settings → Secrets → Actions, add:
- `DO_ACCESS_TOKEN`
- `DO_REGISTRY_NAME`

### 3. Create GitHub Environments

Create `preview`, `staging`, `production` environments with their secrets.

### 4. Create DO Apps

The apps will be created automatically on first deployment, or create manually:
- `garchen-archive-webui-staging` (using `.do/app.staging.yaml`)
- `garchen-archive-webui-prod` (using `.do/app.yaml`)

## Cost Information

**Digital Ocean:**
- **Container Registry (DOCR):** Free tier - 500MB storage
- **Preview:** ~$6/month each (temporary)
- **Staging:** ~$12/month (persistent)
- **Production:** ~$12/month (persistent)
