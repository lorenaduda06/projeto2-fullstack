\set ON_ERROR_STOP on
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 name VARCHAR(120) NOT NULL CHECK (btrim(name) <> ''),
 email VARCHAR(255) NOT NULL UNIQUE,
 cpf VARCHAR(11) NOT NULL UNIQUE CHECK (cpf ~ '^[0-9]{11}$'),
 password_hash TEXT NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 deleted_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX users_email_lower_unique ON users (lower(email));
CREATE INDEX users_created_at_idx ON users (created_at);

CREATE TABLE categories (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 name VARCHAR(80) NOT NULL CHECK (btrim(name) <> ''),
 description VARCHAR(255),
 type VARCHAR(10) NOT NULL CHECK (type IN ('income','expense')),
 is_default BOOLEAN NOT NULL DEFAULT false,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 deleted_at TIMESTAMPTZ,
 UNIQUE (user_id, name, type)
);
CREATE INDEX categories_user_type_idx ON categories (user_id, type);

CREATE TABLE sources_destinations (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 name VARCHAR(100) NOT NULL CHECK (btrim(name) <> ''),
 type VARCHAR(20) NOT NULL CHECK (type IN ('checking_account','savings_account','cash','income_source','other')),
 description VARCHAR(255),
 initial_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
 is_default BOOLEAN NOT NULL DEFAULT false,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 deleted_at TIMESTAMPTZ,
 UNIQUE (user_id, name)
);
CREATE INDEX sources_destinations_user_type_idx ON sources_destinations (user_id, type);

CREATE TABLE credit_cards (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 source_destination_id UUID NOT NULL UNIQUE REFERENCES sources_destinations(id) ON DELETE RESTRICT,
 name VARCHAR(100) NOT NULL,
 credit_limit NUMERIC(14,2) NOT NULL CHECK (credit_limit > 0),
 closing_day SMALLINT NOT NULL CHECK (closing_day BETWEEN 1 AND 31),
 due_day SMALLINT NOT NULL CHECK (due_day BETWEEN 1 AND 31),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 deleted_at TIMESTAMPTZ
);
CREATE INDEX credit_cards_user_idx ON credit_cards (user_id);

CREATE TABLE purchase_plans (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
 source_destination_id UUID NOT NULL REFERENCES sources_destinations(id) ON DELETE RESTRICT,
 credit_card_id UUID REFERENCES credit_cards(id) ON DELETE RESTRICT,
 description VARCHAR(255) NOT NULL,
 total_amount NUMERIC(14,2) NOT NULL CHECK (total_amount > 0),
 installment_count SMALLINT NOT NULL CHECK (installment_count BETWEEN 2 AND 120),
 purchase_date DATE NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX purchase_plans_user_date_idx ON purchase_plans (user_id, purchase_date);

CREATE TABLE invoices (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 credit_card_id UUID NOT NULL REFERENCES credit_cards(id) ON DELETE RESTRICT,
 reference_month DATE NOT NULL CHECK (extract(day from reference_month) = 1),
 closing_date DATE NOT NULL,
 due_date DATE NOT NULL,
 status VARCHAR(12) NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed','paid','overdue')),
 paid_at TIMESTAMPTZ,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 CHECK (due_date >= closing_date),
 UNIQUE (credit_card_id, reference_month)
);
CREATE INDEX invoices_user_due_date_idx ON invoices (user_id, due_date);
CREATE INDEX invoices_card_status_idx ON invoices (credit_card_id, status);

CREATE TABLE financial_transactions (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
 source_destination_id UUID NOT NULL REFERENCES sources_destinations(id) ON DELETE RESTRICT,
 invoice_id UUID REFERENCES invoices(id) ON DELETE RESTRICT,
 purchase_plan_id UUID REFERENCES purchase_plans(id) ON DELETE RESTRICT,
 type VARCHAR(10) NOT NULL CHECK (type IN ('income','expense')),
 description VARCHAR(255) NOT NULL CHECK (btrim(description) <> ''),
 amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
 transaction_date DATE NOT NULL,
 due_date DATE,
 paid_at TIMESTAMPTZ,
 status VARCHAR(12) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','cancelled')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 deleted_at TIMESTAMPTZ,
 CHECK (status <> 'paid' OR paid_at IS NOT NULL)
);
CREATE INDEX financial_transactions_user_date_idx ON financial_transactions (user_id, transaction_date DESC);
CREATE INDEX financial_transactions_user_status_idx ON financial_transactions (user_id, status);
CREATE INDEX financial_transactions_category_idx ON financial_transactions (category_id);
CREATE INDEX financial_transactions_source_idx ON financial_transactions (source_destination_id);
CREATE INDEX financial_transactions_invoice_idx ON financial_transactions (invoice_id);

CREATE TABLE installments (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 purchase_plan_id UUID NOT NULL REFERENCES purchase_plans(id) ON DELETE RESTRICT,
 transaction_id UUID NOT NULL UNIQUE REFERENCES financial_transactions(id) ON DELETE RESTRICT,
 invoice_id UUID REFERENCES invoices(id) ON DELETE RESTRICT,
 installment_number SMALLINT NOT NULL CHECK (installment_number >= 1),
 amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
 due_date DATE NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE (purchase_plan_id, installment_number)
);
CREATE INDEX installments_due_date_idx ON installments (due_date);
CREATE INDEX installments_invoice_idx ON installments (invoice_id);

CREATE FUNCTION set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 NEW.updated_at = now();
 RETURN NEW;
END;
$$;
CREATE TRIGGER users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER sources_destinations_updated_at BEFORE UPDATE ON sources_destinations FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER credit_cards_updated_at BEFORE UPDATE ON credit_cards FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER purchase_plans_updated_at BEFORE UPDATE ON purchase_plans FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER financial_transactions_updated_at BEFORE UPDATE ON financial_transactions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
COMMIT;
