"""Add carousels table

Revision ID: add_carousels_table
Revises: add_phase2_3_fields
Create Date: 2026-06-17 06:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = 'add_carousels_table'
down_revision = 'add_phase2_3_fields'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'carousels',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('subtitle', sa.String(255), nullable=True),
        sa.Column('image_url', sa.Text(), nullable=False),
        sa.Column('link_type', sa.String(20), nullable=False, server_default='category'),
        sa.Column('link_value', sa.String(255), nullable=True),
        sa.Column('button_text', sa.String(50), nullable=True),
        sa.Column('display_order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('starts_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('ends_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )


def downgrade() -> None:
    op.drop_table('carousels')
