-- Create attendance_logs table
CREATE TABLE IF NOT EXISTS public.attendance_logs (
    log_id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    employee_id INTEGER REFERENCES public.employees(emp_id) ON DELETE CASCADE,
    clock_in_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT '🟢 حضور',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for user isolated access
CREATE POLICY "Users can manage their own attendance logs" 
ON public.attendance_logs 
FOR ALL 
USING (auth.uid() = user_id);
