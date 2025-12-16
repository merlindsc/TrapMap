/* ============================================================
   TRAPMAP – SIMPLE DEMO REQUESTS TABLE
   Simplified version without foreign keys for easier setup
   ============================================================ */

-- Drop table if exists (for clean re-creation)
DROP TABLE IF EXISTS public.demo_requests;

-- Create demo_requests table (simple version)
CREATE TABLE public.demo_requests (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    company VARCHAR(255),
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    expectations TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    account_created_at TIMESTAMP WITH TIME ZONE,
    organisation_id INTEGER,
    user_id INTEGER
);

-- Create indexes for better performance
CREATE INDEX idx_demo_requests_email ON public.demo_requests(email);
CREATE INDEX idx_demo_requests_status ON public.demo_requests(status);
CREATE INDEX idx_demo_requests_created_at ON public.demo_requests(created_at DESC);

-- Add unique constraint on email to prevent duplicates
ALTER TABLE public.demo_requests ADD CONSTRAINT unique_demo_email UNIQUE (email);

-- Add check constraint for status
ALTER TABLE public.demo_requests ADD CONSTRAINT check_demo_status 
    CHECK (status IN ('pending', 'completed', 'cancelled'));

-- Grant permissions (no RLS for simplicity)
GRANT ALL ON public.demo_requests TO anon;
GRANT ALL ON public.demo_requests TO authenticated;
GRANT ALL ON SEQUENCE public.demo_requests_id_seq TO anon;
GRANT ALL ON SEQUENCE public.demo_requests_id_seq TO authenticated;