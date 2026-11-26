-- Fondasi schema PostgreSQL UnWhats (M4).
-- Migration versi penuh akan dikelola dengan Drizzle. File ini hanya untuk
-- development environment agar tenant isolation bisa diuji sejak awal.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS environments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS provider_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    project_id UUID NOT NULL REFERENCES projects(id),
    provider_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'registered',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_org ON projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_provider_accounts_project ON provider_accounts(project_id);

-- Row-Level Security menjadi lapisan kedua setelah pengecekan di aplikasi.
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY projects_tenant_isolation ON projects
    USING (organization_id::text = current_setting('app.organization_id', true));

CREATE POLICY provider_accounts_tenant_isolation ON provider_accounts
    USING (organization_id::text = current_setting('app.organization_id', true));
