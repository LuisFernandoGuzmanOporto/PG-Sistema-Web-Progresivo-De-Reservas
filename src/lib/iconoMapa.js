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
