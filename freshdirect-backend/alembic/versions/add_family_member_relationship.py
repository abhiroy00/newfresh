"""add relationship to family_members

Revision ID: add_family_member_relationship
Revises: add_family_reminder_fields
Create Date: 2026-11-02 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = 'add_family_member_relationship'
down_revision = 'add_family_reminder_fields'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Optional: existing members simply have none.
    op.add_column('family_members', sa.Column('relationship', sa.String(30), nullable=True))


def downgrade() -> None:
    op.drop_column('family_members', 'relationship')
