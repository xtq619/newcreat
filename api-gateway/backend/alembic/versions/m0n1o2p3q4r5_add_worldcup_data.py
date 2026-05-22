"""add worldcup_matches and worldcup_teams tables

Revision ID: m0n1o2p3q4r5
Revises: l9m0n1o2p3q4
Create Date: 2026-05-20
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB


revision: str = 'm0n1o2p3q4r5'
down_revision: Union[str, None] = 'l9m0n1o2p3q4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'worldcup_matches',
        sa.Column('id', sa.Integer(), autoincrement=False, primary_key=True),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('time', sa.String(5), nullable=False),
        sa.Column('team_a_code', sa.String(3), nullable=False),
        sa.Column('team_a_name', sa.String(32), nullable=False),
        sa.Column('team_a_flag', sa.String(8), nullable=False),
        sa.Column('team_b_code', sa.String(3), nullable=False),
        sa.Column('team_b_name', sa.String(32), nullable=False),
        sa.Column('team_b_flag', sa.String(8), nullable=False),
        sa.Column('group_name', sa.String(1), nullable=True),
        sa.Column('stage', sa.String(20), nullable=False, server_default='group'),
        sa.Column('round', sa.Integer(), nullable=True),
        sa.Column('status', sa.String(10), nullable=False, server_default='upcoming'),
        sa.Column('score_a', sa.Integer(), nullable=True),
        sa.Column('score_b', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_table(
        'worldcup_teams',
        sa.Column('code', sa.String(3), primary_key=True),
        sa.Column('name', sa.String(32), nullable=False),
        sa.Column('flag', sa.String(8), nullable=False),
        sa.Column('group_name', sa.String(1), nullable=False),
        sa.Column('fifa_rank', sa.Integer(), nullable=True),
        sa.Column('appearances', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('best_result', sa.String(64), nullable=False, server_default=''),
        sa.Column('coach', sa.String(32), nullable=False, server_default=''),
        sa.Column('key_player', sa.String(64), nullable=False, server_default=''),
        sa.Column('squad_confirmed', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('squad_data', JSONB, nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table('worldcup_teams')
    op.drop_table('worldcup_matches')
