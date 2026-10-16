"""add wishlist_items table

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-10-16 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = 'e5f6a7b8c9d0'
down_revision = 'd4e5f6a7b8c9'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'wishlist_items',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('product_id', sa.String(36), sa.ForeignKey('products.id', ondelete='CASCADE'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint('user_id', 'product_id', name='uq_wishlist_user_product'),
    )
    op.create_index('ix_wishlist_items_user_id', 'wishlist_items', ['user_id'])
    op.create_index('ix_wishlist_items_product_id', 'wishlist_items', ['product_id'])


def downgrade() -> None:
    op.drop_index('ix_wishlist_items_product_id', 'wishlist_items')
    op.drop_index('ix_wishlist_items_user_id', 'wishlist_items')
    op.drop_table('wishlist_items')
