-- 006 · sumar_puntos deja de ser invocable desde el navegador
--
-- El esquema hacia  grant execute on all functions ... to authenticated,  lo
-- que dejaba a cualquier usuario conectado llamar a sumar_puntos y regalarse
-- (o regalarle a otro) los puntos que quisiera. Se comprobo en una prueba:
-- una empleada le sumo 50 puntos a un cliente desde la consola del navegador.
--
-- Los puntos se otorgan desde adentro de la base. Nadie los pide de afuera.

revoke execute on function sumar_puntos(uuid, text, integer, uuid)
  from anon, authenticated;

-- canjear_recompensa SI se llama desde la app, pero no acepta un cliente por
-- parametro: siempre trabaja sobre auth.uid(). Por eso puede quedar abierta.
grant execute on function canjear_recompensa(uuid) to authenticated;
