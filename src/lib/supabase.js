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
