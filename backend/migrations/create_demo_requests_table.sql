/* ============================================================
   TRAPMAP – DATABASE MIGRATION
   Create demo_requests table
   ============================================================ */

-- SQL to create demo_requests table
-- This should be executed in your Supabase SQL editor

CREATE TABLE IF NOT EXISTS public.demo_requests (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    company VARCHAR(255),
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(50),
    expectations TEXT,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    account_created_at TIMESTAMP WITH TIME ZONE,
    organisation_id INTEGER REFERENCES public.organisations(id),
    user_id INTEGER REFERENCES public.users(id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_demo_requests_email ON public.demo_requests(email);
CREATE INDEX IF NOT EXISTS idx_demo_requests_status ON public.demo_requests(status);
CREATE INDEX IF NOT EXISTS idx_demo_requests_created_at ON public.demo_requests(created_at);

-- For simplicity, disable RLS and handle permissions in application code
-- This works better with custom JWT authentication
ALTER TABLE public.demo_requests DISABLE ROW LEVEL SECURITY;

-- Grant basic permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.demo_requests TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.demo_requests TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.demo_requests_id_seq TO anon;
GRANT USAGE, SELECT ON SEQUENCE public.demo_requests_id_seq TO authenticated;