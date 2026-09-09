"""merge storage_tips and services-category branches

Revision ID: 5d7942d7e6d2
Revises: c3d4e5f6a7b8, add_storage_preparation
Create Date: 2026-07-29 01:08:37.443114

"""
from typing import Sequence, Union


# revision identifiers, used by Alembic.
revision: str = '5d7942d7e6d2'
down_revision: Union[str, None] = ('c3d4e5f6a7b8', 'add_storage_preparation')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
