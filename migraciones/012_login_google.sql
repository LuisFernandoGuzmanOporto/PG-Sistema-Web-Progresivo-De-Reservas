-- 012 · El nombre de quien entra con Google
--
-- El disparador que crea el perfil solo miraba 'nombre', que es el campo que
-- manda nuestro formulario de registro. Google no usa ese nombre: manda
-- 'full_name' y 'name'. Sin esto, alguien que entrara con Google quedaba
-- registrado como la parte de su correo antes del arroba: 'dantevargas12345'
-- en vez de 'Dante Vargas'.
--
-- Tambien se guarda la foto de perfil que Google provee, si viene.

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nombre, correo, rol, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'nombre',      -- registro con nuestro formulario
      new.raw_user_meta_data->>'full_name',   -- Google
      new.raw_user_meta_data->>'name',        -- otros proveedores
      split_part(new.email, '@', 1)           -- ultimo recurso
    ),
    new.email,
    coalesce((new.raw_user_meta_data->>'rol')::public.rol_usuario, 'cliente'),
    coalesce(
      new.raw_user_meta_data->>'avatar_url',
      new.raw_user_meta_data->>'picture'
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
