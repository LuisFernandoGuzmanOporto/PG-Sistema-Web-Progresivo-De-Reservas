-- 020 · Los archivos de verdad: QR de pago y comprobantes
--
-- Hasta ahora las pantallas pedian una foto pero solo se quedaban con el
-- NOMBRE del archivo ('IMG_2034.jpg'). El archivo nunca salia del telefono.
-- El resultado: el cliente veia un cuadro gris que decia "QR" en vez del QR
-- del complejo, y el administrador aprobaba el pago sin ver el comprobante.
--
-- Postgres guarda texto y numeros, no imagenes. Los archivos van a Storage,
-- que es el disco de Supabase, y en la tabla queda solo la ruta.
--
-- Dos depositos, porque no todos los archivos son igual de publicos:
--
--   publico       QR, logos y fotos de los complejos. Abierto, porque no hay
--                 nada que esconder: el QR de pago es el mismo codigo que el
--                 complejo imprime y cuelga en la pared. Lo que se gana es que
--                 tiene direccion fija y un <img> lo muestra sin pedir permiso
--                 ni renovar nada. (Hoy igual hay que iniciar sesion para ver
--                 un complejo; esto no cambia eso.)
--
--   comprobantes  La foto del pago de una persona, con su nombre y su banco.
--                 Cerrado. No se sirve por URL fija: la aplicacion pide un
--                 enlace firmado que caduca en minutos, y solo lo consiguen
--                 quien lo subio, el complejo al que le pago, el organizador
--                 del torneo y el super administrador.

-- ── 1. La columna que faltaba ────────────────────────────────────────────
-- El QR es del complejo, no de cada cancha: el dinero cae siempre a la misma
-- cuenta. Pedirlo cancha por cancha seria hacerle subir la misma imagen tres
-- veces al mismo dueno.
alter table empresas add column if not exists qr_pago_url text;


-- ── 2. Los depositos ─────────────────────────────────────────────────────
-- El limite de tamano y los tipos permitidos los aplica el servidor. Si solo
-- se controlaran en el navegador, bastaria con abrir la consola para saltarlos.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('publico', 'publico', true, 5242880,
   array['image/png','image/jpeg','image/jpg','image/webp']),
  ('comprobantes', 'comprobantes', false, 10485760,
   array['image/png','image/jpeg','image/jpg','image/webp','application/pdf'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;


-- ── 3. Ayudantes ─────────────────────────────────────────────────────────

-- Las rutas son texto: si alguien sube algo a una carpeta que no es un id,
-- el casteo revienta y la consulta entera falla. Esto devuelve null y sigue.
create or replace function public.uuid_seguro(txt text)
returns uuid
language plpgsql immutable
as $$
begin
  return txt::uuid;
exception when others then
  return null;
end;
$$;

-- SECURITY DEFINER a proposito: la politica necesita saber si esa empresa
-- existe, y 'empresas' tiene su propio RLS que le esconderia las pendientes.
create or replace function public.empresa_existe(emp uuid)
returns boolean
language sql stable security definer set search_path = public
as $$ select exists (select 1 from empresas where id = emp) $$;

-- Quien puede MIRAR un comprobante, segun donde esta guardado.
--   <empresa_id>/reservas/<archivo>          -> el complejo que cobra
--   <empresa_id>/torneos/<torneo_id>/<arch>  -> ademas, quien organiza
create or replace function public.puede_ver_comprobante(ruta text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select es_superadmin()
      or trabaja_en_empresa(uuid_seguro((storage.foldername(ruta))[1]))
      or ( (storage.foldername(ruta))[2] = 'torneos'
           and organiza_torneo(uuid_seguro((storage.foldername(ruta))[3])) )
$$;

-- Quien puede ESCRIBIR en el deposito publico. Sin esto, cualquier usuario
-- con la consola abierta podria reemplazar el QR de un complejo por el suyo
-- y quedarse con los pagos.
--   <empresa_id>/<archivo>            -> solo el dueno del complejo
--   torneos/<torneo_id>/<archivo>     -> quien lo organiza o su complejo
create or replace function public.puede_escribir_publico(ruta text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select es_superadmin()
      or case when (storage.foldername(ruta))[1] = 'torneos'
              then organiza_torneo(uuid_seguro((storage.foldername(ruta))[2]))
                or trabaja_en_empresa(
                     empresa_del_torneo(uuid_seguro((storage.foldername(ruta))[2])))
              else administra_empresa(uuid_seguro((storage.foldername(ruta))[1]))
         end
$$;


-- ── 4. Permisos sobre los archivos ───────────────────────────────────────

drop policy if exists "publico_lectura" on storage.objects;
create policy "publico_lectura" on storage.objects
  for select using (bucket_id = 'publico');

drop policy if exists "publico_subir" on storage.objects;
create policy "publico_subir" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'publico' and puede_escribir_publico(name));

drop policy if exists "publico_reemplazar" on storage.objects;
create policy "publico_reemplazar" on storage.objects
  for update to authenticated
  using      (bucket_id = 'publico' and puede_escribir_publico(name))
  with check (bucket_id = 'publico' and puede_escribir_publico(name));

drop policy if exists "publico_borrar" on storage.objects;
create policy "publico_borrar" on storage.objects
  for delete to authenticated
  using (bucket_id = 'publico' and puede_escribir_publico(name));

-- Subir un comprobante lo puede hacer cualquiera que haya iniciado sesion
-- (el cliente que paga), pero solo dentro de la carpeta de un complejo que
-- exista: asi el deposito no se llena de archivos sueltos.
drop policy if exists "comprobante_subir" on storage.objects;
create policy "comprobante_subir" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'comprobantes'
    and empresa_existe(uuid_seguro((storage.foldername(name))[1]))
  );

drop policy if exists "comprobante_ver" on storage.objects;
create policy "comprobante_ver" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'comprobantes'
    and (owner = auth.uid() or puede_ver_comprobante(name))
  );

-- Borrar un comprobante no lo hace nadie desde la aplicacion: es la prueba
-- del pago. Queda solo para el super administrador.
drop policy if exists "comprobante_borrar" on storage.objects;
create policy "comprobante_borrar" on storage.objects
  for delete to authenticated
  using (bucket_id = 'comprobantes' and es_superadmin());


-- ── 5. Un equipo no se aprueba solo ──────────────────────────────────────
--
-- Esto aparecio al conectar la subida del comprobante. La politica
-- "equipos_gestion" es FOR ALL con  capitan_id = auth.uid(), porque el capitan
-- tiene que poder corregir el nombre de su equipo y adjuntar su comprobante.
-- Pero eso mismo lo dejaba escribir  estado = 'aprobado'  sobre su propia
-- inscripcion: entraba al torneo sin pagar y sin que el organizador lo viera.
--
-- Tambien se protege 'grupo': el sorteo lo hace el organizador, y un capitan
-- que se cambiara de grupo alteraria el fixture.
--
-- Mismo criterio que la 014 y la 019: SECURITY INVOKER, sin declararlo.
create or replace function proteger_campos_equipo()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user = 'authenticated'
     and not organiza_torneo(old.torneo_id)
     and not es_superadmin() then
    new.estado := old.estado;
    new.grupo  := old.grupo;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_proteger_equipo on equipos;
create trigger trg_proteger_equipo
  before update on equipos
  for each row execute function proteger_campos_equipo();
