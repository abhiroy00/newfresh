"""add support tickets and messages

Revision ID: d4e5f6a7b8c9
Revises: 5d7942d7e6d2
Create Date: 2026-09-11 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = 'd4e5f6a7b8c9'
down_revision = '5d7942d7e6d2'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'support_tickets',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('subject', sa.String(255), nullable=False),
        sa.Column('status', sa.Enum('open', 'in_progress', 'resolved', 'closed', name='ticketstatus'), nullable=False, server_default='open'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_support_tickets_user_id', 'support_tickets', ['user_id'])
    op.create_index('ix_support_tickets_status', 'support_tickets', ['status'])

    op.create_table(
        'support_messages',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('ticket_id', sa.String(36), sa.ForeignKey('support_tickets.id', ondelete='CASCADE'), nullable=False),
        sa.Column('sender_type', sa.Enum('customer', 'admin', name='sendertype'), nullable=False),
        sa.Column('sender_id', sa.String(36), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_support_messages_ticket_id', 'support_messages', ['ticket_id'])


def downgrade() -> None:
    op.drop_index('ix_support_messages_ticket_id', 'support_messages')
    op.drop_table('support_messages')
    op.drop_index('ix_support_tickets_status', 'support_tickets')
    op.drop_index('ix_support_tickets_user_id', 'support_tickets')
    op.drop_table('support_tickets')
    op.execute('DROP TYPE IF EXISTS sendertype')
    op.execute('DROP TYPE IF EXISTS ticketstatus')
