-- Create cron job to run every 3 minutes
SELECT cron.schedule(
  'send-lana-to-players-every-3-minutes',
  '*/3 * * * *', -- every 3 minutes
  $$
  SELECT
    net.http_post(
        url:='https://wrhcgufugnyquufydvwl.supabase.co/functions/v1/send-lana-to-players',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndyaGNndWZ1Z255cXV1ZnlkdndsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NjcxMDIsImV4cCI6MjA3NDE0MzEwMn0.YQu315SQ0KeQBHe5Yzj8Fbo8cEfgvCfEfSSwVZw-vTg"}'::jsonb,
        body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);