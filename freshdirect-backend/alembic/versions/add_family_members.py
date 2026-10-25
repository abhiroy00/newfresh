"""add family_members table

Revision ID: add_family_members
Revises: add_user_code
Create Date: 2026-10-25 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = 'add_family_members'
down_revision = 'add_user_code'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'family_members',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(120), nullable=True),
        sa.Column('age', sa.Integer(), nullable=False),
        sa.Column('weight_kg', sa.Float(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_family_members_user_id', 'family_members', ['user_id'])


def downgrade() -> None:
    op.drop_index('ix_family_members_user_id', table_name='family_members')
    op.drop_table('family_members')
