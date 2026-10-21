-- 007 · El super administrador puede suspender cuentas
--
-- Sobre profiles solo habia dos politicas: cada uno gestiona la suya
-- ("perfil_propio") y el super administrador las LEE todas. Faltaba la de
-- escritura, asi que el boton de suspender en «Gestion de Usuarios» no hacia
-- nada contra la base.
--
-- El disparador proteger_campos_perfil ya exceptua al super administrador,
-- asi que tambien puede corregir un rol mal asignado.

create policy "superadmin_gestiona_profiles" on profiles
  for update using (es_superadmin()) with check (es_superadmin());
