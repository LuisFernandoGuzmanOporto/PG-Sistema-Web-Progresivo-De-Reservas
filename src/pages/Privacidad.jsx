import PaginaLegal, { Correo } from '../components/PaginaLegal'

// Política de Privacidad. Describe los datos que de verdad guarda la base
// (sportika_schema.sql): si se agrega un dato personal nuevo, hay que
// agregarlo también aquí.

const SECCIONES = [
  ['Quiénes somos', [
    'SPORTIKA es una plataforma para reservar canchas y organizar partidos y torneos deportivos en Cochabamba, '
    + 'Bolivia. Se desarrolló como proyecto de grado de la carrera de Ingeniería de Sistemas Informáticos de la '
    + 'Universidad Privada del Valle.',
  ]],
  ['Qué datos guardamos', [
    [
      'Los datos de tu cuenta: nombre, correo electrónico, teléfono, ciudad, deporte favorito y foto de perfil.',
      'Si entras con Google, solo recibimos tu nombre, tu correo y tu foto de la cuenta de Google. Nunca vemos ni '
      + 'guardamos tu contraseña de Google.',
      'Tu actividad en la plataforma: reservas, comprobantes de pago que subes, partidos a los que te unes, equipos '
      + 'y torneos en los que participas, calificaciones, comentarios, puntos y canjes.',
      'De los jugadores de un equipo se guarda solo su nombre, su número de polera y su posición.',
      'De los complejos deportivos: sus datos de contacto, su ubicación en el mapa, sus fotos y el código QR con '
      + 'el que cobran.',
    ],
    'No guardamos datos de tarjetas ni de cuentas bancarias: los pagos se hacen directamente al complejo, con su '
    + 'código QR.',
  ]],
  ['Para qué los usamos', [
    [
      'Para gestionar tus reservas y que el complejo pueda validar tu pago.',
      'Para organizar partidos y torneos y mostrar sus resultados.',
      'Para enviarte avisos dentro de la aplicación y los correos necesarios, como el código para recuperar tu '
      + 'contraseña.',
      'Para mostrar a cada complejo las estadísticas de sus propias reservas.',
      'Para mantener la plataforma segura y evitar abusos.',
    ],
    'No usamos tus datos para publicidad ni los vendemos.',
  ]],
  ['Quién puede verlos', [
    'Cada persona ve solo lo que le corresponde según su rol. El complejo ve los datos de las reservas, '
    + 'inscripciones y comprobantes que se hacen en sus canchas. Tu nombre aparece en los partidos y torneos en '
    + 'los que participas, y tus calificaciones y comentarios se ven en la ficha del complejo. El super '
    + 'administrador de la plataforma puede ver las cuentas para aprobar complejos y atender problemas.',
    'No compartimos tus datos con otras empresas, salvo con los servicios técnicos que hacen funcionar la '
    + 'plataforma y que se describen a continuación.',
  ]],
  ['Dónde se guardan', [
    'La base de datos, el inicio de sesión y los archivos están en Supabase, con servidores en São Paulo, Brasil. '
    + 'La aplicación se publica en Vercel, y los correos del sistema se envían con un servicio de correo '
    + 'transaccional. La información viaja cifrada (HTTPS), y la base de datos aplica reglas de seguridad para '
    + 'que nadie pueda leer datos que no le corresponden.',
  ]],
  ['Lo que se guarda en tu dispositivo', [
    'La aplicación guarda tu sesión y algunas preferencias en el navegador, para que no tengas que iniciar sesión '
    + 'cada vez, y guarda sus propios archivos para abrir más rápido. No usamos cookies de publicidad ni de '
    + 'seguimiento.',
  ]],
  ['Cuánto tiempo los guardamos', [
    'Mientras tu cuenta esté activa. Si pides eliminar tu cuenta, borramos tus datos personales. Los registros '
    + 'que el complejo necesita para su historial, como una reserva ya pagada, se conservan sin tus datos '
    + 'personales.',
  ]],
  ['Tus derechos', [
    'Puedes ver y corregir tus datos en cualquier momento desde tu perfil. También puedes pedir que eliminemos tu '
    + 'cuenta y tus datos.',
    <>Para pedirlo, escribe a <Correo />. Te responderemos lo antes posible.</>,
    'Esto se basa en el derecho a la privacidad que reconoce la Constitución Política del Estado Plurinacional de '
    + 'Bolivia.',
  ]],
  ['Menores de edad', [
    'Si tienes menos de 18 años, usa SPORTIKA con el permiso de tus padres o de tu tutor.',
  ]],
  ['Cambios a esta política', [
    'Si cambiamos esta política, publicaremos la nueva versión en esta misma página, con su fecha de '
    + 'actualización.',
  ]],
  ['Contacto', [
    <>Si tienes preguntas sobre tus datos, escribe a <Correo />.</>,
  ]],
]

export default function Privacidad() {
  return (
    <PaginaLegal
      titulo="Política de Privacidad"
      intro="En SPORTIKA cuidamos los datos que nos confías. Aquí te explicamos qué información guardamos, para qué la usamos, quién puede verla y cómo puedes pedir que la corrijamos o la eliminemos."
      secciones={SECCIONES}
    />
  )
}
