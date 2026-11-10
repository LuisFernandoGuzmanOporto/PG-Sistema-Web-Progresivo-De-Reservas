import { createClient } from '@supabase/supabase-js'

// El unico cliente de Supabase de la aplicacion. Se crea una sola vez: si cada
// pantalla creara el suyo, cada uno guardaria su propia sesion y el usuario
// aparecería conectado en una pantalla y desconectado en otra.
//
// La clave publicable es justamente eso, publicable: viaja al navegador y
// cualquiera puede verla. Lo que protege los datos no es esta clave sino las
// politicas RLS de la base, que deciden que fila puede ver o tocar cada quien.
// El esquema completo esta en sportika_schema.sql, y los cambios posteriores
// en la carpeta migraciones/.

const url   = import.meta.env.VITE_SUPABASE_URL
const clave = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !clave) {
  throw new Error(
    'Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en el archivo .env. ' +
    'Copia los valores desde Supabase > Project Settings > API.'
  )
}

export const supabase = createClient(url, clave)

// Las consultas de lectura se reintentan solas si falla la red: tres veces,
// esperando 1, 2 y 4 segundos. Con internet eso salva un corte de un instante,
// pero sin conexión dejaba la aplicación 7 segundos en «Cargando…» antes de
// avisar que no había internet (lo encontró la prueba PE-22). Ahora reintenta
// solo si el navegador tiene red; si no la tiene, falla al momento y aparece
// el aviso. El cliente lee este valor cada vez que arma una consulta.
Object.defineProperty(supabase.rest, 'retry', {
  get: () => typeof navigator === 'undefined' || navigator.onLine !== false,
  configurable: true,
})
