-- Table for storing automation schedules
CREATE TABLE auto_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    theme VARCHAR(255) NOT NULL,
    interval_type VARCHAR(50) NOT NULL DEFAULT 'daily', -- 'daily' or 'weekly'
    time_of_day VARCHAR(10) NOT NULL, -- e.g. '08:00', '15:30'
    is_active BOOLEAN NOT NULL DEFAULT true,
    auto_publish BOOLEAN NOT NULL DEFAULT true,
    last_run_at TIMESTAMP WITH TIME ZONE,
    next_run_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add auto_publish flag to projects so that we know which ones to automatically publish when render finishes
ALTER TABLE projects ADD COLUMN auto_publish BOOLEAN DEFAULT false;
