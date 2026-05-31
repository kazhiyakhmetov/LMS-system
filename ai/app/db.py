"""Postgres connection pool — shared across risk + recommend modules."""
from __future__ import annotations

import os
from contextlib import contextmanager

from psycopg import Connection
from psycopg_pool import ConnectionPool


def _dsn() -> str:
    host = os.getenv("DB_HOST", "postgres")
    port = os.getenv("DB_PORT", "5432")
    name = os.getenv("DB_NAME", "EducationSystem")
    user = os.getenv("DB_USER", "postgres")
    pwd = os.getenv("DB_PASSWORD")
    if not pwd:
        raise RuntimeError("DB_PASSWORD environment variable is required")
    return f"host={host} port={port} dbname={name} user={user} password={pwd}"


_pool: ConnectionPool | None = None


def get_pool() -> ConnectionPool:
    global _pool
    if _pool is None:
        _pool = ConnectionPool(
            conninfo=_dsn(),
            min_size=1,
            max_size=4,
            kwargs={"autocommit": True},
            open=True,
        )
    return _pool


@contextmanager
def conn() -> Connection:
    pool = get_pool()
    with pool.connection() as c:
        yield c


def close_pool() -> None:
    global _pool
    if _pool is not None:
        _pool.close()
        _pool = None
