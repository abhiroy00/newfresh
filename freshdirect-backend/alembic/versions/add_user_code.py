"""add user_code to users

Revision ID: add_user_code
Revises: e5f6a7b8c9d0
Create Date: 2026-10-23 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = 'add_user_code'
down_revision = 'e5f6a7b8c9d0'
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    # Fail fast with a clear error if something else holds a conflicting lock
    # on `users`, instead of hanging silently until an unrelated deploy-script
    # timeout kills the connection.
    conn.execute(sa.text("SET lock_timeout = '10s'"))

    op.add_column('users', sa.Column('user_code', sa.String(10), nullable=True))

    # One bulk statement assigns every existing row a distinct "G-####" code —
    # looping per row over the DB connection is what stalled the first attempt.
    conn.execute(sa.text("""
        UPDATE users
        SET user_code = 'G-' || lpad(seq::text, 4, '0')
        FROM (
            SELECT id, 1000 + (row_number() OVER (ORDER BY random()) - 1) AS seq
            FROM users
        ) sub
        WHERE users.id = sub.id
    """))

    op.alter_column('users', 'user_code', nullable=False)
    op.create_unique_constraint('uq_users_user_code', 'users', ['user_code'])
    op.create_index('ix_users_user_code', 'users', ['user_code'])


def downgrade() -> None:
    op.drop_index('ix_users_user_code', table_name='users')
    op.drop_constraint('uq_users_user_code', 'users', type_='unique')
    op.drop_column('users', 'user_code')
