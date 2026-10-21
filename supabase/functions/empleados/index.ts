// Cuentas de empleado
//
// Crear un usuario o cambiarle la contrasena exige la clave de servicio de
// Supabase, y esa clave NO puede estar en el navegador: cualquiera que abra
// las herramientas de desarrollo la veria y tendria control total de la base.
// Por eso vive aca, en el servidor, y el navegador solo pide el favor.
//
// Antes de hacer nada se verifica quien pregunta: tiene que ser el
// administrador de esa misma empresa. Que el boton solo aparezca en la
// pantalla del administrador no es seguridad; esto si lo es.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Supabase inyecta estas variables solo: no hay que configurarlas.
// Se aceptan los dos juegos de nombres porque los proyectos nuevos usan
// «publishable / secret» y los anteriores «anon / service_role».
const URL = Deno.env.get('SUPABASE_URL')!
const ANON =
  Deno.env.get('SUPABASE_ANON_KEY') ??
  Deno.env.get('SUPABASE_PUBLISHABLE_KEY')!
const SERVICIO =
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ??
  Deno.env.get('SUPABASE_SECRET_KEY')!

// El navegador pregunta primero si puede mandar ciertas cabeceras, y solo
// manda el pedido si la respuesta las nombra TODAS. La libreria de Supabase
// agrega 'apikey' y 'x-client-info' ademas de las obvias: si faltan de esta
// lista, el pedido nunca sale y el error que se ve es un confuso
// «Failed to send a request to the Edge Function».
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Los unicos permisos que existen. Uno mal escrito no rompe nada, pero el
// empleado se queda sin la pantalla que su jefe creia haberle dado: mejor
// rechazarlo aqui que dejar que falle en silencio.
const PERMISOS_VALIDOS = [
  'reservas_confirmar', 'reservas_crear', 'asistencia', 'recompensas',
  'canchas_estado', 'entrenamientos', 'torneos_mesa',
]

const responder = (cuerpo: unknown, status = 200) =>
  new Response(JSON.stringify(cuerpo), {
    status, headers: { ...CORS, 'Content-Type': 'application/json' },
  })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  if (!URL || !ANON || !SERVICIO) {
    return responder({ error: 'A la funcion le faltan las claves del proyecto' }, 500)
  }

  try {
    // ── Quien esta pidiendo esto ────────────────────────────────────────
    const token = req.headers.get('Authorization') ?? ''
    if (!token) return responder({ error: 'Falta la sesion' }, 401)

    const comoUsuario = createClient(URL, ANON, {
      global: { headers: { Authorization: token } },
    })
    const { data: { user } } = await comoUsuario.auth.getUser()
    if (!user) return responder({ error: 'Sesion invalida' }, 401)

    const admin = createClient(URL, SERVICIO, { auth: { persistSession: false } })

    // ── Que empresa administra ──────────────────────────────────────────
    const { data: perfil } = await admin
      .from('profiles').select('rol, nombre').eq('id', user.id).single()
    if (perfil?.rol !== 'admin_empresa') {
      return responder({ error: 'Solo el administrador del complejo puede hacer esto' }, 403)
    }

    const { data: empresa } = await admin
      .from('empresas').select('id, nombre').eq('admin_id', user.id).maybeSingle()
    if (!empresa) return responder({ error: 'No administras ningun complejo' }, 403)

    const cuerpo = await req.json()

    // ── Crear la cuenta ─────────────────────────────────────────────────
    if (cuerpo.accion === 'crear') {
      const { correo, usuario, password, nombre, turno, permisos, telefono } = cuerpo
      if (!correo || !password || !nombre) {
        return responder({ error: 'Faltan el nombre, el correo o la contrasena' }, 400)
      }
      if (String(password).length < 6) {
        return responder({ error: 'La contrasena tiene que tener al menos 6 caracteres' }, 400)
      }

      const invalidos = (permisos ?? []).filter((p: string) => !PERMISOS_VALIDOS.includes(p))
      if (invalidos.length) {
        return responder({ error: 'Permisos que no existen: ' + invalidos.join(', ') }, 400)
      }

      // El empleado no confirma correo: la cuenta se la entrega el administrador
      const { data: creado, error: errorAlta } = await admin.auth.admin.createUser({
        email: correo, password, email_confirm: true,
        // El rol va en app_metadata: solo el servidor puede escribirlo. La base
        // ya no acepta el rol que venga en user_metadata (migraciones/037).
        user_metadata: { nombre },
        app_metadata: { rol: 'empleado' },
      })
      if (errorAlta) return responder({ error: errorAlta.message }, 400)

      // El disparador de la base crea el perfil como 'cliente': cuando corre,
      // Supabase todavia no guardo el app_metadata. El rol lo pone aqui el
      // servidor, con la clave de servicio; desde el navegador nadie puede.
      const { error: errorRol } = await admin.from('profiles')
        .update({ rol: 'empleado' }).eq('id', creado.user.id)
      if (errorRol) {
        await admin.auth.admin.deleteUser(creado.user.id)
        return responder({ error: 'No se pudo asignar el rol de empleado' }, 500)
      }

      // Falta ligarlo al complejo
      const { data: empleado, error: errorLigar } = await admin.from('empleados').insert({
        id: creado.user.id, empresa_id: empresa.id,
        usuario: usuario ?? correo, turno: turno ?? null,
        permisos: permisos ?? [], activo: true,
      }).select().single()

      if (errorLigar) {
        // Si no se pudo ligar, no dejamos una cuenta suelta sin empresa
        await admin.auth.admin.deleteUser(creado.user.id)
        return responder({ error: errorLigar.message }, 400)
      }

      if (telefono) {
        await admin.from('profiles').update({ telefono }).eq('id', creado.user.id)
      }

      await admin.from('bitacora').insert({
        empresa_id: empresa.id, actor_id: user.id,
        actor_nombre: perfil.nombre, tipo: 'cuenta',
        accion: 'Creó la cuenta de un empleado', detalle: nombre + ' \u00b7 ' + correo,
      })

      return responder({ empleado: { ...empleado, nombre } })
    }

    // ── Cambiar la contrasena ───────────────────────────────────────────
    if (cuerpo.accion === 'clave') {
      const { empleadoId, password } = cuerpo
      if (String(password ?? '').length < 6) {
        return responder({ error: 'La contrasena tiene que tener al menos 6 caracteres' }, 400)
      }

      // Solo la de SUS empleados, no la de cualquiera
      const { data: emp } = await admin
        .from('empleados').select('id, usuario').eq('id', empleadoId)
        .eq('empresa_id', empresa.id).maybeSingle()
      if (!emp) return responder({ error: 'Ese empleado no es de tu complejo' }, 403)

      const { error } = await admin.auth.admin.updateUserById(empleadoId, { password })
      if (error) return responder({ error: error.message }, 400)

      await admin.from('bitacora').insert({
        empresa_id: empresa.id, actor_id: user.id,
        actor_nombre: perfil.nombre, tipo: 'cuenta',
        accion: 'Cambió la contraseña de un empleado', detalle: emp.usuario,
      })

      return responder({ ok: true })
    }

    return responder({ error: 'Accion desconocida' }, 400)
  } catch (e) {
    return responder({ error: String((e as Error).message ?? e) }, 500)
  }
})
