import { Link } from 'react-router-dom'
import PaginaLegal, { Correo } from '../components/PaginaLegal'

// Términos de Servicio. Repiten las reglas que el sistema ya aplica (el
// apartado de 10 minutos, la validación del comprobante, los puntos que no
// valen dinero): si una regla cambia en la base, hay que cambiarla aquí.

const SECCIONES = [
  ['Qué es SPORTIKA', [
    'Una plataforma que conecta a jugadores, complejos deportivos y organizadores de torneos en Cochabamba. '
    + 'SPORTIKA no es dueña de las canchas ni presta el servicio deportivo: cada complejo es responsable de sus '
    + 'canchas, sus horarios, sus precios y la atención que da.',
  ]],
  ['Tu cuenta', [
    'Debes registrarte con datos reales y cuidar tu contraseña. Eres responsable de lo que se haga con tu cuenta. '
    + 'Si crees que alguien entró sin tu permiso, cambia tu contraseña y avísanos.',
  ]],
  ['Reservas', [
    [
      'Las reservas son por horas completas y dentro del horario de atención del complejo.',
      'Cuando eliges tus horas, quedan apartadas a tu nombre por 10 minutos mientras pagas. Si no completas el '
      + 'pago en ese tiempo, se liberan para que otra persona pueda reservarlas.',
      'La reserva queda confirmada cuando el complejo valida tu comprobante de pago.',
      'Para cancelar o cambiar una reserva, comunícate con el complejo.',
    ],
  ]],
  ['Pagos', [
    'Usar SPORTIKA como jugador es gratis. SPORTIKA no cobra ni procesa pagos: pagas directamente al complejo, '
    + 'con su código QR o en el mostrador. Las devoluciones, cuando correspondan, se coordinan directamente con '
    + 'el complejo.',
  ]],
  ['Partidos y torneos', [
    'Quien organiza un partido o un torneo define sus reglas, sus cupos y sus premios. La Mesa Técnica registra '
    + 'los resultados y aplica las sanciones del reglamento de cada torneo. Si un torneo lo organiza un cliente, '
    + 'el complejo tiene que aprobar el uso de la cancha.',
  ]],
  ['Puntos y recompensas', [
    'Los puntos se ganan con la actividad en la plataforma y se canjean por las recompensas que ofrece cada '
    + 'complejo. Los puntos no tienen valor en dinero ni se pueden transferir, y cada código de canje sirve una '
    + 'sola vez.',
  ]],
  ['Cómo comportarse', [
    [
      'Respeta a los demás en tus comentarios, calificaciones y fotos.',
      'No subas comprobantes falsos ni contenido ofensivo.',
      'No intentes entrar a datos o funciones que no te corresponden.',
    ],
    'Si no se cumplen estas reglas, el super administrador puede suspender la cuenta.',
  ]],
  ['Disponibilidad', [
    'Hacemos lo posible para que SPORTIKA funcione siempre, pero puede haber interrupciones por mantenimiento o '
    + 'por fallas de los servicios en los que se apoya. SPORTIKA es un proyecto de grado y se ofrece tal como está.',
  ]],
  ['Responsabilidad', [
    'SPORTIKA no es responsable por lo que ocurra en las canchas, por los acuerdos entre jugadores ni por el '
    + 'servicio que preste cada complejo.',
  ]],
  ['Tus datos', [
    <>Cómo usamos tu información se explica en la <Link to="/privacidad" style={{ color: '#00BCD4' }}>Política de Privacidad</Link>.</>,
  ]],
  ['Cambios y ley aplicable', [
    'Podemos actualizar estos términos; la versión vigente es la que está publicada en esta página. Estos '
    + 'términos se rigen por las leyes del Estado Plurinacional de Bolivia.',
  ]],
  ['Contacto', [
    <>Si tienes preguntas, escribe a <Correo />.</>,
  ]],
]

export default function Terminos() {
  return (
    <PaginaLegal
      titulo="Términos de Servicio"
      intro="Al crear una cuenta o usar SPORTIKA aceptas estos términos. Explican cómo funciona la plataforma y qué le toca a cada uno."
      secciones={SECCIONES}
    />
  )
}
