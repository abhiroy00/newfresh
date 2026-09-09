"""add password_hash to users

Revision ID: a1b2c3d4e5f6
Revises: drop_product_rating_review
Create Date: 2026-06-18 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = 'a1b2c3d4e5f6'
down_revision = 'drop_product_rating_review'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('users', sa.Column('password_hash', sa.String(255), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'password_hash')
