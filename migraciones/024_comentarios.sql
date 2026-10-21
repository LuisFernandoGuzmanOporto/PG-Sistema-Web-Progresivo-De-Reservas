-- 024 · Comentarios: la conversación, separada de la nota
--
-- Hasta ahora lo único que se podía escribir en un complejo era la reseña, y
-- había una sola por persona. Eso servía para la nota, pero no dejaba
-- conversar: nadie podía responderle a otro cliente, ni seguir preguntando.
--
-- Se agregan comentarios libres —cuantos quiera cada uno— PERO en una tabla
-- aparte de las calificaciones. La razón es que son dos cosas distintas:
--
--   La calificación es un VOTO. Sigue siendo una por persona y por complejo,
--   porque es la que arma el promedio. Si cada uno pudiera dejar diez, un
--   complejo consigue tres amigos y pasa de 3.2 a 4.9 estrellas. El promedio
--   dejaria de decir nada, que es lo primero que mira alguien para elegir
--   donde jugar.
--
--   El comentario es CONVERSACION. Ahi no hay nada que inflar, asi que no
--   tiene por que estar limitado.
--
-- Un comentario puede colgar de tres lugares:
--   * de nada          -> es un comentario suelto sobre el complejo
--   * de una reseña    -> le contesta a quien la escribió
--   * de otro comentario -> le contesta a esa persona

create table if not exists comentarios (
  id              uuid primary key default uuid_generate_v4(),
  empresa_id      uuid not null references empresas(id) on delete cascade,
  autor_id        uuid not null references profiles(id) on delete cascade,
  texto           text not null,

  -- A quien le responde. Como mucho uno de los dos.
  calificacion_id uuid references calificaciones(id) on delete cascade,
  responde_a      uuid references comentarios(id)    on delete cascade,

  created_at      timestamptz not null default now(),
  editado_at      timestamptz,

  constraint texto_con_contenido
    check (char_length(btrim(texto)) between 1 and 500),

  -- O cuelga de una reseña, o de otro comentario, o de ninguno. Nunca de dos.
  constraint responde_a_uno_solo
    check (calificacion_id is null or responde_a is null)
);

create index if not exists idx_comentarios_empresa
  on comentarios (empresa_id, created_at);
create index if not exists idx_comentarios_hilo
  on comentarios (responde_a);
create index if not exists idx_comentarios_calificacion
  on comentarios (calificacion_id);

alter table comentarios enable row level security;

-- Se leen igual que las reseñas: son públicos
drop policy if exists "comentarios_lectura" on comentarios;
create policy "comentarios_lectura" on comentarios
  for select using (true);

-- Cada uno escribe a su nombre. Sin esto se podría comentar haciéndose pasar
-- por otro, que es justo lo que evita la misma regla en calificaciones.
drop policy if exists "comentario_propio" on comentarios;
create policy "comentario_propio" on comentarios
  for insert with check (autor_id = auth.uid());

drop policy if exists "editar_mi_comentario" on comentarios;
create policy "editar_mi_comentario" on comentarios
  for update using (autor_id = auth.uid()) with check (autor_id = auth.uid());

-- Borra el autor, o el complejo. El complejo lo necesita para moderar: si
-- alguien insulta en su ficha, tiene que poder sacarlo sin pedirle permiso a
-- Sportika.
drop policy if exists "borrar_comentario" on comentarios;
create policy "borrar_comentario" on comentarios
  for delete using (autor_id = auth.uid() or administra_empresa(empresa_id));

-- Al editar solo se cambia el texto. Sin esto alguien podría mover su
-- comentario a otra empresa, o colgarlo de otra conversación, y quedaría
-- respondiendo algo que nunca leyó.
create or replace function proteger_comentario()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user = 'authenticated' then
    new.empresa_id      := old.empresa_id;
    new.autor_id        := old.autor_id;
    new.calificacion_id := old.calificacion_id;
    new.responde_a      := old.responde_a;
    new.created_at      := old.created_at;
    if new.texto is distinct from old.texto then
      new.editado_at := now();
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_proteger_comentario on comentarios;
create trigger trg_proteger_comentario
  before update on comentarios
  for each row execute function proteger_comentario();


-- ── Avisarle a quien le hablaron ─────────────────────────────────────────
--
-- Un comentario que nadie ve no sirve de nada. El aviso sale del disparador y
-- no del navegador por lo mismo de siempre: asi no hace falta una politica que
-- deje escribirle notificaciones a otro.

create or replace function notificar_comentario()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  autor      text;
  destino    uuid;
  nombre_emp text;
  titulo     text;
begin
  select nombre into autor from profiles where id = new.autor_id;
  select nombre into nombre_emp from empresas where id = new.empresa_id;

  -- Le responde a otro comentario
  if new.responde_a is not null then
    select autor_id into destino from comentarios where id = new.responde_a;
    titulo := coalesce(autor, 'Alguien') || ' respondió tu comentario';

  -- Le responde a una reseña
  elsif new.calificacion_id is not null then
    select cliente_id into destino from calificaciones where id = new.calificacion_id;
    titulo := coalesce(autor, 'Alguien') || ' respondió tu reseña';

  -- Comentario suelto: se entera el complejo, que es quien puede contestarlo.
  -- A nadie le "respondieron" acá, asi que el texto es otro.
  else
    select admin_id into destino from empresas where id = new.empresa_id;
    titulo := 'Nuevo comentario en ' || coalesce(nombre_emp, 'tu complejo');
  end if;

  -- Nadie se avisa a si mismo
  if destino is null or destino = new.autor_id then
    return new;
  end if;

  perform avisar(destino, 'comentario', titulo,
    left(btrim(new.texto), 90) ||
      case when char_length(btrim(new.texto)) > 90 then '…' else '' end,
    '/app/empresa/' || new.empresa_id);

  return new;
end;
$$;

drop trigger if exists trg_notificar_comentario on comentarios;
create trigger trg_notificar_comentario
  after insert on comentarios
  for each row execute function notificar_comentario();
