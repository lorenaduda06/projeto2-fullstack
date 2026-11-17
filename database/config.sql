CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(120) NOT NULL,
    email VARCHAR(255) NOT NULL,
    cpf VARCHAR(11) NOT NULL,
    passwordHash TEXT NOT NULL,
    createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deletedAt TIMESTAMPTZ,
    CONSTRAINT users_email_unique UNIQUE (email),
    CONSTRAINT users_cpf_unique UNIQUE (cpf),
    CONSTRAINT users_email_not_blank CHECK (BTRIM(email) <> ''),
    CONSTRAINT users_name_not_blank CHECK (BTRIM(name) <> ''),
    CONSTRAINT users_cpf_format CHECK (cpf ~ '^[0-9]{11}$')
);

CREATE INDEX IF NOT EXISTS users_created_at_idx ON users ("createdAt");

CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    userId UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    name VARCHAR(80) NOT NULL,
    description VARCHAR(255),
    type VARCHAR(10) NOT NULL,
    isDefault BOOLEAN NOT NULL DEFAULT FALSE,
    createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deletedAt TIMESTAMPTZ,
    CONSTRAINT categories_type_check CHECK (type IN ('income', 'expense')),
    CONSTRAINT categories_name_not_blank CHECK (BTRIM(name) <> ''),
    CONSTRAINT categories_user_name_type_unique UNIQUE ("userId", name, type)
);

CREATE INDEX IF NOT EXISTS categories_user_type_idx ON categories ("userId", type);

CREATE TABLE IF NOT EXISTS sources_destinations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    userId UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL,
    description VARCHAR(255),
    initialBalance NUMERIC(14,2) NOT NULL DEFAULT 0,
    isDefault BOOLEAN NOT NULL DEFAULT FALSE,
    createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deletedAt TIMESTAMPTZ,
    CONSTRAINT sources_destinations_type_check
        CHECK (type IN ('checking_account', 'savings_account', 'cash', 'income_source', 'other')),
    CONSTRAINT sources_destinations_name_not_blank CHECK (BTRIM(name) <> ''),
    CONSTRAINT sources_destinations_initial_balance_check CHECK (initialBalance >= 0),
    CONSTRAINT sources_destinations_user_name_unique UNIQUE ("userId", name)
);

CREATE INDEX IF NOT EXISTS sources_destinations_user_type_idx
    ON sources_destinations ("userId", type);

CREATE TABLE IF NOT EXISTS credit_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    userId UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    sourceDestinationId UUID NOT NULL REFERENCES sources_destinations(id) ON DELETE RESTRICT,
    name VARCHAR(100) NOT NULL,
    creditLimit NUMERIC(14,2) NOT NULL,
    closingDay SMALLINT NOT NULL,
    dueDay SMALLINT NOT NULL,
    createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deletedAt TIMESTAMPTZ,
    CONSTRAINT credit_cards_source_unique UNIQUE (sourceDestinationId),
    CONSTRAINT credit_cards_limit_check CHECK (creditLimit > 0),
    CONSTRAINT credit_cards_closing_day_check CHECK (closingDay BETWEEN 1 AND 31),
    CONSTRAINT credit_cards_due_day_check CHECK (dueDay BETWEEN 1 AND 31),
    CONSTRAINT credit_cards_name_not_blank CHECK (BTRIM(name) <> '')
);

CREATE INDEX IF NOT EXISTS credit_cards_user_idx ON credit_cards ("userId");

CREATE TABLE IF NOT EXISTS purchase_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    userId UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    categoryId UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    sourceDestinationId UUID NOT NULL REFERENCES sources_destinations(id) ON DELETE RESTRICT,
    creditCardId UUID REFERENCES credit_cards(id) ON DELETE RESTRICT,
    description VARCHAR(255) NOT NULL,
    totalAmount NUMERIC(14,2) NOT NULL,
    installmentCount SMALLINT NOT NULL,
    purchaseDate DATE NOT NULL,
    createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT purchase_plans_amount_check CHECK (totalAmount > 0),
    CONSTRAINT purchase_plans_installment_count_check CHECK (installmentCount BETWEEN 2 AND 120),
    CONSTRAINT purchase_plans_description_not_blank CHECK (BTRIM(description) <> '')
);

CREATE INDEX IF NOT EXISTS purchase_plans_user_date_idx
    ON purchase_plans ("userId", purchaseDate);

CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    userId UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    creditCardId UUID NOT NULL REFERENCES credit_cards(id) ON DELETE RESTRICT,
    referenceMonth DATE NOT NULL,
    closingDate DATE NOT NULL,
    dueDate DATE NOT NULL,
    status VARCHAR(12) NOT NULL DEFAULT 'open',
    paidAt TIMESTAMPTZ,
    createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT invoices_status_check CHECK (status IN ('open', 'closed', 'paid', 'overdue')),
    CONSTRAINT invoices_reference_month_check CHECK (EXTRACT(DAY FROM referenceMonth) = 1),
    CONSTRAINT invoices_dates_check CHECK (dueDate >= closingDate),
    CONSTRAINT invoices_card_month_unique UNIQUE (creditCardId, referenceMonth)
);

CREATE INDEX IF NOT EXISTS invoices_user_due_date_idx ON invoices ("userId", dueDate);
CREATE INDEX IF NOT EXISTS invoices_card_status_idx ON invoices ("creditCardId", status);

CREATE TABLE IF NOT EXISTS financial_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    userId UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    categoryId UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    sourceDestinationId UUID NOT NULL REFERENCES sources_destinations(id) ON DELETE RESTRICT,
    invoiceId UUID REFERENCES invoices(id) ON DELETE RESTRICT,
    purchasePlanId UUID REFERENCES purchase_plans(id) ON DELETE RESTRICT,
    type VARCHAR(10) NOT NULL,
    description VARCHAR(255) NOT NULL,
    amount NUMERIC(14,2) NOT NULL,
    transactionDate DATE NOT NULL,
    dueDate DATE,
    paidAt TIMESTAMPTZ,
    status VARCHAR(12) NOT NULL DEFAULT 'pending',
    createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deletedAt TIMESTAMPTZ,
    CONSTRAINT financial_transactions_type_check CHECK (type IN ('income', 'expense')),
    CONSTRAINT financial_transactions_status_check CHECK (status IN ('pending', 'paid', 'cancelled')),
    CONSTRAINT financial_transactions_amount_check CHECK (amount > 0),
    CONSTRAINT financial_transactions_description_not_blank CHECK (BTRIM(description) <> ''),
    CONSTRAINT financial_transactions_paid_at_check CHECK (status <> 'paid' OR paidAt IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS financial_transactions_user_date_idx
    ON financial_transactions ("userId", transactionDate DESC);
CREATE INDEX IF NOT EXISTS financial_transactions_user_status_idx
    ON financial_transactions ("userId", status);
CREATE INDEX IF NOT EXISTS financial_transactions_category_idx ON financial_transactions ("categoryId");
CREATE INDEX IF NOT EXISTS financial_transactions_source_idx ON financial_transactions ("sourceDestinationId");
CREATE INDEX IF NOT EXISTS financial_transactions_invoice_idx ON financial_transactions ("invoiceId");

CREATE TABLE IF NOT EXISTS installments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchasePlanId UUID NOT NULL REFERENCES purchase_plans(id) ON DELETE RESTRICT,
    transactionId UUID NOT NULL UNIQUE REFERENCES financial_transactions(id) ON DELETE RESTRICT,
    invoiceId UUID REFERENCES invoices(id) ON DELETE RESTRICT,
    installmentNumber SMALLINT NOT NULL,
    amount NUMERIC(14,2) NOT NULL,
    dueDate DATE NOT NULL,
    createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT installments_number_positive CHECK (installmentNumber >= 1),
    CONSTRAINT installments_amount_positive CHECK (amount > 0),
    CONSTRAINT installments_plan_number_unique UNIQUE (purchasePlanId, installmentNumber)
);

CREATE INDEX IF NOT EXISTS installments_due_date_idx ON installments (dueDate);
CREATE INDEX IF NOT EXISTS installments_invoice_idx ON installments (invoiceId);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
    table_name TEXT;
BEGIN
    FOREACH table_name IN ARRAY ARRAY[
        'users',
        'categories',
        'sources_destinations',
        'credit_cards',
        'purchase_plans',
        'invoices',
        'financial_transactions'
    ]
    LOOP
        EXECUTE FORMAT(
            'DROP TRIGGER IF EXISTS set_updated_at_trigger ON %I',
            table_name
        );
        EXECUTE FORMAT(
            'CREATE TRIGGER set_updated_at_trigger
             BEFORE UPDATE ON %I
             FOR EACH ROW EXECUTE FUNCTION set_updated_at()',
            table_name
        );
    END LOOP;
END;
$$;