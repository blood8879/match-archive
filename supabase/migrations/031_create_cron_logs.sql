CREATE TABLE IF NOT EXISTS public.cron_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'success',
    message TEXT,
    executed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    details JSONB
);

CREATE INDEX idx_cron_logs_job_name ON public.cron_logs(job_name);
CREATE INDEX idx_cron_logs_executed_at ON public.cron_logs(executed_at DESC);

ALTER TABLE public.cron_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage cron_logs" ON public.cron_logs
    FOR ALL USING (true) WITH CHECK (true);
