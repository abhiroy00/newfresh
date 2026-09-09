"""Add Phase 2 & 3 fields to products and create new models

Revision ID: add_phase2_3_fields
Revises: 273d831cd4c1
Create Date: 2026-06-15 09:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_phase2_3_fields'
down_revision = '273d831cd4c1'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add columns to products table
    op.add_column('products', sa.Column('origin', sa.String(100), nullable=True))
    op.add_column('products', sa.Column('health_benefits', sa.Text(), nullable=True))
    op.add_column('products', sa.Column('minerals', postgresql.JSON(), nullable=True))
    op.add_column('products', sa.Column('vitamins', postgresql.JSON(), nullable=True))
    op.add_column('products', sa.Column('scheduled_price', sa.Float(), nullable=True))
    op.add_column('products', sa.Column('scheduled_price_date', sa.DateTime(timezone=True), nullable=True))
    op.add_column('products', sa.Column('price_history', postgresql.JSON(), nullable=True))
    op.add_column('products', sa.Column('low_stock_threshold', sa.Integer(), nullable=False, server_default='10'))

    # Create services table
    op.create_table(
        'services',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('slug', sa.String(300), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('image_url', sa.Text(), nullable=True),
        sa.Column('pricing_unit', sa.String(50), nullable=False),
        sa.Column('base_price', sa.Float(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('available_slots', postgresql.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('slug')
    )
    op.create_index('ix_services_slug', 'services', ['slug'], unique=False)

    # Create app_settings table
    op.create_table(
        'app_settings',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('app_name', sa.String(100), nullable=False, server_default='Gmart'),
        sa.Column('app_logo_url', sa.Text(), nullable=True),
        sa.Column('support_phone', sa.String(20), nullable=True),
        sa.Column('support_whatsapp', sa.String(20), nullable=True),
        sa.Column('support_email', sa.String(100), nullable=True),
        sa.Column('default_currency', sa.String(3), nullable=False, server_default='INR'),
        sa.Column('razorpay_key_id', sa.String(255), nullable=True),
        sa.Column('razorpay_key_secret', sa.String(255), nullable=True),
        sa.Column('payment_methods_enabled', postgresql.JSON(), nullable=False),
        sa.Column('gst_config', postgresql.JSON(), nullable=False),
        sa.Column('min_order_value', sa.Float(), nullable=False, server_default='199.0'),
        sa.Column('free_delivery_above', sa.Float(), nullable=False, server_default='499.0'),
        sa.Column('base_delivery_fee', sa.Float(), nullable=False, server_default='49.0'),
        sa.Column('app_store_link', sa.Text(), nullable=True),
        sa.Column('play_store_link', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )

    # Create delivery_zones table
    op.create_table(
        'delivery_zones',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('coverage', postgresql.JSON(), nullable=False),
        sa.Column('delivery_fee', sa.Float(), nullable=False, server_default='49.0'),
        sa.Column('free_delivery_above', sa.Float(), nullable=False, server_default='499.0'),
        sa.Column('estimated_delivery_time_minutes', sa.Integer(), nullable=False, server_default='30'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )


def downgrade() -> None:
    # Drop new tables
    op.drop_table('delivery_zones')
    op.drop_table('app_settings')
    op.drop_table('services')

    # Remove columns from products table
    op.drop_column('products', 'low_stock_threshold')
    op.drop_column('products', 'price_history')
    op.drop_column('products', 'scheduled_price_date')
    op.drop_column('products', 'scheduled_price')
    op.drop_column('products', 'vitamins')
    op.drop_column('products', 'minerals')
    op.drop_column('products', 'health_benefits')
    op.drop_column('products', 'origin')
