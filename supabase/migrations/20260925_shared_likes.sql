-- Shared likes. Apply in the Supabase SQL editor.
-- Until this is applied the like button still works on each reader's own device;
-- once applied, the count is shared by everyone (via /api/like).

create or replace function public.adjust_likes(p_id text, p_delta int)
returns int
language sql
security definer
set search_path = public
as $$
  update public.entries
     set likes = greatest(0, coalesce(likes, 0) + case when p_delta > 0 then 1 else -1 end)
   where id = p_id
  returning likes;
$$;

-- Only the server (service role) may call it, so the browser cannot bypass /api/like's rate limits.
revoke all on function public.adjust_likes(text, int) from public, anon, authenticated;
grant execute on function public.adjust_likes(text, int) to service_role;
