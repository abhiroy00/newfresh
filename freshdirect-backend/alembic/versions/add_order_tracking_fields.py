"""add delivery OTP, status history and rating to orders

Revision ID: add_order_tracking_fields
Revises: add_order_arriving_notified
Create Date: 2026-11-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = 'add_order_tracking_fields'
down_revision = 'add_order_arriving_notified'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # All nullable: existing orders keep working (no OTP required, timeline
    # derived from created_at/delivered_at/cancelled_at, not rated).
    op.add_column('orders', sa.Column('delivery_otp', sa.String(4), nullable=True))
    op.add_column('orders', sa.Column('status_history', sa.JSON(), nullable=True))
    op.add_column('orders', sa.Column('rating', sa.Integer(), nullable=True))
    op.add_column('orders', sa.Column('rating_comment', sa.Text(), nullable=True))
    op.add_column('orders', sa.Column('rated_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    for col in ('rated_at', 'rating_comment', 'rating', 'status_history', 'delivery_otp'):
        op.drop_column('orders', col)
