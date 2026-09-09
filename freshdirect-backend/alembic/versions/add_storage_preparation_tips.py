"""Add storage_tips and preparation_tips to products

Revision ID: add_storage_preparation
Revises: add_phase2_3_fields
Create Date: 2026-07-28 20:12:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_storage_preparation'
down_revision = 'add_phase2_3_fields'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('products', sa.Column('storage_tips', postgresql.JSON(), nullable=True))
    op.add_column('products', sa.Column('preparation_tips', postgresql.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column('products', 'preparation_tips')
    op.drop_column('products', 'storage_tips')
