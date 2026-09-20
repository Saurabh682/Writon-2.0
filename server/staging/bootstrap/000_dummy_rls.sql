create function public.rls_auto_enable() returns trigger as $$
begin
  return new;
end;
$$ language plpgsql;
