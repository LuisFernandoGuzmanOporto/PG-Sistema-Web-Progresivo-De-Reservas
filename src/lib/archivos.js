import { supabase } from './supabase'
import { traducirError } from './errores'

// ─────────────────────────────────────────────────────────────────────────────
// ARCHIVOS
//
// Postgres guarda texto y numeros, no imagenes. Los archivos van a Storage,
// que es el disco de Supabase, y en la tabla queda solo la RUTA
// ('a1b2.../qr-9f8e.png'). La direccion para verlos se arma al mostrarlos.
//
// Dos depositos, creados en la migracion 020:
//
//   publico       QR de pago, logos y fotos. Tienen direccion fija, asi que
//                 un <img> los muestra y listo.
//
//                 Estan abiertos porque no hay nada que esconder: el QR es el
//                 mismo codigo que el complejo imprime y cuelga en la pared.
//                 Cerrarlo obligaria a pedir un enlace firmado cada vez que se
//                 abre la pantalla y a renovarlo cuando caduca: mas trabajo y
//                 mas cosas que pueden fallar, sin proteger nada.
//
//   comprobantes  La foto del pago de una persona, con su nombre y su banco.
//                 Eso si es suyo. Cerrado: no hay direccion fija que sirva, se
//                 pide un enlace firmado que caduca a los cinco minutos.
//
// Los limites de tamano y los tipos permitidos tambien estan puestos en el
// servidor. Los de aqui son para avisar antes de gastar la subida, no para
// proteger: cualquiera puede saltarse una validacion del navegador.
// ─────────────────────────────────────────────────────────────────────────────

const MB = 1024 * 1024

export const TIPOS_IMAGEN = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
export const TIPOS_COMPROBANTE = [...TIPOS_IMAGEN, 'application/pdf']

const LIMITE_PUBLICO = 5 * MB
const LIMITE_COMPROBANTE = 10 * MB

/** 'comprobante final.JPG' → 'jpg'. Sin punto y en minusculas. */
const extension = (archivo) => {
  const partes = String(archivo.name || '').split('.')
  const ext = partes.length > 1 ? partes.pop().toLowerCase() : ''
  return /^[a-z0-9]{1,5}$/.test(ext) ? ext : 'bin'
}

/** Un nombre que no se repite ni se puede adivinar. */
const nombreUnico = (archivo) =>
  (crypto.randomUUID?.() || String(Date.now()) + Math.random().toString(16).slice(2)) +
  '.' + extension(archivo)

/**
 * Revisa el archivo antes de subirlo.
 * Devuelve el aviso para mostrar, o null si esta bien.
 */
export function revisarArchivo(archivo, { tipos, limite }) {
  if (!archivo) return 'No seleccionaste ningún archivo.'

  if (!tipos.includes(archivo.type)) {
    return tipos.includes('application/pdf')
      ? 'El archivo debe ser una imagen (JPG, PNG o WEBP) o un PDF.'
      : 'El archivo debe ser una imagen JPG, PNG o WEBP.'
  }

  if (archivo.size > limite) {
    const mb = Math.round(limite / MB)
    return `El archivo supera el tamaño máximo de ${mb} MB. Sube una foto ` +
           'más liviana o reduce su calidad.'
  }

  return null
}

const falloDeSubida = (error) => {
  const m = (error?.message || '').toLowerCase()

  // El mensaje que devuelve Storage cuando una politica no deja escribir no
  // le dice nada a quien lo lee, asi que se traduce.
  if (m.includes('row-level security') || m.includes('unauthorized') || m.includes('403')) {
    return { error: 'No tienes permiso para subir este archivo.' }
  }
  if (m.includes('exceeded') || m.includes('too large')) {
    return { error: 'El archivo supera el tamaño permitido.' }
  }
  if (m.includes('mime')) {
    return { error: 'Este tipo de archivo no está permitido.' }
  }
  return { error: traducirError(error, 'No se pudo subir el archivo. Inténtalo de nuevo.') }
}

/**
 * Sube una imagen que todos van a ver (QR, logo, foto del complejo).
 *
 * `carpeta` decide quien puede escribir ahi, porque la politica del deposito
 * mira el primer tramo de la ruta: el id del complejo, o 'torneos/<id>'.
 *
 * `anterior` es la ruta que se reemplaza. Se borra despues de que la nueva
 * quedo guardada: si se borrara antes y la subida fallara, el complejo se
 * quedaria sin QR.
 */
export async function subirPublico({ carpeta, archivo, anterior }) {
  const aviso = revisarArchivo(archivo, { tipos: TIPOS_IMAGEN, limite: LIMITE_PUBLICO })
  if (aviso) return { error: aviso }

  const ruta = carpeta + '/' + nombreUnico(archivo)
  const { error } = await supabase.storage.from('publico')
    .upload(ruta, archivo, { contentType: archivo.type })

  if (error) return falloDeSubida(error)

  if (anterior && anterior !== ruta) {
    await supabase.storage.from('publico').remove([anterior])
  }

  return { ruta }
}

/** Borra un archivo del deposito publico (una foto que se reemplazo). */
export async function borrarPublico(ruta) {
  if (!ruta || /^https:\/\//.test(ruta)) return { ok: true }
  const { error } = await supabase.storage.from('publico').remove([ruta])
  return error ? { error: traducirError(error) } : { ok: true }
}

/**
 * La direccion de una foto de perfil. Puede ser la de la cuenta de Google
 * (una direccion completa) o una subida al sistema (avatares/<id>/...).
 */
export function urlDeFoto(valor) {
  if (!valor || typeof valor !== 'string') return null
  if (/^https:\/\//.test(valor)) return valor
  return urlPublica(valor)
}

/**
 * Sube el comprobante de un pago. Va al deposito cerrado.
 *
 * Acepta PDF ademas de imagen porque los bancos de aquí mandan el
 * comprobante en PDF y obligar a sacarle una captura es pedir de más.
 */
export async function subirComprobante({ carpeta, archivo }) {
  const aviso = revisarArchivo(archivo, {
    tipos: TIPOS_COMPROBANTE, limite: LIMITE_COMPROBANTE,
  })
  if (aviso) return { error: aviso }

  const ruta = carpeta + '/' + nombreUnico(archivo)
  const { error } = await supabase.storage.from('comprobantes')
    .upload(ruta, archivo, { contentType: archivo.type })

  return error ? falloDeSubida(error) : { ruta }
}

/** La direccion de una imagen publica, para ponerla en un <img>. */
export function urlPublica(ruta) {
  if (!ruta || typeof ruta !== 'string') return null

  // Las filas viejas guardaban el nombre del archivo suelto ('comp1.jpg'),
  // de cuando nada se subia de verdad. No apuntan a nada.
  if (!ruta.includes('/')) return null

  return supabase.storage.from('publico').getPublicUrl(ruta).data.publicUrl
}

/**
 * Un enlace temporal para ver un comprobante.
 *
 * Caduca en cinco minutos: alcanza de sobra para mirarlo y decidir, y si el
 * enlace se filtra despues ya no sirve para nada.
 */
export async function enlaceFirmado(ruta, segundos = 300) {
  if (!ruta) return { error: 'No hay comprobante guardado' }

  // Las reservas viejas guardaban un true/false en vez de la ruta
  if (typeof ruta !== 'string') {
    return { error: 'Esta reserva quedó registrada antes de que se guardaran ' +
                    'los archivos, así que no hay imagen para revisar.' }
  }

  if (!ruta.includes('/')) {
    return { error: 'Esta reserva es anterior a que se guardaran los archivos: ' +
                    'solo quedó el nombre (' + ruta + '), no la imagen.' }
  }

  const { data, error } = await supabase.storage.from('comprobantes')
    .createSignedUrl(ruta, segundos)

  if (error) {
    const m = (error.message || '').toLowerCase()
    if (m.includes('not found')) return { error: 'El archivo ya no está guardado' }
    return { error: 'No se pudo abrir el comprobante. Inténtalo de nuevo en unos segundos.' }
  }

  return { url: data.signedUrl }
}

/** Para decidir si mostrarlo en un <img> o en un visor de PDF. */
export const esPDF = (ruta) => String(ruta || '').toLowerCase().endsWith('.pdf')
