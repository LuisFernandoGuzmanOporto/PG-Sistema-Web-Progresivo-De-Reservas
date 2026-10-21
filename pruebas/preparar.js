// Node 20 no trae WebSocket, y el cliente de Supabase lo necesita para el
// tiempo real. En el navegador existe siempre; esto es solo para las pruebas.
import WebSocket from 'ws'

if (!globalThis.WebSocket) globalThis.WebSocket = WebSocket
