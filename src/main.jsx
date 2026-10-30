import React from 'react'
import ReactDOM from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App.jsx'

// La aplicación se actualiza sola. Cuando se publica una versión nueva, el
// service worker nuevo se instala y la página se recarga una vez; antes cada
// uno seguía con la versión vieja hasta cerrar todas las pestañas. La primera
// instalación no recarga nada.
// También se busca una versión nueva cada vez que se vuelve a la aplicación:
// en el teléfono queda abierta en segundo plano y casi nunca se vuelve a cargar.
registerSW({
  immediate: true,
  onRegisteredSW(_url, registro) {
    if (!registro) return
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') registro.update()
    })
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
