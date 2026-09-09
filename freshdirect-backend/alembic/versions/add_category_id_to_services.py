"""add category_id to services

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-06-26 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = 'c3d4e5f6a7b8'
down_revision = 'b2c3d4e5f6a7'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'services',
        sa.Column('category_id', sa.String(36), sa.ForeignKey('categories.id', ondelete='SET NULL'), nullable=True, index=True)
    )


def downgrade() -> None:
    op.drop_column('services', 'category_id')
