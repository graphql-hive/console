--activities (up)

CREATE TABLE public.activities (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  target_id uuid REFERENCES public.targets(id) ON DELETE CASCADE,
  activity_type VARCHAR(30) NOT NULL,
  activity_metadata JSONB NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT NOW()
);