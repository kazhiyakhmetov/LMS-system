# DB bootstrap

Здесь живут скрипты инициализации PostgreSQL и место для бэкапов.

```
db/
├── init/
│   └── 01-restore.sh   ← монтируется в /docker-entrypoint-initdb.d/
└── backups/
    └── *.sql / *.dump  ← сюда кладёшь файлы, монтируется в /backups (gitignored)
```

## Как восстановить БД из бэкапа

1. Скопируй дамп в `db/backups/`. Поддерживаются:
   - **plain SQL** (`pg_dump -Fp`) — `.sql`
   - **custom-format** (`pg_dump -Fc`) — обычно `.dump`, иногда тоже `.sql`
   Скрипт автоматически определит формат по магии `PGDMP`.

2. Если контейнер postgres уже запускался — снеси volume, иначе init не сработает:
   ```bash
   docker compose down -v
   ```

3. Подними стек заново:
   ```bash
   docker compose up --build
   ```

4. Проверь, что таблицы появились:
   ```bash
   docker exec -it studix-postgres psql -U postgres -d EducationSystem -c "\dt"
   ```

## Почему данные не подтягиваются повторно

`/docker-entrypoint-initdb.d/` отрабатывает **только при первичной инициализации** datadir-а
(когда volume пуст). Это by design — иначе каждый рестарт вайпал бы изменения.
Чтобы пересоздать БД с нуля: `docker compose down -v && docker compose up --build`.

## Делаем свежий бэкап

```bash
docker exec -t studix-postgres \
  pg_dump -U postgres -Fc EducationSystem > db/backups/manual-$(date +%F).dump
```
