-- 036 · Las reglas de seguridad ya no frenan la lectura
--
-- La prueba de carga con la aplicación real mostró que cada apertura costaba
-- unos 150 ms de trabajo de la base, y que el servidor gratuito no pasaba de
-- unas 11 aperturas por segundo, con 24 peticiones o con una sola.
--
-- La causa estaba en las políticas RLS. Doce tablas que cualquiera puede leer
-- (canchas, torneos, equipos, jugadores, partidos, eventos…) tienen además una
-- política de gestión declarada FOR ALL: «el organizador puede modificar sus
-- partidos», «el capitán puede editar su plantel». FOR ALL incluye SELECT, así
-- que al LEER Postgres también evaluaba esas condiciones, fila por fila, y cada
-- una llama a funciones que hacen su propia consulta (organiza_torneo,
-- trabaja_en_empresa…). Con 400 jugadores y 350 eventos eran cientos de
-- consultas extra por cada apertura, para un resultado que ya estaba decidido:
-- la política de lectura dice TRUE.
--
-- Se separa cada política FOR ALL en INSERT, UPDATE y DELETE con las MISMAS
-- condiciones. Nadie gana ni pierde ningún permiso: la lectura sigue abierta
-- (ya lo estaba) y crear, modificar y borrar exigen lo mismo que antes.

-- empresa_deportes
drop policy if exists "deportes_admin" on empresa_deportes;
create policy "deportes_admin_crear" on empresa_deportes
  for insert with check (administra_empresa(empresa_id));
create policy "deportes_admin_modificar" on empresa_deportes
  for update using (administra_empresa(empresa_id)) with check (administra_empresa(empresa_id));
create policy "deportes_admin_borrar" on empresa_deportes
  for delete using (administra_empresa(empresa_id));

-- canchas
drop policy if exists "personal_canchas" on canchas;
create policy "personal_canchas_crear" on canchas
  for insert with check (trabaja_en_empresa(empresa_id));
create policy "personal_canchas_modificar" on canchas
  for update using (trabaja_en_empresa(empresa_id)) with check (trabaja_en_empresa(empresa_id));
create policy "personal_canchas_borrar" on canchas
  for delete using (trabaja_en_empresa(empresa_id));

-- entrenadores
drop policy if exists "admin_entrenadores" on entrenadores;
create policy "admin_entrenadores_crear" on entrenadores
  for insert with check (administra_empresa(empresa_id));
create policy "admin_entrenadores_modificar" on entrenadores
  for update using (administra_empresa(empresa_id)) with check (administra_empresa(empresa_id));
create policy "admin_entrenadores_borrar" on entrenadores
  for delete using (administra_empresa(empresa_id));

-- entrenamientos
drop policy if exists "admin_entrenamientos" on entrenamientos;
create policy "admin_entrenamientos_crear" on entrenamientos
  for insert with check (administra_empresa(empresa_id));
create policy "admin_entrenamientos_modificar" on entrenamientos
  for update using (administra_empresa(empresa_id)) with check (administra_empresa(empresa_id));
create policy "admin_entrenamientos_borrar" on entrenamientos
  for delete using (administra_empresa(empresa_id));

-- torneos
drop policy if exists "organizador_torneo" on torneos;
create policy "organizador_torneo_crear" on torneos
  for insert with check (creador_id = auth.uid() OR trabaja_en_empresa(empresa_id));
create policy "organizador_torneo_modificar" on torneos
  for update using (creador_id = auth.uid() OR trabaja_en_empresa(empresa_id)) with check (creador_id = auth.uid() OR trabaja_en_empresa(empresa_id));
create policy "organizador_torneo_borrar" on torneos
  for delete using (creador_id = auth.uid() OR trabaja_en_empresa(empresa_id));

-- equipos
drop policy if exists "equipos_gestion" on equipos;
create policy "equipos_gestion_crear" on equipos
  for insert with check (capitan_id = auth.uid() OR organiza_torneo(torneo_id));
create policy "equipos_gestion_modificar" on equipos
  for update using (capitan_id = auth.uid() OR organiza_torneo(torneo_id)) with check (capitan_id = auth.uid() OR organiza_torneo(torneo_id));
create policy "equipos_gestion_borrar" on equipos
  for delete using (capitan_id = auth.uid() OR organiza_torneo(torneo_id));

-- equipo_jugadores
drop policy if exists "jugadores_gestion" on equipo_jugadores;
create policy "jugadores_gestion_crear" on equipo_jugadores
  for insert with check (EXISTS (SELECT 1 FROM equipos e WHERE e.id = equipo_jugadores.equipo_id AND (e.capitan_id = auth.uid() OR organiza_torneo(e.torneo_id))));
create policy "jugadores_gestion_modificar" on equipo_jugadores
  for update using (EXISTS (SELECT 1 FROM equipos e WHERE e.id = equipo_jugadores.equipo_id AND (e.capitan_id = auth.uid() OR organiza_torneo(e.torneo_id)))) with check (EXISTS (SELECT 1 FROM equipos e WHERE e.id = equipo_jugadores.equipo_id AND (e.capitan_id = auth.uid() OR organiza_torneo(e.torneo_id))));
create policy "jugadores_gestion_borrar" on equipo_jugadores
  for delete using (EXISTS (SELECT 1 FROM equipos e WHERE e.id = equipo_jugadores.equipo_id AND (e.capitan_id = auth.uid() OR organiza_torneo(e.torneo_id))));

-- partidos_torneo
drop policy if exists "mesa_partidos" on partidos_torneo;
create policy "mesa_partidos_crear" on partidos_torneo
  for insert with check (organiza_torneo(torneo_id) OR trabaja_en_empresa(empresa_del_torneo(torneo_id)));
create policy "mesa_partidos_modificar" on partidos_torneo
  for update using (organiza_torneo(torneo_id) OR trabaja_en_empresa(empresa_del_torneo(torneo_id))) with check (organiza_torneo(torneo_id) OR trabaja_en_empresa(empresa_del_torneo(torneo_id)));
create policy "mesa_partidos_borrar" on partidos_torneo
  for delete using (organiza_torneo(torneo_id) OR trabaja_en_empresa(empresa_del_torneo(torneo_id)));

-- eventos_partido
drop policy if exists "mesa_eventos" on eventos_partido;
create policy "mesa_eventos_crear" on eventos_partido
  for insert with check (EXISTS (SELECT 1 FROM partidos_torneo p WHERE p.id = eventos_partido.partido_id AND (organiza_torneo(p.torneo_id) OR trabaja_en_empresa(empresa_del_torneo(p.torneo_id)))));
create policy "mesa_eventos_modificar" on eventos_partido
  for update using (EXISTS (SELECT 1 FROM partidos_torneo p WHERE p.id = eventos_partido.partido_id AND (organiza_torneo(p.torneo_id) OR trabaja_en_empresa(empresa_del_torneo(p.torneo_id))))) with check (EXISTS (SELECT 1 FROM partidos_torneo p WHERE p.id = eventos_partido.partido_id AND (organiza_torneo(p.torneo_id) OR trabaja_en_empresa(empresa_del_torneo(p.torneo_id)))));
create policy "mesa_eventos_borrar" on eventos_partido
  for delete using (EXISTS (SELECT 1 FROM partidos_torneo p WHERE p.id = eventos_partido.partido_id AND (organiza_torneo(p.torneo_id) OR trabaja_en_empresa(empresa_del_torneo(p.torneo_id)))));

-- partidos_espontaneos
drop policy if exists "creador_partido_esp" on partidos_espontaneos;
create policy "creador_partido_esp_crear" on partidos_espontaneos
  for insert with check (creador_id = auth.uid());
create policy "creador_partido_esp_modificar" on partidos_espontaneos
  for update using (creador_id = auth.uid()) with check (creador_id = auth.uid());
create policy "creador_partido_esp_borrar" on partidos_espontaneos
  for delete using (creador_id = auth.uid());

-- partido_jugadores
drop policy if exists "unirse_al_partido" on partido_jugadores;
create policy "unirse_al_partido_crear" on partido_jugadores
  for insert with check (jugador_id = auth.uid());
create policy "unirse_al_partido_modificar" on partido_jugadores
  for update using (jugador_id = auth.uid()) with check (jugador_id = auth.uid());
create policy "unirse_al_partido_borrar" on partido_jugadores
  for delete using (jugador_id = auth.uid());

-- recompensas
drop policy if exists "admin_recompensas" on recompensas;
create policy "admin_recompensas_crear" on recompensas
  for insert with check (administra_empresa(empresa_id));
create policy "admin_recompensas_modificar" on recompensas
  for update using (administra_empresa(empresa_id)) with check (administra_empresa(empresa_id));
create policy "admin_recompensas_borrar" on recompensas
  for delete using (administra_empresa(empresa_id));

-- La versión del esquema, para las pruebas (pruebas/integracion/esquema.test.js)
create or replace function version_esquema()
returns integer
language sql stable
as $$ select 36 $$;
