from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context

from app.models import Base
from app.core.settings import settings

# Alembic Config object
config = context.config

# Ghi đè URL trong alembic.ini bằng settings.DATABASE_URL (chuyển asyncmy -> pymysql)
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL.replace("asyncmy", "pymysql"))

# Logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Metadata từ models
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Chạy migrations ở chế độ offline (chỉ xuất SQL)."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Chạy migrations ở chế độ online (kết nối DB)."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
