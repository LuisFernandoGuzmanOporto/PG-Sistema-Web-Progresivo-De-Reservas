import L from 'leaflet'
import iconoUrl       from 'leaflet/dist/images/marker-icon.png'
import iconoRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import sombraUrl      from 'leaflet/dist/images/marker-shadow.png'

// El marcador de Leaflet no encuentra sus imagenes cuando el proyecto se
// compila con Vite, asi que se le indican a mano. Salen del paquete instalado:
// Vite las copia al build y quedan servidas desde el propio sitio.
//
// Va en un archivo aparte que importa cada mapa. Antes estaba solo en la
// pagina del complejo, y en el mapa de «Mi cuenta» del administrador el
// marcador salia sin imagen: no se veia donde estaba el complejo.
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: iconoUrl, iconRetinaUrl: iconoRetinaUrl, shadowUrl: sombraUrl,
})

// ── De dónde salen las imágenes del mapa ───────────────────────────────────
// De OpenStreetMap, gratis y sin clave. Antes se pedían a a/b/c.tile.openstreetmap.org:
// esas direcciones viejas OpenStreetMap ya no las recomienda y las atiende con
// menos prioridad. Medido el 12/11/2026, cada cuadrito del mapa tardaba 4
// segundos en promedio y algunos hasta 16: por eso marcar en el mapa parecía
// lento (quedaba gris). La dirección actual es una sola, tile.openstreetmap.org,
// y el navegador baja todos los cuadritos por la misma conexión.
// (Se probó CARTO: ahora pide una clave de pago.) Todos los mapas usan esta capa.
export const CAPA_MAPA = {
  url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  maxZoom: 19,
  // Deja cargados los cuadritos de alrededor: al mover el mapa ya están
  keepBuffer: 4,
}

// Un toque en el mapa se toma como toque aunque el dedo (o el mouse) se mueva
// un poquito. Con los 3 píxeles que trae Leaflet, un toque con el dedo se
// confundía con arrastrar el mapa y el pin no aparecía: había que tocar varias
// veces y parecía que el mapa tardaba en marcar.
L.Draggable.prototype.options.clickTolerance = 10
