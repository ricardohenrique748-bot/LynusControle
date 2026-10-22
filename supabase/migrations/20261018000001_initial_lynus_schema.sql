-- ==============================================================================
-- LYNUS CONTROL - ESQUEMA DE BANCO DE DADOS OFICIAL SUPABASE (POSTGRESQL)
-- Versão: 20261018_000001
-- ==============================================================================

-- 1. EXTENSÕES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. TIPOS CUSTOMIZADOS (ENUMS)
DO $$ BEGIN
  CREATE TYPE user_role_type AS ENUM ('admin', 'finance', 'fiscal', 'support');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE system_category_type AS ENUM ('erp', 'pdv', 'wms', 'bi', 'fiscal');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE release_channel_type AS ENUM ('stable', 'beta', 'lts');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE billing_cycle_type AS ENUM ('monthly', 'quarterly', 'annual');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE customer_status_type AS ENUM ('active', 'pending', 'suspended', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE contract_status_type AS ENUM ('active', 'trial', 'past_due', 'suspended', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE license_status_type AS ENUM ('active', 'grace_period', 'suspended', 'expired', 'revoked');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_method_type AS ENUM ('pix', 'boleto', 'credit_card');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE invoice_status_type AS ENUM ('pending', 'paid', 'overdue', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE fiscal_doc_type AS ENUM ('nfe', 'nfse', 'cte', 'sped_fiscal', 'sped_contribuicoes');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE fiscal_status_type AS ENUM ('authorized', 'pending_validation', 'rejected', 'storage_archived');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 3. TABELA DE PERFIS DE USUÁRIOS E ROLES (LIGADO AO SUPABASE AUTH)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role user_role_type NOT NULL DEFAULT 'support',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. TABELA DE SISTEMAS / SOFTWARES
CREATE TABLE IF NOT EXISTS public.systems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  category system_category_type NOT NULL DEFAULT 'erp',
  latest_version TEXT NOT NULL DEFAULT '1.0.0',
  min_supported_version TEXT NOT NULL DEFAULT '1.0.0',
  release_channel release_channel_type NOT NULL DEFAULT 'stable',
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  feature_flags JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. TABELA DE PLANOS DE ASSINATURA
CREATE TABLE IF NOT EXISTS public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system_id UUID NOT NULL REFERENCES public.systems(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  billing_cycle billing_cycle_type NOT NULL DEFAULT 'monthly',
  price_brl NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  max_terminals INT NOT NULL DEFAULT 1,
  max_users INT NOT NULL DEFAULT 5,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. TABELA DE CLIENTES (EMPRESAS / CNPJ)
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cnpj_cpf VARCHAR(20) NOT NULL UNIQUE,
  corporate_name TEXT NOT NULL, -- Razão Social
  trade_name TEXT NOT NULL,     -- Nome Fantasia
  email TEXT NOT NULL,
  phone VARCHAR(25) NOT NULL,
  city TEXT NOT NULL,
  state VARCHAR(2) NOT NULL,
  status customer_status_type NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. TABELA DE CONTRATOS
CREATE TABLE IF NOT EXISTS public.contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_number TEXT NOT NULL UNIQUE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  system_id UUID NOT NULL REFERENCES public.systems(id) ON DELETE RESTRICT,
  plan_id UUID NOT NULL REFERENCES public.plans(id) ON DELETE RESTRICT,
  value_brl NUMERIC(12, 2) NOT NULL,
  billing_cycle billing_cycle_type NOT NULL DEFAULT 'monthly',
  due_day INT NOT NULL CHECK (due_day BETWEEN 1 AND 28),
  grace_period_days INT NOT NULL DEFAULT 5,
  start_date DATE NOT NULL,
  renewal_date DATE NOT NULL,
  payment_method payment_method_type NOT NULL DEFAULT 'pix',
  status contract_status_type NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 8. TABELA DE LICENÇAS DE SOFTWARE
CREATE TABLE IF NOT EXISTS public.licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_key TEXT NOT NULL UNIQUE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  system_id UUID NOT NULL REFERENCES public.systems(id) ON DELETE RESTRICT,
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE RESTRICT,
  status license_status_type NOT NULL DEFAULT 'active',
  max_instances INT NOT NULL DEFAULT 1,
  active_instances INT NOT NULL DEFAULT 0,
  hardware_fingerprints JSONB NOT NULL DEFAULT '[]'::jsonb,
  offline_lease_days INT NOT NULL DEFAULT 15,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  expires_at TIMESTAMPTZ NOT NULL,
  last_heartbeat_at TIMESTAMPTZ,
  feature_flags JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 9. TABELA DE COBRANÇAS / FATURAS (FINANCEIRO)
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE RESTRICT,
  amount_brl NUMERIC(12, 2) NOT NULL,
  due_date DATE NOT NULL,
  paid_at TIMESTAMPTZ,
  status invoice_status_type NOT NULL DEFAULT 'pending',
  payment_method payment_method_type NOT NULL DEFAULT 'pix',
  pix_code TEXT,
  boleto_barcode TEXT,
  pdf_url TEXT,
  reconciled_by_edge_function BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 10. TABELA DE DOCUMENTOS FISCAIS (NF-e, NFS-e, SPED)
CREATE TABLE IF NOT EXISTS public.fiscal_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_number TEXT NOT NULL,
  doc_type fiscal_doc_type NOT NULL,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  issue_date DATE NOT NULL,
  competence_period VARCHAR(7) NOT NULL, -- YYYY-MM
  status fiscal_status_type NOT NULL DEFAULT 'pending_validation',
  storage_path TEXT NOT NULL,
  hash_sha256 TEXT NOT NULL,
  file_size_kb NUMERIC(10, 2) NOT NULL,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 11. TABELA DE AUDITORIA E LOGS DE SEGURANÇA
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  actor_name TEXT NOT NULL,
  actor_email TEXT NOT NULL,
  actor_role user_role_type NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address TEXT DEFAULT '127.0.0.1',
  timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 12. TABELA DE NOTIFICAÇÕES DO SISTEMA
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('fiscal', 'finance', 'license', 'security')),
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Habilita RLS em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.systems ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiscal_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Função auxiliar segura para obter o papel do usuário autenticado atual
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS user_role_type AS $$
DECLARE
  v_role user_role_type;
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
  RETURN COALESCE(v_role, 'support'::user_role_type);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Regras Profiles
CREATE POLICY "Usuários autenticados podem ver perfis"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin pode gerenciar perfis"
  ON public.profiles FOR ALL
  TO authenticated
  USING (public.current_user_role() = 'admin');

-- Regras Systems & Plans
CREATE POLICY "Todos autenticados podem consultar sistemas e planos"
  ON public.systems FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Apenas admin pode modificar sistemas"
  ON public.systems FOR ALL
  TO authenticated
  USING (public.current_user_role() = 'admin');

CREATE POLICY "Todos autenticados podem ver planos"
  ON public.plans FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Apenas admin pode modificar planos"
  ON public.plans FOR ALL
  TO authenticated
  USING (public.current_user_role() = 'admin');

-- Regras Clientes
CREATE POLICY "Leitura de clientes para equipe autorizada"
  ON public.customers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin e Financeiro podem criar/editar clientes"
  ON public.customers FOR INSERT
  TO authenticated
  WITH CHECK (public.current_user_role() IN ('admin', 'finance'));

CREATE POLICY "Admin e Financeiro podem atualizar clientes"
  ON public.customers FOR UPDATE
  TO authenticated
  USING (public.current_user_role() IN ('admin', 'finance'));

-- Regras Licenças
CREATE POLICY "Visualização de licenças para equipe autenticada"
  ON public.licenses FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin e Suporte podem emitir licenças"
  ON public.licenses FOR INSERT
  TO authenticated
  WITH CHECK (public.current_user_role() IN ('admin', 'support'));

CREATE POLICY "Admin, Suporte e Financeiro (suspensão) alteram licenças"
  ON public.licenses FOR UPDATE
  TO authenticated
  USING (public.current_user_role() IN ('admin', 'support', 'finance'));

-- Regras Faturamento (Invoices)
CREATE POLICY "Admin e Financeiro visualizam faturamento"
  ON public.invoices FOR SELECT
  TO authenticated
  USING (public.current_user_role() IN ('admin', 'finance'));

CREATE POLICY "Admin e Financeiro gerenciam faturamento"
  ON public.invoices FOR ALL
  TO authenticated
  USING (public.current_user_role() IN ('admin', 'finance'));

-- Regras Documentos Fiscais
CREATE POLICY "Admin e Fiscal visualizam documentos fiscais"
  ON public.fiscal_documents FOR SELECT
  TO authenticated
  USING (public.current_user_role() IN ('admin', 'fiscal'));

CREATE POLICY "Admin e Fiscal gerenciam documentos fiscais"
  ON public.fiscal_documents FOR ALL
  TO authenticated
  USING (public.current_user_role() IN ('admin', 'fiscal'));

-- Regras Logs de Auditoria
CREATE POLICY "Admin, Financeiro e Fiscal visualizam logs de auditoria"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (public.current_user_role() IN ('admin', 'finance', 'fiscal'));

CREATE POLICY "Inserção de auditoria permitida para funções e equipe"
  ON public.audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ==============================================================================
-- STORAGE CONFIGURATION (BUCKET PRIVADO FISCAL)
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('fiscal-documents-private', 'fiscal-documents-private', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Acesso a documentos fiscais apenas por admin e fiscal"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'fiscal-documents-private' AND
    public.current_user_role() IN ('admin', 'fiscal')
  );

CREATE POLICY "Upload de documentos fiscais por admin e fiscal"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'fiscal-documents-private' AND
    public.current_user_role() IN ('admin', 'fiscal')
  );
