# Database Migration Guide

## Docker (Recommended)

### 1. Start all services

```bash
cd freshdirect-backend
docker compose up -d
```

### 2. Run migrations

```bash
docker compose exec api alembic upgrade head
```

### 3. Seed demo data

```bash
docker compose exec api python scripts/seed.py
```

### 4. Create admin user

```bash
docker compose exec api python -c "
import asyncio, sys
sys.path.append('.')
from app.core.database import AsyncSessionLocal
from app.models.user import User

async def create_admin():
    async with AsyncSessionLocal() as session:
        user = User(phone='7632942979', name='Admin', email='admin@store.com', is_admin=True)
        session.add(user)
        await session.commit()
        print(f'Admin created: {user.id}')

asyncio.run(create_admin())
"
```

Login: `admin@store.com` / `admin123`

### Other useful Docker commands

```bash
# Check current migration version
docker compose exec api alembic current

# Rollback last migration
docker compose exec api alembic downgrade -1

# Generate new migration from model changes
docker compose exec api alembic revision --autogenerate -m "description"

# Access PostgreSQL shell
docker compose exec db psql -U postgres -d Gmart

# View logs
docker compose logs api -f
```

---

## Without Docker (Local / Neon)

### Prerequisites
- `.env` file configured with your `DATABASE_URL`
- For Neon (or any async Postgres), use the `postgresql+asyncpg://` driver prefix:

```env
DATABASE_URL='postgresql+asyncpg://<user>:<password>@<host>/<dbname>?ssl=require'
```

> **Note:** Do NOT use `sslmode=require` or `channel_binding=require` — asyncpg uses `ssl=require` instead.

## Run Migrations

```bash
cd freshdirect-backend

# Activate venv
# Windows:
.\venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Apply all migrations
alembic upgrade head
```

## Seed Demo Data

```bash
# Windows (PowerShell) — set UTF-8 for emoji support:
$env:PYTHONIOENCODING='utf-8'; python scripts/seed.py

# Linux/Mac:
PYTHONIOENCODING=utf-8 python scripts/seed.py
```

This creates 6 categories and 20 products.

## Create Admin User

```bash
python -c "
import asyncio, sys
sys.path.append('.')
from app.core.database import AsyncSessionLocal
from app.models.user import User

async def create_admin():
    async with AsyncSessionLocal() as session:
        user = User(phone='YOUR_PHONE', name='Admin', email='admin@store.com', is_admin=True)
        session.add(user)
        await session.commit()
        print(f'Admin created: {user.id}')

asyncio.run(create_admin())
"
```

Or via SQL (Neon SQL Editor / psql):

```sql
INSERT INTO users (id, phone, name, email, is_admin, is_active, created_at, updated_at)
VALUES (gen_random_uuid()::text, 'YOUR_PHONE', 'Admin', 'admin@store.com', true, true, now(), now());
```

Login credentials: `admin@store.com` / `admin123`

## Common Commands

| Command | Description |
|---------|-------------|
| `alembic upgrade head` | Apply all pending migrations |
| `alembic downgrade -1` | Rollback last migration |
| `alembic current` | Show current migration version |
| `alembic history` | List all migrations |
| `alembic revision --autogenerate -m "description"` | Generate new migration from model changes |

## Troubleshooting

**`asyncio extension requires an async driver`**
→ Change `postgresql://` to `postgresql+asyncpg://` in your `DATABASE_URL`.

**`UnicodeEncodeError` on Windows**
→ Set `$env:PYTHONIOENCODING='utf-8'` before running scripts.

**`relation "users" does not exist`**
→ You haven't run migrations yet. Run `alembic upgrade head` first.
