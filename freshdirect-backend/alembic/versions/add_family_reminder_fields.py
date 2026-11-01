"""add family-details reminder tracking to users

Revision ID: add_family_reminder_fields
Revises: add_order_delivery_mode
Create Date: 2026-11-02 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = 'add_family_reminder_fields'
down_revision = 'add_order_delivery_mode'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('users', sa.Column('family_reminder_last_shown_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('users', sa.Column('family_reminder_last_dismissed_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('users', sa.Column('family_reminder_impressions', sa.Integer(), nullable=False, server_default='0'))
    # When the user removed their last family member; restarts the cooldown.
    op.add_column('users', sa.Column('family_members_cleared_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    for col in ('family_members_cleared_at', 'family_reminder_impressions',
                'family_reminder_last_dismissed_at', 'family_reminder_last_shown_at'):
        op.drop_column('users', col)
