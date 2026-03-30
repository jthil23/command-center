# Command Center — Design Specification

> A unified dashboard and orchestration hub for the SOL homeserver, replacing the need to hop between Unraid, Portainer, Grafana, and individual service UIs. Includes a built-in Huntarr replacement for automated media hunting.

## 1. Overview

### Purpose
Command Center is the single pane of glass for managing all 35+ Docker containers and services running on SOL (Unraid 7.2.4, Ryzen 9 3900X, 64GB RAM, RTX 3080, ~70TB storage). It provides real-time monitoring, container lifecycle management, media automation with hunt capabilities, scheduled jobs, and system-level operations — all through a modern, dark-themed web UI.

### Non-Goals
- Home automation control (delegated to Home Assistant)
- Replacing individual service UIs entirely (Command Center handles common operations; deep config stays in each app)
- Multi-user / authentication (local network only, no auth)
- Mobile-first design (desktop-first, mobile is secondary)

## 2. Architecture

### Single Container Monolith
- **Runtime:** Next.js 15 (App Router) running in a single Docker container
- **Language:** TypeScript end-to-end
- **Database:** MariaDB (existing instance on SOL at 192.168.1.103:3366, `command_center` schema)
- **ORM:** Prisma with MariaDB connector
- **Process model:** Single Node.js process handles HTTP, WebSocket, and cron scheduling

### Docker Compose Deployment
```yaml
services:
  command-center:
    image: jthil/command-center:latest
    ports:
      - "3000:3000"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - ./config.yaml:/app/config.yaml
      - ~/.ssh/id_ed25519:/app/ssh/id_ed25519:ro
    environment:
      - DATABASE_URL=mysql://mainUser:mainPass@192.168.1.103:3366/command_center
    restart: unless-stopped
```

### Volume Mounts
| Mount | Purpose |
|-------|---------|
| `/var/run/docker.sock` | Docker Engine API access for container management |
| `./config.yaml` | Service endpoints, API keys, app preferences |
| `~/.ssh/id_ed25519` | SSH key for Unraid system commands (read-only) |

## 3. Tech Stack

### Frontend
| Technology | Purpose |
|-----------|---------|
| Next.js 15 | App Router, Server Components, Server Actions |
| React 19 | UI rendering |
| TypeScript | Type safety |
| Tailwind CSS 4 | Utility-first styling |
| shadcn/ui | Component library (dark theme) |
| Tremor | Charts, sparklines, gauges |
| Lucide | Icon set |
| nuqs | URL state management |
| dashboard-icons | Service logos (SVG, bundled at build time) |

### Backend
| Technology | Purpose |
|-----------|---------|
| Next.js API Routes | REST endpoints |
| Server Actions | Mutations (container ops, triggers) |
| dockerode | Docker Engine API client |
| Prisma | ORM for MariaDB |
| node-cron | Scheduled job execution |
| ws | WebSocket server for push events |
| ssh2 | Unraid system commands over SSH |

### Infrastructure
| Technology | Purpose |
|-----------|---------|
| Docker | Single container deployment |
| Node.js 22 Alpine | Base image (multi-stage build) |
| GitHub | Source repository |
| Docker Hub | Image registry (jthil/command-center) |
| GitHub Actions | CI/CD — build and push on merge to main |

## 4. Pages & UI

### Design Language
- Dark theme throughout (near-black backgrounds, subtle borders)
- Glassmorphism-inspired cards with low-opacity backgrounds
- Color-coded status indicators (green=healthy, yellow=degraded, red=down)
- Real service logos everywhere (Plex, Sonarr, Home Assistant, etc.)
- Data-dense but not cluttered — inspired by Vercel/Linear dashboards
- Desktop-first layout with responsive mobile fallback

### Sidebar Navigation
Collapsible sidebar with 8 pages:

#### 4.1 Dashboard (Home)
The overview page. At a glance, you know the state of everything.

- **Top stat cards (4):** Container count (running/stopped), CPU usage, memory usage, storage usage
- **Container health grid:** Color-coded tiles with service logos. Green=running, yellow=degraded, red=stopped. Click any tile to jump to its detail view.
- **Activity feed:** Real-time stream of events — media grabs, transcode progress, container state changes, disk alerts, hunt activity
- **GPU panel:** RTX 3080 utilization, VRAM, temperature, power draw
- **Quick actions:** Configurable buttons for common operations (restart a service, run parity check, clear cache, sync media)

#### 4.2 Containers
Full container management — the modern Portainer replacement.

- Searchable, filterable list of all containers
- Per-container: status badge, uptime, CPU/RAM usage, image version
- Expand any container for: start/stop/restart buttons, live log viewer (tail with search), environment variables, port mappings, volume mounts
- Bulk actions: restart selected, stop selected

#### 4.3 Media
The *arr command center and built-in Huntarr replacement. Three sub-sections:

**Status & Queues:**
- Sonarr/Radarr download queues with progress bars
- NZBGet active downloads
- Tdarr transcode queue with GPU usage indicator
- Seerr pending requests with approve/deny buttons
- Bazarr missing subtitles count

**Manual Triggers:**
- Per-app buttons: RSS Sync, Search All Missing, Search Cutoff Unmet
- Per-item search: drill into a specific missing episode or movie and trigger an individual search
- Prowlarr indexer health status

**Hunt Engine (Huntarr replacement):**
- Per-app configuration panel:
  - Supported apps: Sonarr, Radarr, Bazarr, Whisparr (extensible to Lidarr, Readarr)
  - Batch size (items per cycle)
  - Cycle interval
  - Search mode (Sonarr: season pack vs. individual episode)
  - Hourly API cap
  - Queue depth threshold (pause hunting when download queue exceeds N items)
  - Enable/disable toggle per app
- Hunt dashboard:
  - Current hunt status (running/idle/paused)
  - Items processed this cycle / total missing
  - Rate limit status (calls remaining this hour)
  - Last run timestamp and result summary
- Hunt history log with per-item results
- Manual "Hunt Now" button per app
- Scheduled hunts via the cron job system (Automations page)
- Smart filtering: skip future-dated releases, skip unmonitored items
- State tracking: processed item IDs persisted in MariaDB to prevent re-processing within configurable window

#### 4.4 Storage
Unraid array and disk management.

- Array overview: total capacity, used/free, parity status
- Per-disk: size, used, temperature, SMART status, spin state
- Share usage breakdown
- Parity check: status, last run, trigger new check
- Cache pool status (NVMe SSD)

#### 4.5 Automations
Triggers and scheduled jobs.

**Triggers:**
- Node-RED flows: list available flows, fire via HTTP inject endpoint
- Home Assistant automations: list and trigger from Command Center
- Recent execution history for both

**Scheduled Jobs:**
- Cron-based job scheduler with human-readable cron builder UI
- Job types:
  - Hunt jobs (search missing/cutoff for specific *arr app)
  - Container operations (restart on schedule)
  - System maintenance (parity check, cache cleanup, log rotation)
  - API calls (hit any URL on a schedule)
  - Shell commands (run via SSH on SOL)
- Per-job: enable/disable toggle, last run status, next run time, execution log
- Job history with success/failure tracking

#### 4.6 System
Server-level management.

- Server info: hostname, OS, uptime, kernel, CPU model, RAM
- UPS status (if available)
- Network interfaces and IPs
- Reboot / shutdown controls (with confirmation dialog)
- Maintenance scripts: custom scripts registered in config, one-click execution

#### 4.7 Logs
Aggregated log viewer.

- Container selector (dropdown or multi-select)
- Real-time log streaming (tail -f equivalent)
- Search and filter within logs
- Log level filtering (if structured logs)
- Download log export

#### 4.8 Settings
Configuration management.

**Service Connections:**
- Per-service configuration: name, base URL, API key, test connection button
- Supported services: Sonarr, Radarr, Prowlarr, Bazarr, Whisparr, Seerr, NZBGet, Tdarr, Plex, Node-RED, Home Assistant, Prometheus
- Connection status indicators (green check / red X)

**Hunt Engine Settings:**
- Global defaults (batch size, interval, hourly cap)
- Per-app overrides
- State reset (clear processed items history)

**General:**
- Polling interval (global default + per-widget overrides)
- Quick action button configuration
- SSH connection settings for Unraid system operations

## 5. Data Flow

### Three Communication Patterns

**Polling (30s default, configurable):**
- Container status and resource usage (via Docker socket)
- System metrics (via Prometheus PromQL)
- *arr queue progress
- GPU stats
- Storage status

**WebSocket Push (instant):**
- Container state changes (started, stopped, crashed)
- Hunt job completion / errors
- Critical disk alerts (temperature, SMART failure)
- Scheduled job completion

**On-Demand (user-triggered):**
- Container start/stop/restart
- Manual hunt triggers
- Automation fires
- System commands (reboot, parity check)
- Manual *arr searches

### Integration Methods

| Service | Protocol | Auth |
|---------|----------|------|
| Docker Engine | Unix socket (mounted) | None (socket access) |
| Sonarr, Radarr, Prowlarr, Bazarr, Whisparr | REST API | API key (header) |
| Seerr | REST API | API key (header) |
| NZBGet | REST API | Basic auth or API key |
| Tdarr | REST API | None (local) |
| Plex | REST API | Plex token |
| Prometheus | HTTP (PromQL) | None (local) |
| Node-RED | REST API | None (local) |
| Home Assistant | REST API | Long-lived access token |
| Unraid system | SSH | ED25519 key |

## 6. Database Schema (MariaDB)

Database: `command_center` on 192.168.1.103:3366

Key tables (managed by Prisma migrations):

- **hunt_state** — tracks processed item IDs per app to prevent re-processing
- **hunt_runs** — execution log for each hunt cycle (app, items found, items searched, errors, duration)
- **scheduled_jobs** — cron job definitions (name, cron expression, job type, config JSON, enabled flag)
- **job_executions** — execution history per job (start time, end time, status, output/error)
- **service_connections** — cached connection test results and metadata
- **activity_log** — unified activity feed entries for the dashboard

## 7. Configuration File

```yaml
# config.yaml — mounted at /app/config.yaml
services:
  sonarr:
    url: http://192.168.1.103:8989
    apiKey: "your-sonarr-api-key"
  radarr:
    url: http://192.168.1.103:7878
    apiKey: "your-radarr-api-key"
  prowlarr:
    url: http://192.168.1.103:9696
    apiKey: "your-prowlarr-api-key"
  bazarr:
    url: http://192.168.1.103:6767
    apiKey: "your-bazarr-api-key"
  whisparr:
    url: http://192.168.1.103:6969
    apiKey: "your-whisparr-api-key"
  seerr:
    url: http://192.168.1.103:5055
    apiKey: "your-seerr-api-key"
  nzbget:
    url: http://192.168.1.103:6789
    apiKey: "your-nzbget-api-key"
  tdarr:
    url: http://192.168.1.103:8265
  plex:
    url: http://192.168.1.103:32400
    token: "your-plex-token"
  prometheus:
    url: http://192.168.1.103:9090
  nodered:
    url: http://192.168.1.103:1880
  homeassistant:
    url: http://192.168.1.103:8123
    token: "your-ha-long-lived-token"

ssh:
  host: 192.168.1.103
  user: root
  keyPath: /app/ssh/id_ed25519

hunt:
  defaults:
    batchSize: 10
    intervalMinutes: 60
    hourlyCap: 50
    queueThreshold: 25
  sonarr:
    enabled: true
    searchMode: "seasonPack"  # or "individual"
    batchSize: 5
  radarr:
    enabled: true
    batchSize: 10

polling:
  defaultIntervalSeconds: 30
```

## 8. Project Structure

```
command-center/
  ├── src/app/                    # Next.js App Router pages
  │   ├── (dashboard)/            # Main dashboard
  │   ├── containers/             # Container management
  │   ├── media/                  # Media + hunt engine UI
  │   ├── storage/                # Disk array & shares
  │   ├── automations/            # Triggers + scheduled jobs
  │   ├── system/                 # Server management
  │   ├── logs/                   # Aggregated log viewer
  │   ├── settings/               # Config & service connections
  │   └── api/                    # API routes + WebSocket
  ├── src/lib/                    # Shared logic
  │   ├── docker/                 # dockerode wrapper
  │   ├── arr/                    # *arr API clients
  │   ├── hunt/                   # Hunt engine core
  │   ├── prometheus/             # PromQL client
  │   ├── system/                 # SSH + Unraid helpers
  │   ├── scheduler/              # Cron job manager
  │   └── db/                     # Prisma client + queries
  ├── src/components/             # Reusable UI components
  ├── prisma/                     # Prisma schema + migrations
  │   └── schema.prisma
  ├── public/icons/               # Service logos (SVG)
  ├── config.example.yaml         # Example configuration
  ├── Dockerfile                  # Multi-stage build
  ├── docker-compose.yml          # SOL deployment
  └── .github/workflows/          # CI/CD pipeline
      └── build-push.yml          # Build + push to Docker Hub
```

## 9. CI/CD Pipeline

**GitHub Actions workflow:**
1. Triggered on push to `main` branch
2. Build Next.js application
3. Run linting and type checks
4. Build Docker image (multi-stage: build → Node 22 Alpine runtime)
5. Push to Docker Hub as `jthil/command-center:latest` and `jthil/command-center:<git-sha>`

## 10. Testing Strategy

- **Type safety:** TypeScript strict mode catches most integration errors at compile time
- **API clients:** Unit tests for *arr API client wrappers and hunt engine logic
- **Hunt engine:** Tests for batch processing, rate limiting, state tracking, smart filtering
- **Integration:** Docker socket operations tested against a local Docker daemon
- **E2E:** Playwright for critical flows (dashboard loads, container restart, hunt trigger)
