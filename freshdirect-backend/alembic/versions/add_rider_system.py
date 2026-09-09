"""add rider system - is_rider on users, rider_id on orders

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-06-19 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = 'b2c3d4e5f6a7'
down_revision = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('users', sa.Column('is_rider', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('orders', sa.Column('rider_id', sa.String(36), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True))
    op.create_index('ix_orders_rider_id', 'orders', ['rider_id'])


def downgrade() -> None:
    op.drop_index('ix_orders_rider_id', 'orders')
    op.drop_column('orders', 'rider_id')
    op.drop_column('users', 'is_rider')
