-- 045 · Un capitán inscribe un solo equipo por torneo
--
-- Lo encontraron las pruebas de usabilidad: después de inscribir su equipo,
-- el cliente no lo veía en ninguna parte y el torneo le seguía ofreciendo
-- «Inscribir mi equipo». Si lo volvía a tocar, quedaban dos equipos suyos en
-- el mismo torneo. La pantalla ya no lo ofrece; esto lo asegura en la base,
-- también si el formulario se envía dos veces a la vez.
--
-- Un equipo rechazado no cuenta: el capitán puede corregir lo que faltaba y
-- volver a inscribirse.
--
-- No borra nada. Se puede ejecutar más de una vez.


-- ── 1. Un equipo vigente por capitán y torneo ───────────────────────────────
create or replace function un_equipo_por_capitan()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.capitan_id is null then
    return new;
  end if;

  -- Dos envíos a la vez no pasan los dos: el segundo espera a que termine el
  -- primero y ya lo encuentra
  perform pg_advisory_xact_lock(hashtext('inscripcion ' || new.torneo_id::text || ' ' || new.capitan_id::text));

  if exists (select 1 from equipos
              where torneo_id = new.torneo_id
                and capitan_id = new.capitan_id
                and estado <> 'rechazado'
                and id <> new.id) then
    raise exception 'Ya inscribiste un equipo en este torneo';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_un_equipo_por_capitan on equipos;
create trigger trg_un_equipo_por_capitan before insert on equipos
  for each row execute function un_equipo_por_capitan();


-- ── 2. Versión del esquema ───────────────────────────────────────────────────
create or replace function version_esquema()
returns integer
language sql stable
as $$ select 45 $$;
grant execute on function version_esquema() to anon, authenticated;


-- Verificación: la versión es 45
select 'version ' || version_esquema();
