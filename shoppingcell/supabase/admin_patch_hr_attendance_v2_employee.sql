-- Patch v2: RH Attendance per employee
-- Converts hr_attendance from unique(day) to unique(employee_id, day)

alter table public.hr_attendance add column if not exists employee_id uuid references public.hr_employees(id) on delete cascade;

-- Drop old unique(day) constraint if exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.hr_attendance'::regclass
      AND contype = 'u'
      AND conname = 'hr_attendance_day_key'
  ) THEN
    ALTER TABLE public.hr_attendance DROP CONSTRAINT hr_attendance_day_key;
  END IF;
END $$;

-- Remove generic rows (no employee) if any existed from legacy UI
delete from public.hr_attendance where employee_id is null;

-- New unique per employee/day
create unique index if not exists hr_attendance_employee_day_uniq
  on public.hr_attendance(employee_id, day);

create index if not exists idx_hr_attendance_employee_day
  on public.hr_attendance(employee_id, day desc);
