import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Circle, CircleMarker, Tooltip, useMap, useMapEvents } from 'react-leaflet'
import { CAPA_MAPA } from '../lib/iconoMapa'

// ─────────────────────────────────────────────────────────────────────────────
// ELEGIR LA UBICACIÓN EN EL MAPA
//
// La dirección escrita no alcanza: en Cochabamba hay calles sin numeración
// clara y complejos que están sobre una avenida pero con la entrada por otro
// lado. El cliente necesita el punto exacto para poder abrirlo en Google Maps
// y llegar.
//
// Por eso el dueño marca el lugar con un toque en el mapa (o arrastrando el
// pin), y lo que se guarda son las coordenadas.
//
// «Estoy aquí» usa la ubicación del teléfono: pone un punto azul donde está la
// persona, mueve el mapa hasta ahí y deja el pin del complejo en ese lugar.
// Antes, si el complejo ya tenía un punto (al editar), el mapa no se movía: el
// pin cambiaba de lugar fuera de la vista y parecía que el botón no hacía nada.
// ─────────────────────────────────────────────────────────────────────────────

// El centro de Cochabamba: desde ahí arranca el mapa
const COCHABAMBA = [-17.3895, -66.1568]

/** Mueve el marcador a donde se toque. */
function AlTocarElMapa({ onElegir }) {
  useMapEvents({
    click(e) { onElegir(e.latlng.lat, e.latlng.lng) },
  })
  return null
}

/** Lleva la vista del mapa a un punto cada vez que ese punto cambia. */
function IrA({ punto }) {
  const mapa = useMap()
  useEffect(() => {
    if (punto) mapa.flyTo([punto.lat, punto.lng], Math.max(mapa.getZoom(), 17), { duration: 0.8 })
  }, [punto, mapa])
  return null
}

const MENSAJE_ERROR = {
  1: 'No diste permiso para usar tu ubicación. Actívalo en el candado de la barra de direcciones (o en los ajustes del teléfono) y vuelve a tocar «Estoy aquí». También puedes marcar el punto tocando el mapa.',
  2: 'El teléfono no pudo saber dónde estás (¿tienes el GPS apagado?). Marca el punto tocando el mapa.',
  3: 'Tardó demasiado en encontrar tu ubicación. Vuelve a intentarlo o marca el punto tocando el mapa.',
}

export default function SelectorUbicacion({ lat, lng, onCambiar }) {
  const [buscando, setBuscando] = useState(false)
  const [aviso, setAviso] = useState(null)
  // Dónde está la persona según su teléfono (el punto azul) y a qué punto
  // tiene que ir la vista del mapa
  const [yo, setYo] = useState(null)
  const [irA, setIrA] = useState(null)

  const marcado = lat != null && lng != null
  const centro = marcado ? [lat, lng] : COCHABAMBA

  // Al tocar el mapa el pin aparece ahí mismo, sin mover ni acercar la vista:
  // acercar obligaba a bajar otra tanda de imágenes del mapa y el toque se
  // sentía lento. La vista solo se mueve con «Estoy aquí» y «Centrar en el pin».

  /** Usar la ubicación del teléfono: lo más rápido si el dueño está ahí. */
  const usarMiUbicacion = () => {
    if (!navigator.geolocation) {
      setAviso('Tu navegador no puede darnos la ubicación. Márcala tocando el mapa.')
      return
    }
    setBuscando(true)
    setAviso(null)
    navigator.geolocation.getCurrentPosition(
      pos => {
        const punto = { lat: pos.coords.latitude, lng: pos.coords.longitude, precision: pos.coords.accuracy }
        setYo(punto)
        setIrA(punto)
        onCambiar(punto.lat, punto.lng)
        setBuscando(false)
        // Una computadora sin GPS da la ubicación por la red: puede errar por
        // cientos de metros. Se avisa para que lo acomode.
        if (punto.precision > 150) {
          setAviso(`Tu ubicación es aproximada (unos ${Math.round(punto.precision)} m). Si el pin no quedó justo en la entrada, arrástralo o toca el lugar exacto.`)
        }
      },
      (error) => {
        setBuscando(false)
        setAviso(MENSAJE_ERROR[error?.code] || 'No pudimos obtener tu ubicación. Márcala tocando el mapa.')
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 8, gap: 10, flexWrap: 'wrap' }}>
        <p style={{ color: '#888', fontSize: '0.78rem', lineHeight: 1.5, flex: 1, minWidth: 200 }}>
          Toca el mapa donde está tu complejo, o arrastra el pin. Es lo que van a
          usar los clientes para llegar.
        </p>
        <button type="button" onClick={usarMiUbicacion} disabled={buscando}
          style={{ padding: '8px 13px', borderRadius: 9, cursor: buscando ? 'wait' : 'pointer', fontFamily: 'Outfit',
            fontWeight: 600, fontSize: '0.78rem', whiteSpace: 'nowrap',
            background: 'rgba(0,188,212,0.12)', border: '1px solid rgba(0,188,212,0.35)', color: '#00BCD4' }}>
          {buscando ? 'Buscando tu ubicación…' : '📍 Estoy aquí'}
        </button>
      </div>

      <div style={{ height: 280, borderRadius: 12, overflow: 'hidden',
        border: '1px solid ' + (marcado ? 'rgba(34,197,94,0.4)' : '#2a2a2a') }}>
        <MapContainer center={centro} zoom={marcado ? 16 : 13}
          style={{ height: '100%', width: '100%' }}>
          <TileLayer {...CAPA_MAPA} />
          <AlTocarElMapa onElegir={onCambiar} />
          <IrA punto={irA} />

          {/* Dónde está la persona: punto azul y el margen de error alrededor */}
          {yo && (
            <>
              <Circle center={[yo.lat, yo.lng]} radius={Math.min(yo.precision || 0, 500)}
                pathOptions={{ color: '#3b82f6', weight: 1, fillColor: '#3b82f6', fillOpacity: 0.12 }} />
              <CircleMarker center={[yo.lat, yo.lng]} radius={8}
                pathOptions={{ color: '#ffffff', weight: 3, fillColor: '#3b82f6', fillOpacity: 1 }}>
                <Tooltip direction="top" offset={[0, -8]}>Tú estás aquí</Tooltip>
              </CircleMarker>
            </>
          )}

          {/* El complejo: se puede arrastrar para acomodarlo */}
          {marcado && (
            <Marker position={[lat, lng]} draggable
              eventHandlers={{ dragend: (e) => { const p = e.target.getLatLng(); onCambiar(p.lat, p.lng) } }}>
              <Tooltip direction="top" offset={[0, -36]}>Tu complejo</Tooltip>
            </Marker>
          )}
        </MapContainer>
      </div>

      {marcado ? (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginTop: 8, gap: 10, flexWrap: 'wrap' }}>
          <p style={{ color: '#22c55e', fontSize: '0.78rem', fontWeight: 600 }}>
            ✓ Ubicación marcada
            {yo && <span style={{ color: '#3b82f6', fontWeight: 500 }}> · 🔵 el punto azul eres tú</span>}
          </p>
          <span style={{ display: 'flex', gap: 14 }}>
            <button type="button" onClick={() => setIrA({ lat, lng })}
              style={{ background: 'none', border: 'none', color: '#888', fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'Outfit', textDecoration: 'underline', padding: 0 }}>
              Centrar en el pin
            </button>
            <a href={'https://www.google.com/maps?q=' + lat + ',' + lng}
              target="_blank" rel="noopener noreferrer"
              style={{ color: '#00BCD4', fontSize: '0.78rem', textDecoration: 'underline' }}>
              Verla en Google Maps
            </a>
          </span>
        </div>
      ) : (
        <p style={{ color: '#666', fontSize: '0.76rem', marginTop: 8 }}>
          Todavía no marcaste el punto.
        </p>
      )}

      {aviso && (
        <p role="alert" style={{ color: '#f59e0b', fontSize: '0.76rem', marginTop: 6, lineHeight: 1.5 }}>{aviso}</p>
      )}
    </div>
  )
}

/**
 * El mismo mapa, solo para mirar: muestra el pin del complejo sin dejar
 * moverlo. Lo usa el Super Admin al revisar una solicitud.
 */
export function MapaDeUbicacion({ lat, lng, alto = 200 }) {
  // Sin coordenadas llega null, NaN o 0 (Number(null) da 0 al cargar los complejos)
  if (!Number(lat) || !Number(lng)) {
    return (
      <div style={{ height: alto, borderRadius: 10, border: '1px dashed #333', display: 'flex',
        alignItems: 'center', justifyContent: 'center', color: '#666', fontSize: '0.8rem', textAlign: 'center', padding: 12 }}>
        📍 No marcó su ubicación en el mapa
      </div>
    )
  }
  return (
    <div>
      <div style={{ height: alto, borderRadius: 10, overflow: 'hidden', border: '1px solid #2a2a2a' }}>
        <MapContainer center={[lat, lng]} zoom={16} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
          <TileLayer {...CAPA_MAPA} />
          <Marker position={[lat, lng]} />
        </MapContainer>
      </div>
      <a href={'https://www.google.com/maps?q=' + lat + ',' + lng} target="_blank" rel="noopener noreferrer"
        style={{ color: '#00BCD4', fontSize: '0.76rem', textDecoration: 'underline', display: 'inline-block', marginTop: 6 }}>
        Verla en Google Maps
      </a>
    </div>
  )
}
