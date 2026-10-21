-- 008 · Arreglar la creacion de usuarios
--
-- Sintoma: al crear una cuenta, Supabase respondia
-- «Database error creating new user». Pasaba tanto al registrarse un cliente
-- desde la pantalla de login como al dar de alta un empleado.
--
-- Causa: handle_new_user() no fijaba su search_path. Cuando el INSERT venia
-- del SQL Editor funcionaba, porque ahi el esquema public ya esta en el
-- camino de busqueda; pero cuando quien inserta es el servicio de
-- autenticacion, ese camino es otro y la funcion no encontraba ni la tabla
-- profiles ni el tipo rol_usuario. El error se veia generico porque el
-- servicio de autenticacion envuelve cualquier fallo del disparador.
--
-- Ademas, ahora tolera que el perfil ya exista: asi crear la cuenta no falla
-- si por cualquier motivo la fila ya estaba.

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public          -- esto es lo que faltaba
as $$
begin
  insert into public.profiles (id, nombre, correo, rol)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nombre', split_part(new.email, '@', 1)),
    new.email,
    coalesce((new.raw_user_meta_data->>'rol')::public.rol_usuario, 'cliente')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- El servicio de autenticacion tiene que poder ejecutar el disparador y
-- escribir el perfil que este crea.
grant usage on schema public to supabase_auth_admin;
grant insert, select on public.profiles to supabase_auth_admin;
