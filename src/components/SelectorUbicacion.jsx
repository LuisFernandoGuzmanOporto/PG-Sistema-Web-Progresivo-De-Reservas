import { useState } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import '../lib/iconoMapa'

// ─────────────────────────────────────────────────────────────────────────────
// ELEGIR LA UBICACIÓN EN EL MAPA
//
// La dirección escrita no alcanza: en Cochabamba hay calles sin numeración
// clara y complejos que están sobre una avenida pero con la entrada por otro
// lado. El cliente necesita el punto exacto para poder abrirlo en Google Maps
// y llegar.
//
// Por eso el dueño marca el lugar con un toque en el mapa, y lo que se guarda
// son las coordenadas.
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

export default function SelectorUbicacion({ lat, lng, onCambiar }) {
  const [buscando, setBuscando] = useState(false)
  const [aviso, setAviso] = useState(null)

  const marcado = lat != null && lng != null
  const centro = marcado ? [lat, lng] : COCHABAMBA

  /** Usar la ubicación del teléfono: lo más rápido si el dueño está ahí. */
  const usarMiUbicacion = () => {
    if (!navigator.geolocation) {
      setAviso('Tu navegador no puede darnos la ubicación. Márcala en el mapa.')
      return
    }
    setBuscando(true)
    setAviso(null)
    navigator.geolocation.getCurrentPosition(
      pos => {
        onCambiar(pos.coords.latitude, pos.coords.longitude)
        setBuscando(false)
      },
      () => {
        setBuscando(false)
        setAviso('No pudimos obtener tu ubicación. Márcala tocando el mapa.')
      },
      { timeout: 8000 },
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 8, gap: 10, flexWrap: 'wrap' }}>
        <p style={{ color: '#888', fontSize: '0.78rem', lineHeight: 1.5, flex: 1, minWidth: 200 }}>
          Toca el mapa donde está tu complejo. Es lo que van a usar los clientes
          para llegar.
        </p>
        <button type="button" onClick={usarMiUbicacion} disabled={buscando}
          style={{ padding: '8px 13px', borderRadius: 9, cursor: 'pointer', fontFamily: 'Outfit',
            fontWeight: 600, fontSize: '0.78rem', whiteSpace: 'nowrap',
            background: 'rgba(0,188,212,0.12)', border: '1px solid rgba(0,188,212,0.35)', color: '#00BCD4' }}>
          {buscando ? 'Buscando…' : '📍 Estoy aquí'}
        </button>
      </div>

      <div style={{ height: 260, borderRadius: 12, overflow: 'hidden',
        border: '1px solid ' + (marcado ? 'rgba(34,197,94,0.4)' : '#2a2a2a') }}>
        <MapContainer center={centro} zoom={marcado ? 16 : 13}
          style={{ height: '100%', width: '100%' }}
          key={marcado ? 'marcado' : 'vacio'}>
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <AlTocarElMapa onElegir={onCambiar} />
          {marcado && <Marker position={[lat, lng]} />}
        </MapContainer>
      </div>

      {marcado ? (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginTop: 8, gap: 10, flexWrap: 'wrap' }}>
          <p style={{ color: '#22c55e', fontSize: '0.78rem', fontWeight: 600 }}>
            ✓ Ubicación marcada
          </p>
          <a href={'https://www.google.com/maps?q=' + lat + ',' + lng}
            target="_blank" rel="noopener noreferrer"
            style={{ color: '#00BCD4', fontSize: '0.78rem', textDecoration: 'underline' }}>
            Verla en Google Maps
          </a>
        </div>
      ) : (
        <p style={{ color: '#666', fontSize: '0.76rem', marginTop: 8 }}>
          Todavía no marcaste el punto.
        </p>
      )}

      {aviso && (
        <p style={{ color: '#f59e0b', fontSize: '0.76rem', marginTop: 6 }}>{aviso}</p>
      )}
    </div>
  )
}
