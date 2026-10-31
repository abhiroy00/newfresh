"""add gender to family_members

Revision ID: add_family_member_gender
Revises: add_family_members
Create Date: 2026-10-31 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = 'add_family_member_gender'
down_revision = 'add_family_members'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Nullable plain string (male/female/other), not a Postgres enum: existing
    # rows stay valid, and it avoids the enum name/value mismatch (ba075f5).
    op.add_column('family_members', sa.Column('gender', sa.String(10), nullable=True))


def downgrade() -> None:
    op.drop_column('family_members', 'gender')
