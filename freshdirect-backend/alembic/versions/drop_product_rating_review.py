"""drop rating and review_count from products

Revision ID: drop_product_rating_review
Revises: add_carousels_table
Create Date: 2026-06-17
"""
from alembic import op

revision = 'drop_product_rating_review'
down_revision = 'add_carousels_table'
branch_labels = None
depends_on = None


def upgrade():
    op.drop_column('products', 'rating')
    op.drop_column('products', 'review_count')


def downgrade():
    import sqlalchemy as sa
    op.add_column('products', sa.Column('rating', sa.Float(), nullable=True, server_default='0.0'))
    op.add_column('products', sa.Column('review_count', sa.Integer(), nullable=True, server_default='0'))
