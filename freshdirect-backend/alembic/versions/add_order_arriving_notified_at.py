"""add arriving_notified_at to orders

Revision ID: add_order_arriving_notified
Revises: add_family_member_gender
Create Date: 2026-11-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = 'add_order_arriving_notified'
down_revision = 'add_family_member_gender'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # When the "arriving soon + rider details" push went out; NULL = not yet.
    # Makes that notification idempotent across the periodic check and the
    # out_for_delivery trigger.
    op.add_column('orders', sa.Column('arriving_notified_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column('orders', 'arriving_notified_at')
