"""add_feed_management

Revision ID: 804a04cdf512
Revises: 0c5fe66f6754
Create Date: 2026-06-15 18:26:26.833220

"""
from alembic import op
import sqlalchemy as sa


revision = '804a04cdf512'
down_revision = '0c5fe66f6754'
branch_labels = None
depends_on = None


def upgrade():
    op.execute("CREATE TYPE feedtxtype AS ENUM ('in', 'out', 'adjustment')")
    op.execute("CREATE TYPE feedsession AS ENUM ('morning', 'evening', 'both')")

    op.execute("""
        CREATE TABLE feed_types (
            id UUID PRIMARY KEY,
            organization_id UUID NOT NULL REFERENCES organizations(id),
            name VARCHAR(255) NOT NULL,
            unit VARCHAR(50) NOT NULL DEFAULT 'kg',
            current_stock NUMERIC(12,2) DEFAULT 0,
            min_stock_level NUMERIC(12,2) DEFAULT 0,
            cost_per_unit NUMERIC(10,2),
            suitable_for VARCHAR(255),
            description TEXT,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
    """)

    op.execute("""
        CREATE TABLE feed_stock_transactions (
            id UUID PRIMARY KEY,
            organization_id UUID NOT NULL REFERENCES organizations(id),
            feed_type_id UUID NOT NULL REFERENCES feed_types(id),
            transaction_type feedtxtype NOT NULL,
            quantity NUMERIC(12,2) NOT NULL,
            unit_cost NUMERIC(10,2),
            total_cost NUMERIC(12,2),
            reference VARCHAR(255),
            notes TEXT,
            transaction_date DATE NOT NULL,
            created_by UUID REFERENCES users(id),
            created_at TIMESTAMP DEFAULT NOW()
        )
    """)

    op.execute("""
        CREATE TABLE feed_consumption (
            id UUID PRIMARY KEY,
            organization_id UUID NOT NULL REFERENCES organizations(id),
            feed_type_id UUID NOT NULL REFERENCES feed_types(id),
            animal_id UUID REFERENCES animals(id),
            species animalspecies,
            quantity NUMERIC(12,2) NOT NULL,
            consumption_date DATE NOT NULL,
            session feedsession NOT NULL DEFAULT 'morning',
            notes TEXT,
            created_by UUID REFERENCES users(id),
            created_at TIMESTAMP DEFAULT NOW()
        )
    """)


def downgrade():
    op.execute("DROP TABLE IF EXISTS feed_consumption")
    op.execute("DROP TABLE IF EXISTS feed_stock_transactions")
    op.execute("DROP TABLE IF EXISTS feed_types")
    op.execute("DROP TYPE IF EXISTS feedsession")
    op.execute("DROP TYPE IF EXISTS feedtxtype")
