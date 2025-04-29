"""add email verification fields

Revision ID: 1e8b1df5e9ac
Revises: 
Create Date: 2025-04-24 22:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '1e8b1df5e9ac'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Добавляем колонки для верификации email
    op.add_column('users', sa.Column('is_email_verified', sa.Boolean(), nullable=True, default=False))
    op.add_column('users', sa.Column('email_verification_token', sa.String(length=255), nullable=True))
    op.add_column('users', sa.Column('email_verification_sent_at', sa.DateTime(), nullable=True))
    op.add_column('users', sa.Column('password_reset_token', sa.String(length=255), nullable=True))
    op.add_column('users', sa.Column('password_reset_at', sa.DateTime(), nullable=True))
    
    # Добавление других колонок, которые могут быть не созданы
    op.add_column('users', sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True))
    op.add_column('users', sa.Column('updated_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'), nullable=True))


def downgrade():
    # Удаляем добавленные колонки
    op.drop_column('users', 'is_email_verified')
    op.drop_column('users', 'email_verification_token')
    op.drop_column('users', 'email_verification_sent_at')
    op.drop_column('users', 'password_reset_token')
    op.drop_column('users', 'password_reset_at')
    op.drop_column('users', 'created_at')
    op.drop_column('users', 'updated_at') 