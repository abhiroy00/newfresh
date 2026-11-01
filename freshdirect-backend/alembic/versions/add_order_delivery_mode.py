"""add delivery mode / schedule fields to orders

Revision ID: add_order_delivery_mode
Revises: add_order_tracking_fields
Create Date: 2026-11-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = 'add_order_delivery_mode'
down_revision = 'add_order_tracking_fields'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Nullable: orders created before this keep NULL (legacy, slot-less).
    op.add_column('orders', sa.Column('delivery_type', sa.String(20), nullable=True))          # normal | scheduled
    op.add_column('orders', sa.Column('estimated_delivery_minutes', sa.Integer(), nullable=True))
    op.add_column('orders', sa.Column('scheduled_delivery_date', sa.Date(), nullable=True))
    op.add_column('orders', sa.Column('scheduled_delivery_slot', sa.String(5), nullable=True))  # "HH:00"
    op.add_column('orders', sa.Column('order_placed_at', sa.DateTime(timezone=True), nullable=True))
    # Slot capacity checks count orders per (date, slot).
    op.create_index('ix_orders_scheduled_slot', 'orders', ['scheduled_delivery_date', 'scheduled_delivery_slot'])


def downgrade() -> None:
    op.drop_index('ix_orders_scheduled_slot', table_name='orders')
    for col in ('order_placed_at', 'scheduled_delivery_slot', 'scheduled_delivery_date',
                'estimated_delivery_minutes', 'delivery_type'):
        op.drop_column('orders', col)
