-- 015 · Las solicitudes de complejo van a la tabla de empresas
--
-- El formulario de «Registrar mi complejo» guardaba la solicitud en
-- solicitudes_empresa, pero la pantalla del super administrador lee de
-- empresas. Resultado: la solicitud se guardaba y nadie la veia nunca.
--
-- La tabla empresas ya estaba preparada para esto: su estado admite
-- 'pendiente' y 'rechazado', y los clientes solo ven las 'activo'. Asi que el
-- complejo se crea ahi desde el principio, pendiente de aprobacion. El codigo
-- de la aplicacion ya quedo corregido; esto trae lo que se registro antes.

-- ── 1. Pasar las solicitudes que quedaron sueltas ─────────────────────────

insert into empresas (nombre, zona, direccion, telefono, descripcion, estado, admin_id, created_at)
select s.nombre_empresa, s.zona, s.direccion, s.telefono, s.descripcion,
       'pendiente'::estado_empresa, p.id, s.created_at
from solicitudes_empresa s
join profiles p on p.correo = s.admin_correo
where s.estado = 'pendiente'
  and not exists (
    select 1 from empresas e where e.admin_id = p.id
  );

-- Y sus deportes
insert into empresa_deportes (empresa_id, deporte)
select e.id, d.deporte
from solicitudes_empresa s
join profiles p on p.correo = s.admin_correo
join empresas e on e.admin_id = p.id
cross join lateral unnest(s.deportes) as d(deporte)
on conflict do nothing;

-- ── 2. Dejar constancia de para que sirve la tabla vieja ──────────────────
-- No se borra: puede figurar en el diagrama del proyecto. Pero conviene que
-- quede escrito que ya no es la que manda, para no volver a caer en lo mismo.

comment on table solicitudes_empresa is
  'HISTORICO. La solicitud de un complejo se crea directamente en empresas con
   estado ''pendiente''. Esta tabla ya no la lee la aplicacion.';

-- ── 3. Comprobacion ───────────────────────────────────────────────────────

select nombre, zona, estado, to_char(created_at, 'DD/MM HH24:MI') as solicitada
from empresas
where estado = 'pendiente'
order by created_at desc;
