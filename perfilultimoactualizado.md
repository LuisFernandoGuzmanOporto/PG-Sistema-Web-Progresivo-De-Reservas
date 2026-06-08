# **UNIVERSIDAD PRIVADA DEL VALLE**

**FACULTAD DE INFORMÁTICA Y ELECTRÓNICA**

**CARRERA DE LICENCIATURA EN INGENIERÍA DE** 

**SISTEMAS INFORMÁTICOS**

 

 

**SISTEMA WEB PROGRESIVO PARA LA GESTIÓN DE RESERVAS DE CANCHAS DEPORTIVAS Y ORGANIZACIÓN DE EVENTOS DEPORTIVOS EN LA CIUDAD DE COCHABAMBA**

 

 

**PERFIL DE PROYECTO DE GRADO PARA OPTAR AL TÍTULO DE LICENCIATURA EN INGENIERÍA DE**

**SISTEMAS INFORMÁTICOS**

 

 

 

**POSTULANTE: LUIS FERNANDO GUZMAN OPORTO**

  	 **TUTOR: ING. MONTAÑO SALVATIERRA CHRISTIAN MAX**

 

 

Cochabamba – Bolivia

2026

 

**ÍNDICE DE CONTENIDO**  
   
**1\. INTRODUCCIÓN.. 1**  
**2\. PLANTEAMIENTO DEL PROBLEMA.. 2**  
**2.1. DIAGRAMA DE ISHIKAWA.. 3**  
**2.2. FORMULACIÓN DEL PROBLEMA.. 3**  
**3\. JUSTIFICACIÓN.. 4**  
**3.1. JUSTIFICACIÓN TÉCNICA.. 4**  
**3.2. JUSTIFICACIÓN ECONÓMICA.. 5**  
**3.3. JUSTIFICACIÓN SOCIAL. 5**  
**4\. OBJETIVOS. 6**  
**4.1. OBJETIVO GENERAL. 6**  
**4.2. OBJETIVOS ESPECÍFICOS. 6**  
**5\. ALCANCE. 7**  
**5.1. MÓDULO DE GESTIÓN DE USUARIOS. 7**  
**5.2. MÓDULO DE GESTIÓN DE CANCHAS DEPORTIVAS. 8**  
**5.3. MÓDULO DE RESERVAS Y PAGOS. 8**  
**5.4. MÓDULO DE ORGANIZACIÓN DE EVENTOS DEPORTIVOS. 8**  
**5.5. MÓDULO DE RECOMPENSAS O PUNTOS. 9**  
**5.6.  MÓDULO DE SOPORTE A LA TOMA DE DECISIONES. 9**  
**5.7. MÓDULO DE ENTRENAMIENTOS DEPORTIVOS. 9**  
**5.8. MÓDULO DE GESTIÓN DE ENTRENADORES. 10**  
**5.9. MÓDULO DE CALIFICACIONES. 10**  
**5.10. MÓDULO DE DISEÑO DE INTERFAZ DE USUARIO.. 10**  
**5.11. MÓDULO DE PRUEBAS DEL SISTEMA.. 10**  
**6\. LÍMITES. 11**  
**7\. MARCO TEÓRICO.. 12**  
**7.1. MARCO CONCEPTUAL. 12**  
**7.1.1. SISTEMA MULTIPLATAFORMA.. 12**  
**7.1.2. TRANSFORMACIÓN DIGITAL. 12**  
**7.1.3. GESTIÓN DE RESERVAS DEPORTIVAS. 13**  
**7.1.4. ORGANIZACIÓN DE TORNEOS DEPORTIVOS. 13**  
**7.1.5. VISUALIZACIÓN DE EVENTOS DEPORTIVOS. 14**  
**7.1.6. ESTADISTICAS DEPORTIVAS EN TIEMPO REAL. 14**  
**7.1.7. SISTEMA DE CALIFICACIÓN.. 15**  
**7.1.8. MODELO DE NEGOCIO FREEMIUM.. 15**  
**7.1.9. GEOLOCALIZACIÓN.. 15**  
**7.2. MARCO TÉCNICO.. 16**  
**7.2.1. JAVASCRIPT. 16**  
**7.2.2. REACT JS. 16**  
**7.2.3. VITE. 17**  
**7.2.4. REACT ROUTER DOM.. 17**  
**7.2.5. APLICACIÓN WEB PROGRESIVA (PWA) 17**  
**7.2.6. WORKBOX. 17**  
**7.2.7. POSTGRESQL. 18**  
**7.2.8. SUPABASE. 18**  
**7.2.9. GIT Y GITHUB.. 18**  
**7.2.10. TRELLO.. 19**  
**7.2.11.  FIGMA.. 19**  
**7.3. METODOLOGÍAS DE DESARROLLO ÁGIL. 19**  
**7.3.1. SCRUM.. 19**  
**7.3.2. KANBAN.. 19**  
**7.4. PRUEBAS EN EL DESARROLLO DE SOFTWARE. 20**  
**7.4.1. PRUEBAS UNITARIAS. 20**  
**7.4.2. PRUEBAS DE USABILIDAD.. 20**  
**7.4.3. PRUEBAS DE RENDIMIENTO.. 20**  
**7.4.4. PRUEBAS DE INTEGRACIÓN.. 21**  
**7.4.5. PRUEBAS DE COMPATIBILIDAD PWA.. 21**  
**8\. METODOLOGÍA DE DESARROLLO DE LA PROPUESTA.. 21**  
**8.1. MÉTODOS Y HERRAMIENTAS DE DESARROLLO.. 21**  
**9\. MARCO METODOLÓGICO.. 22**  
**9.1. ENFOQUE DE INVESTIGACIÓN.. 22**  
**9.1.1. ENFOQUE CUALITATIVO.. 22**  
**9.1.2. ENFOQUE CUANTITATIVO.. 22**  
**9.2. TIPO DE INVESTIGACIÓN.. 23**  
**9.2.1. INVESTIGACIÓN APLICADA.. 23**  
**9.2.2. INVESTIGACIÓN DESCRIPTIVA.. 23**  
**9.3. MÉTODO DE INVESTIGACIÓN.. 23**  
**9.3.1. MÉTODOS TEÓRICOS. 24**  
**9.3.2. MÉTODOS EMPÍRICOS. 24**  
**9.4. POBLACIÓN Y MUESTRA.. 25**  
**9.5. TÉCNICAS DE RECOLECCIÓN DE DATOS. 25**  
**9.6. HERRAMIENTAS DE INFORMACIÓN.. 26**  
**9.7. FUENTES DE INFORMACIÓN.. 26**  
**10\. ÍNDICE TENTATIVO.. 26**  
**11\. CRONOGRAMA.. 28**  
**12\. BIBLIOGRAFÍA.. 28**  
   
   
        	 

   
**ÍNDICE DE FIGURAS**  
   
Figura 2.1 \- Diagrama de Ishikawa sobre la falta la dificultad para organizar partidos y gestionar canchas deportivas en Cochabamba.......................................................................................... 3  
Figura 11.1 \- Cronograma de actividades ..................................................................................24  
 

# **1\. INTRODUCCIÓN**

En la actualidad, la gestión de canchas deportivas y la organización de actividades recreativas representan un desafío tanto para administradores como para usuarios, debido a la falta de herramientas tecnológicas que permitan una administración eficiente y ordenada. En muchos casos, las reservas de canchas, la organización de partidos y la gestión de torneos se realizan de manera manual o mediante redes sociales, lo que genera desorganización, falta de control y dificultades en la coordinación entre los participantes.

En los últimos años, el uso de soluciones digitales ha crecido significativamente, permitiendo automatizar procesos y mejorar la interacción entre usuarios. Según estudios en sistemas de información, la digitalización contribuye a optimizar la eficiencia operativa y facilitar el acceso a información en tiempo real (Laudon & Laudon, 2020). Asimismo, investigaciones en experiencia de usuario destacan que las plataformas digitales mejoran la organización de actividades cuando son accesibles y están bien diseñadas (Nielsen Norman Group, 2023).

Sin embargo, en el ámbito deportivo local aún se evidencia la ausencia de una solución integral que permita gestionar de manera conjunta las reservas de canchas, la organización de partidos, la gestión de torneos y la interacción entre usuarios en una sola plataforma. Esta situación limita la organización eficiente de actividades deportivas y dificulta el acceso a información confiable sobre la disponibilidad de espacios.

En el ámbito internacional y latinoamericano existen plataformas como Playtomic y Fulbito.pe orientadas a la reserva de canchas deportivas, que han demostrado la viabilidad de soluciones digitales en este sector (Playtomic, 2023; Fulbito.pe, 2022). Sin embargo, estas soluciones están desarrolladas como aplicaciones móviles nativas o sistemas web tradicionales, sin integrar en una sola plataforma la gestión de reservas, organización de partidos, torneos y pagos adaptados al contexto local. A nivel nacional, no se evidencia una plataforma digital consolidada que cubra estas necesidades en la ciudad de Cochabamba, lo que justifica el desarrollo del presente proyecto.

Ante esta problemática, el presente trabajo propone el desarrollo de un sistema multiplataforma basado en una Aplicación Web Progresiva (PWA) para la gestión de canchas deportivas, organización de partidos y torneos en la ciudad de Cochabamba. La solución permitirá optimizar la administración de espacios deportivos, facilitar la reserva de canchas, mejorar la coordinación entre usuarios y centralizar la información en una sola plataforma.

# **2\. PLANTEAMIENTO DEL PROBLEMA** 

En la actualidad, la práctica de actividades deportivas recreativas es una de las principales formas de promover la salud, la integración social y el bienestar de las personas. Sin embargo, muchas veces los jugadores enfrentan dificultades al momento de organizar partidos o encontrar espacios adecuados donde practicar deportes como fútbol, futsal, voleibol, wally, tenis, frontón, pádel u otras disciplinas deportivas.

En este contexto, el problema central es la falta de una herramienta digital que permita gestionar de manera eficiente la reserva de canchas deportivas y la coordinación de actividades como partidos y torneos. En muchos casos, la organización de partidos se realiza de manera informal mediante grupos de mensajería, redes sociales o contactos personales. Este tipo de coordinación genera diversos problemas, como la dificultad para reunir la cantidad necesaria de jugadores, la falta de información sobre la disponibilidad de canchas deportivas y la ausencia de una planificación clara de horarios. Como consecuencia, muchas actividades deportivas no logran concretarse o se organizan de manera desordenada.

En la práctica, se observa que los usuarios no cuentan con información centralizada sobre la disponibilidad de canchas, lo que dificulta la planificación de sus actividades deportivas. Por otra parte, los propietarios o administradores de canchas deportivas generalmente no cuentan con herramientas digitales que les permitan gestionar de manera eficiente la disponibilidad de sus instalaciones, promocionar sus servicios o administrar reservas de forma organizada. Esto provoca que muchas canchas permanezcan desocupadas en determinados horarios o que los usuarios no puedan encontrar fácilmente espacios disponibles para practicar deportes.

Asimismo, la organización de torneos deportivos amateurs suele realizarse de forma manual, lo que dificulta el registro de equipos, la programación de partidos, el seguimiento de resultados y la comunicación con los participantes.

Ante esta situación, se evidencia la necesidad de contar con una plataforma tecnológica que permita centralizar la información de las canchas deportivas, facilitar la reserva de espacios deportivos y ofrecer herramientas que permitan organizar partidos espontáneos y torneos de manera más eficiente.

A partir de lo expuesto, surge la propuesta de desarrollar un **sistema multiplataforma basado en una Aplicación Web Progresiva (PWA) para la gestión de reservas de canchas deportivas y la organización de partidos y torneos en la ciudad de Cochabamba**, el cual permitirá a los usuarios encontrar canchas disponibles, reservar horarios, organizar partidos con otros jugadores y participar en torneos deportivos mediante una plataforma digital accesible desde diferentes dispositivos.

## **2.1. DIAGRAMA DE ISHIKAWA**  

Con el fin de identificar las causas que influyen en la dificultad para organizar partidos y gestionar canchas deportivas, se presenta el diagrama de Ishikawa mostrado en la Figura 2.1.  
Figura 2\. 1 – Diagrama de Ishikawa sobre la dificultad para organizar partidos y gestionar canchas deportivas en Cochabamba

 

Fuente: Elaboración propia, 2026

## **2.2. FORMULACIÓN DEL PROBLEMA**

¿De qué manera un sistema multiplataforma basado en una Aplicación Web Progresiva (PWA) permitirá optimizar la gestión de reservas de canchas deportivas y la organización de eventos deportivos en la ciudad de Cochabamba?

# **3\. JUSTIFICACIÓN**

## **3.1. JUSTIFICACIÓN TÉCNICA**

El desarrollo del sistema multiplataforma propuesto es técnicamente viable debido a la disponibilidad de herramientas y tecnologías actuales que permiten la creación de aplicaciones web progresivas de manera eficiente, escalable y adaptable a distintos dispositivos. En este sentido, se plantea el uso de React y Vite para el desarrollo de una Aplicación Web Progresiva (PWA), y Supabase como plataforma backend basada en PostgreSQL, debido a que integra servicios como autenticación, almacenamiento de datos, sincronización en tiempo real y gestión de base de datos en una sola solución.

La elección de una PWA responde a la necesidad de ofrecer una plataforma accesible desde navegadores web y dispositivos móviles, sin requerir la instalación desde tiendas de aplicaciones. Este enfoque permite contar con una sola base de código, mejorar la experiencia de uso en distintos dispositivos y facilitar el mantenimiento del sistema.

La elección de Supabase responde a la necesidad de optimizar el tiempo de desarrollo del proyecto, reducir la complejidad de construir un backend desde cero y facilitar la implementación de funcionalidades como registro de usuarios, reservas, pagos y actualización de información en tiempo real. Asimismo, al estar basado en PostgreSQL, permite mantener una estructura de datos relacional sólida y adecuada para la gestión de usuarios, canchas, reservas, torneos y estadísticas.

La implementación del sistema permitirá centralizar la información relacionada con las canchas deportivas, automatizar procesos como la reserva de espacios, la organización de partidos y la gestión de torneos, reduciendo la dependencia de métodos manuales y mejorando la eficiencia operativa. El uso de estas tecnologías permitirá además desarrollar una plataforma accesible desde distintos dispositivos, garantizando una experiencia uniforme para los usuarios.

Asimismo, el sistema permitirá el manejo de información en tiempo real, facilitando la disponibilidad de datos actualizados sobre horarios, usuarios y actividades deportivas. Esto contribuirá a mejorar la toma de decisiones tanto para los usuarios como para los administradores de las canchas.

Desde el punto de vista técnico, el proyecto es factible, ya que las tecnologías seleccionadas cuentan con amplia documentación, soporte y comunidad activa, lo que facilita su implementación, mantenimiento y escalabilidad en el tiempo.

## **3.2. JUSTIFICACIÓN ECONÓMICA**

Desde el punto de vista económico, el sistema permitirá optimizar el uso de las canchas deportivas, reduciendo los tiempos en los que estas permanecen desocupadas y aumentando los ingresos de los administradores mediante una gestión más eficiente de reservas.

Asimismo, el sistema contempla la implementación de un modelo de negocio basado en suscripciones, publicidad de servicios deportivos y funcionalidades premium, lo cual permitirá generar ingresos sostenibles a largo plazo.

Por otro lado, la automatización de procesos reducirá costos operativos relacionados con la gestión manual de reservas, coordinación de partidos y organización de torneos, generando un ahorro de tiempo y recursos tanto para los administradores como para los usuarios.

Además, la incorporación de funcionalidades como el seguimiento en tiempo real de partidos y la generación de estadísticas deportivas incrementa el valor de la plataforma, permitiendo ofrecer servicios diferenciados dentro de un entorno digital competitivo.

## **3.3. JUSTIFICACIÓN SOCIAL**

El presente proyecto se centra en mejorar la organización de actividades deportivas y facilitar el acceso a canchas mediante una plataforma digital. Actualmente, los usuarios presentan dificultades para coordinar partidos y encontrar espacios disponibles, lo que limita la práctica deportiva.

La implementación del sistema permitirá que jugadores, propietarios de canchas y organizadores interactúen en un entorno digital centralizado, facilitando la reserva de espacios, la organización de partidos y torneos. Los principales beneficiarios serán los usuarios, quienes tendrán acceso a información organizada, y los propietarios, quienes podrán mejorar la gestión y visibilidad de sus servicios.

A nivel local, el proyecto contribuirá a fomentar la práctica deportiva, la integración social y el uso de herramientas tecnológicas, generando un impacto positivo en la calidad de vida de la población.

# **4\. OBJETIVOS**

## **4.1. OBJETIVO GENERAL**

Diseñar e implementar un sistema multiplataforma basado en una Aplicación Web Progresiva (PWA) que permita mejorar la gestión de reservas de canchas deportivas y la organización de eventos deportivos en la ciudad de Cochabamba.

## **4.2. OBJETIVOS ESPECÍFICOS**

·        Desarrollar un módulo de gestión de usuarios para permitir el registro, autenticación y control de acceso dentro de la plataforma.

·        Implementar un módulo de gestión de canchas deportivas para facilitar la administración de las instalaciones por parte de los administradores.

·        Desarrollar un módulo de reservas y pagos que permita a los usuarios consultar disponibilidad, seleccionar horarios y gestionar las transacciones de reservas de canchas, para facilitar el proceso completo hasta la confirmación del pago.

·        Implementar un módulo de organización de eventos deportivos que permita la creación, participación y seguimiento de partidos espontáneos y torneos deportivos, incluyendo el control de resultados, estadísticas, ranking de jugadores, clasificación de equipos y la gestión de pagos de inscripción, para facilitar la coordinación de actividades deportivas entre usuarios dentro de la plataforma.

·        Desarrollar un módulo de recompensas o puntos para incentivar la participación y fidelización de los usuarios.

·        Implementar un dashboard de soporte a la toma de decisiones que permita visualizar información relevante como uso de canchas, horarios más concurridos, participación de usuarios y seguimiento de torneos, para apoyar la gestión y organización de las actividades deportivas

·        Desarrollar un módulo de entrenamientos deportivos que permita a los usuarios inscribirse a sesiones organizadas por las empresas, incluyendo inscripción para adultos y niños, para facilitar el acceso a actividades formativas deportivas hasta la confirmación del pago.

·        Implementar un módulo de gestión de entrenadores que permita a los administradores registrar el perfil de sus entrenadores y asignarlos a los entrenamientos correspondientes, para facilitar la administración del personal deportivo de cada empresa.

·        Diseñar los prototipos de interfaz de usuario de la Aplicación Web Progresiva (PWA) utilizando Figma, para validar la experiencia de usuario antes del desarrollo del sistema.

·        Implementar un módulo de calificaciones que permita a los usuarios valorar con estrellas y comentarios las empresas deportivas dentro de la plataforma, para facilitar la toma de decisiones de otros usuarios al momento de elegir un servicio deportivo.

·        Realizar pruebas de usabilidad, integración y compatibilidad PWA para verificar el correcto funcionamiento del sistema y garantizar una experiencia uniforme en distintos dispositivos.

# **5\. ALCANCE**

El sistema multiplataforma basado en una Aplicación Web Progresiva (PWA) permitirá gestionar canchas deportivas, organizar partidos y torneos, así como facilitar la interacción entre usuarios dentro de una plataforma digital centralizada, accesible desde navegadores web y dispositivos móviles. El sistema estará conformado por los siguientes módulos:

## **5.1. MÓDULO DE GESTIÓN DE USUARIOS**

Este módulo permitirá el registro, autenticación y administración de usuarios dentro de la plataforma. Los usuarios podrán crear perfiles, iniciar sesión y gestionar su información personal, permitiendo un control adecuado del acceso y la interacción en el sistema.

El sistema contemplará los siguientes roles: Super Administrador, Administrador de Empresa, Empleado y Usuario (jugador). El Super Administrador gestionará las empresas y usuarios del sistema. El Administrador de Empresa tendrá control total sobre su complejo deportivo. El Empleado, asignado opcionalmente por el administrador, podrá visualizar y gestionar las reservas del día, confirmar o rechazar comprobantes de pago, y consultar los inscritos a entrenamientos, quedando registrada toda acción realizada para control del administrador. El Usuario jugador podrá realizar reservas, participar en partidos, torneos y entrenamientos dentro de la plataforma.

## **5.2. MÓDULO DE GESTIÓN DE CANCHAS DEPORTIVAS**

Este módulo permitirá a los administradores registrar y administrar sus canchas deportivas, incluyendo información como ubicación, tipo de deporte, horarios disponibles y precios. Asimismo, facilitará la gestión de los servicios ofrecidos, permitiendo una mejor organización y visibilidad dentro de la plataforma.

## **5.3. MÓDULO DE RESERVAS Y PAGOS**

Este módulo permitirá a los usuarios consultar la disponibilidad de canchas deportivas y realizar reservas de manera organizada. Los usuarios podrán seleccionar horarios disponibles, confirmar reservas y gestionar sus solicitudes dentro de la plataforma.

Asimismo, permitirá a los administradores y empleados controlar la ocupación de las canchas, evitando duplicidad de reservas y mejorando la organización de los horarios.

Este módulo permitirá gestionar los pagos relacionados con la reserva de canchas mediante códigos QR. Para las reservas, el usuario deberá realizar el pago correspondiente utilizando el código QR del administrador. Posteriormente, deberá registrar el comprobante de pago dentro del sistema, pudiendo subir una imagen (captura o fotografía) o un archivo en formato PDF. Una vez enviado, la reserva pasará a un estado pendiente de validación y será verificada por el administrador o empleado. Tras su confirmación, la reserva será validada en el sistema.

Asimismo, el sistema permitirá mostrar al usuario un comprobante digital de su reserva, incluyendo información como datos del usuario, cancha, horario reservado, monto pagado y estado de la reserva.

Finalmente, el sistema permitirá llevar un control de las transacciones realizadas.

## **5.4. MÓDULO DE ORGANIZACIÓN DE EVENTOS DEPORTIVOS**

Este módulo permitirá la creación, organización, participación y seguimiento de partidos espontáneos y torneos deportivos dentro de la plataforma. Los usuarios podrán crear sus propios torneos configurando deporte, formato, número de equipos y premiación, así como inscribir equipos con nombre, integrantes y capitán.

El módulo incluirá una vista En Vivo para el seguimiento del torneo en tiempo real con marcadores, y una Mesa Técnica para registrar marcadores y estadísticas por jugador durante el partido.

Asimismo, permitirá registrar y visualizar resultados, generar estadísticas, ranking de jugadores y tablas de posiciones. La gestión de pagos de inscripción a torneos se realizará mediante código QR, donde los equipos deberán subir su comprobante para que el organizador apruebe su participación.

## **5.5. MÓDULO DE RECOMPENSAS O PUNTOS**

Este módulo permitirá asignar puntos a los usuarios en función de su participación en reservas, partidos y torneos. Estos puntos servirán como incentivo dentro de la plataforma, fomentando la participación y fidelización de los usuarios, pudiendo ser utilizados en beneficios o ventajas dentro del sistema.

Los administradores podrán definir los premios disponibles para canje, especificando nombre, descripción, costo en puntos y stock disponible, pudiendo activar o pausar cada recompensa según su disponibilidad.

## **5.6.  MÓDULO DE SOPORTE A LA TOMA DE DECISIONES**

Este módulo permitirá implementar un dashboard con información útil generada a partir de los datos del sistema, como los días con mayor demanda de canchas, los horarios más utilizados, la cantidad de reservas realizadas, los ingresos generados por reservas y torneos, así como la participación de los usuarios en actividades deportivas.

El dashboard facilitará a los administradores la visualización de indicadores relevantes para apoyar la toma de decisiones y mejorar la gestión de las actividades deportivas dentro de la plataforma.

## **5.7. MÓDULO DE ENTRENAMIENTOS DEPORTIVOS**

Este módulo permitirá a los administradores crear y gestionar entrenamientos deportivos, configurando nombre, entrenador asignado, días de la semana, horario de inicio y fin, precio, cupo máximo y la opción de marcarlos como entrenamientos para niños con rango de edad. Al crear el entrenamiento, el administrador podrá subir directamente el código QR de pago.

Los usuarios podrán inscribirse a los entrenamientos disponibles. En entrenamientos para adultos, el usuario podrá elegir si desea polera y su talla. En entrenamientos para niños, el tutor podrá registrar el nombre de cada hijo, elegir polera y talla por niño, y agregar varios hijos en una misma inscripción.

El pago se confirmará mediante la subida de un comprobante de transferencia, el cual será verificado por el administrador o empleado. El módulo permitirá visualizar los inscritos con su estado de pago pendiente o confirmado.

## **5.8. MÓDULO DE GESTIÓN DE ENTRENADORES**

Este módulo permitirá a los administradores registrar el perfil de los entrenadores de su empresa, incluyendo nombre, correo, teléfono, deporte principal y especialidad. Los administradores podrán asignar entrenadores a los entrenamientos correspondientes, visualizar qué entrenamientos tiene asignado cada uno, y activar o desactivar entrenadores según su disponibilidad dentro de la plataforma.

## **5.9. MÓDULO DE CALIFICACIONES**

Este módulo permitirá a los usuarios dejar una valoración de 1 a 5 estrellas y un comentario opcional en el perfil de cada empresa deportiva, una vez hayan utilizado sus servicios. El promedio de calificaciones será visible para todos los usuarios dentro de la plataforma, permitiendo tomar decisiones informadas al momento de elegir una empresa para realizar reservas o inscribirse a entrenamientos. Los administradores podrán visualizar las calificaciones recibidas como parte del seguimiento de la calidad de su servicio.

## **5.10. MÓDULO DE DISEÑO DE INTERFAZ DE USUARIO**

Este módulo contemplará el diseño de los prototipos de interfaz de usuario de la Aplicación Web Progresiva (PWA) utilizando Figma, permitiendo definir la estructura visual y la experiencia de usuario antes del desarrollo del sistema. Los prototipos incluirán las pantallas principales de cada módulo, facilitando la validación del diseño con los usuarios y orientando el proceso de desarrollo.

## **5.11. MÓDULO DE PRUEBAS DEL SISTEMA**

Este módulo contemplará la realización de pruebas de usabilidad, integración y compatibilidad PWA para verificar el correcto funcionamiento del sistema. Las pruebas permitirán identificar errores, validar que los módulos funcionen correctamente de manera conjunta y garantizar una experiencia uniforme en distintos dispositivos y navegadores.

# **6\. LÍMITES**

El desarrollo del sistema multiplataforma basado en una Aplicación Web Progresiva (PWA) para la gestión de canchas deportivas presenta ciertas limitaciones que deben ser consideradas dentro del alcance del proyecto.

En primer lugar, el sistema dependerá del acceso a internet para su funcionamiento, por lo que no podrá ser utilizado de manera óptima en zonas con conectividad limitada o inestable.

Al tratarse de una Aplicación Web Progresiva (PWA), algunas funcionalidades dependerán de la compatibilidad del navegador y del dispositivo utilizado, por lo que características como instalación en el dispositivo, funcionamiento parcial sin conexión o notificaciones podrán variar según el entorno de uso.

Asimismo, la información registrada en la plataforma, como disponibilidad de canchas, horarios, resultados de partidos o estadísticas, dependerá de la correcta actualización de la información por parte de los usuarios y administradores, por lo que la precisión de los datos no podrá ser garantizada por el sistema.

Por otra parte, el sistema no contempla la integración directa con dispositivos físicos o sensores deportivos, por lo que el registro de eventos como goles o resultados deberá ser ingresado manualmente por los organizadores o participantes.

Además, las funcionalidades de pagos estarán limitadas a la validación de transferencias bancarias mediante códigos QR, por lo que no se contempla la integración con pasarelas de pago en línea como tarjetas de crédito o débito.

El sistema estará enfocado principalmente en la gestión y organización deportiva a nivel local o regional, por lo que no se considera inicialmente una cobertura a gran escala o internacional.

Finalmente, algunas funcionalidades avanzadas, como sistemas complejos de análisis o inteligencia artificial, no serán contempladas en esta etapa, ya que el enfoque principal del proyecto es la gestión, organización y digitalización de las actividades deportivas.

# **7\. MARCO TEÓRICO**

## **7.1. MARCO CONCEPTUAL**

### **7.1.1. SISTEMA MULTIPLATAFORMA**

Un sistema multiplataforma es aquel que permite ejecutar una misma aplicación en diferentes sistemas operativos y entornos tecnológicos, como Windows, Android, iOS y navegadores web, a partir de una sola base de código. A diferencia del diseño responsivo, que únicamente adapta la presentación visual de una página web a distintos tamaños de pantalla, un sistema multiplataforma garantiza la ejecución funcional de la aplicación en distintos entornos tecnológicos, manteniendo una experiencia de uso consistente independientemente del dispositivo o sistema operativo utilizado (Meta, 2024).

Desde el punto de vista del desarrollo de software, los sistemas multiplataforma permiten optimizar recursos, reducir tiempos de desarrollo y facilitar el mantenimiento del sistema, ya que gran parte del código puede ser reutilizado. Esto se logra mediante el uso de tecnologías modernas como React, Vite y el enfoque de Aplicación Web Progresiva (PWA), que permiten desarrollar una solución accesible desde navegadores web y dispositivos móviles utilizando una misma base tecnológica.

En el presente proyecto, el enfoque multiplataforma es esencial, ya que permitirá a los usuarios acceder al sistema desde cualquier dispositivo, facilitando la gestión de reservas, la organización de partidos y la participación en torneos deportivos, mejorando así la accesibilidad y la experiencia del usuario.

### **7.1.2. TRANSFORMACIÓN DIGITAL**

La transformación digital es el proceso mediante el cual las organizaciones adoptan tecnologías digitales para mejorar sus procesos, optimizar recursos y ofrecer nuevos servicios. Este proceso implica un cambio en la forma en que se realizan las actividades tradicionales, reemplazando métodos manuales por soluciones tecnológicas más eficientes (Laudon & Laudon, 2020).

En el ámbito deportivo, la transformación digital permite mejorar la organización de actividades, facilitar la comunicación entre usuarios y optimizar la gestión de recursos.

El sistema propuesto contribuirá a la transformación digital de la gestión deportiva, permitiendo automatizar procesos como la reserva de canchas, la organización de partidos y torneos, la gestión de entrenamientos deportivos, el registro de entrenadores y el sistema de calificaciones de empresas, reemplazando métodos manuales e informales por una plataforma digital centralizada que mejora la eficiencia y la experiencia de todos los usuarios.

### **7.1.3. GESTIÓN DE RESERVAS DEPORTIVAS**

La gestión de reservas deportivas consiste en el proceso mediante el cual se administran los espacios físicos destinados a la práctica de actividades deportivas, tales como canchas, horarios y servicios asociados. Este proceso incluye la planificación, asignación y control del uso de dichos espacios, con el objetivo de optimizar su disponibilidad y evitar conflictos en su utilización (Laudon & Laudon, 2020).

Tradicionalmente, este tipo de gestión se ha realizado de manera manual o mediante herramientas informales, lo cual genera problemas como la duplicidad de reservas, falta de organización y dificultad para acceder a información actualizada. La implementación de sistemas digitales permite automatizar estos procesos, facilitando la consulta de disponibilidad en tiempo real y mejorando la eficiencia en la administración de los recursos.

En el sistema propuesto, la gestión de reservas deportivas permitirá a los usuarios seleccionar horarios disponibles, realizar reservas de manera organizada y evitar conflictos, mientras que los administradores podrán gestionar de forma eficiente sus instalaciones, incrementando el uso y la rentabilidad de las canchas.

### **7.1.4. ORGANIZACIÓN DE TORNEOS DEPORTIVOS**

La organización de torneos deportivos implica la planificación y ejecución de competencias que incluyen el registro de equipos, programación de partidos, control de resultados y generación de clasificaciones. Este proceso requiere una adecuada coordinación para garantizar el correcto desarrollo de las actividades deportivas (FIFA, 2022).

En muchos casos, la organización de torneos se realiza de forma manual, lo cual genera dificultades en el seguimiento de resultados y la comunicación entre los participantes. La implementación de sistemas digitales permite automatizar estos procesos, facilitando la gestión de equipos, la programación de encuentros y la actualización de resultados en tiempo real.

El sistema propuesto permitirá gestionar torneos de manera eficiente, permitiendo a los organizadores registrar equipos, programar partidos y generar tablas de posiciones automáticamente, mejorando la organización y control de las competencias.

### **7.1.5. VISUALIZACIÓN DE EVENTOS DEPORTIVOS**

La visualización de eventos deportivos hace referencia a la capacidad de un sistema digital para presentar de manera organizada y accesible la información relacionada con actividades deportivas disponibles, tales como torneos, partidos y entrenamientos, permitiendo a los usuarios consultar su estado, fechas, horarios y detalles relevantes dentro de una plataforma centralizada (Laudon & Laudon, 2020).

Este tipo de funcionalidad es fundamental en sistemas de gestión deportiva, ya que permite a los usuarios mantenerse informados sobre las actividades en las que participan o desean participar, facilitando la toma de decisiones y mejorando la organización de sus actividades deportivas.

En el presente proyecto, la visualización de eventos deportivos permitirá a los usuarios consultar desde su perfil los torneos en los que están inscritos o que han creado, los entrenamientos a los que se han registrado y las reservas confirmadas, incluyendo información de empresa, horario y estado de pago, facilitando así el seguimiento de todas sus actividades deportivas dentro de la plataforma.

### **7.1.6. ESTADISTICAS DEPORTIVAS EN TIEMPO REAL**

Las estadísticas deportivas en tiempo real permiten registrar y visualizar información actualizada sobre el desarrollo de eventos deportivos, tales como marcadores, goles y rendimiento de jugadores. Estas funcionalidades son fundamentales en sistemas modernos, ya que mejoran la experiencia del usuario y permiten un seguimiento detallado de las actividades deportivas (FIFA, 2022).

En el sistema propuesto, esta funcionalidad permitirá visualizar marcadores en vivo, ranking de goleadores y tablas de posiciones, aportando valor adicional a la plataforma.

### **7.1.7. SISTEMA DE CALIFICACIÓN**

Un sistema de calificación permite a los usuarios evaluar servicios o experiencias mediante puntuaciones y comentarios, lo cual contribuye a mejorar la calidad del servicio y generar confianza entre los usuarios (Nielsen Norman Group, 2023).

En el presente proyecto, el sistema de calificación permitirá a los usuarios dejar una puntuación de 1 a 5 estrellas y un comentario opcional en el perfil de cada empresa deportiva, una vez hayan utilizado sus servicios. El promedio de calificaciones será visible para todos los usuarios, permitiendo tomar decisiones informadas al momento de elegir una empresa para realizar sus reservas o inscribirse a entrenamientos.

### **7.1.8. MODELO DE NEGOCIO FREEMIUM**

El modelo de negocio freemium se basa en ofrecer servicios básicos de forma gratuita, mientras que funcionalidades adicionales o avanzadas son ofrecidas mediante un pago. Este modelo es ampliamente utilizado en aplicaciones digitales, ya que permite atraer una gran cantidad de usuarios y posteriormente generar ingresos mediante servicios premium (Stripe, 2024).

Este enfoque resulta especialmente útil en plataformas digitales, ya que permite a los usuarios conocer el sistema antes de realizar un pago, aumentando así la probabilidad de conversión a usuarios de pago.

En el presente proyecto, el modelo freemium permitirá ofrecer funcionalidades básicas como la reserva de canchas y participación en partidos de forma gratuita, mientras que servicios adicionales como promoción de canchas o acceso a estadísticas avanzadas podrán formar parte de funcionalidades premium.

 

### **7.1.9. GEOLOCALIZACIÓN**

La geolocalización es una tecnología que permite determinar la ubicación geográfica de un dispositivo o usuario mediante el uso de sistemas como GPS, redes móviles o direcciones IP. Esta tecnología ha sido ampliamente utilizada en aplicaciones modernas para ofrecer servicios basados en la ubicación del usuario, facilitando el acceso a información relevante en tiempo real (MDN Web Docs, 2024).

En el contexto de los sistemas de información, la geolocalización permite mejorar la experiencia del usuario al proporcionar funcionalidades como visualización de ubicaciones en mapas digitales y acceso a información geográfica relevante sobre los servicios disponibles.

En el presente proyecto, la geolocalización será utilizada para mostrar la ubicación exacta de cada empresa deportiva dentro de su perfil, permitiendo al usuario visualizar en un mapa interactivo dónde se encuentra la cancha, facilitando así la orientación y el acceso a las instalaciones deportivas.

## **7.2. MARCO TÉCNICO**

### **7.2.1. JAVASCRIPT** 

JavaScript es un lenguaje de programación interpretado ampliamente utilizado en el desarrollo de aplicaciones web modernas. Permite crear interfaces dinámicas, manejar eventos del usuario y realizar comunicación con servidores mediante peticiones asíncronas. Su versatilidad ha permitido que sea utilizado tanto en el frontend como en el backend, convirtiéndose en una de las tecnologías fundamentales en el desarrollo de software actual (Flanagan, 2020).

En el presente proyecto, JavaScript será utilizado como lenguaje principal para el desarrollo de la lógica del sistema y de la Aplicación Web Progresiva (PWA), permitiendo una integración eficiente entre los distintos componentes de la plataforma.

### **7.2.2. REACT JS**

React JS es una librería de JavaScript desarrollada por Facebook que permite la creación de interfaces de usuario mediante componentes reutilizables. Su enfoque basado en componentes facilita el desarrollo de aplicaciones escalables, eficientes y de alto rendimiento (Meta, 2024).

En este proyecto, React JS será utilizado para el desarrollo de la Aplicación Web Progresiva (PWA), permitiendo construir una interfaz interactiva que facilite la gestión de reservas, visualización de canchas y participación en eventos deportivos.

### **7.2.3. VITE**

Vite es una herramienta de desarrollo moderna utilizada para crear aplicaciones web de manera rápida y eficiente. Permite configurar proyectos con React de forma sencilla, ofreciendo tiempos de carga reducidos y un entorno de desarrollo optimizado (Vite, 2024).  
 En el presente proyecto, Vite será utilizado junto con React para el desarrollo de la Aplicación Web Progresiva (PWA), facilitando la organización del proyecto y mejorando el rendimiento durante el desarrollo e implementación del sistema.

### **7.2.4. REACT ROUTER DOM**

React Router DOM es una librería de JavaScript que permite gestionar la navegación entre páginas dentro de aplicaciones React sin necesidad de recargar el navegador, implementando el concepto de Single Page Application (SPA). Esto permite que el usuario navegue entre secciones del sistema de forma fluida y rápida (React Router, 2024).  
En el presente proyecto, React Router DOM será utilizado para gestionar todas las rutas del sistema, incluyendo las vistas del usuario jugador, administrador de empresa y super administrador, permitiendo una navegación organizada y eficiente entre los distintos módulos de la plataforma.

### **7.2.5. APLICACIÓN WEB PROGRESIVA (PWA)**

Una Aplicación Web Progresiva (PWA) es una aplicación desarrollada con tecnologías web modernas que permite ofrecer una experiencia similar a una aplicación móvil, pudiendo ejecutarse desde navegadores web y dispositivos móviles. Este tipo de aplicaciones permite mejorar la accesibilidad, adaptarse a diferentes dispositivos y ofrecer funcionalidades como instalación en el dispositivo y acceso rápido al sistema (MDN Web Docs, 2024; Google Developers, 2024a).

En el presente proyecto, la PWA permitirá que los usuarios accedan al sistema desde distintos dispositivos mediante una sola base tecnológica, facilitando la gestión de reservas deportivas, organización de partidos y participación en torneos dentro de una plataforma centralizada.

### **7.2.6. WORKBOX**

Workbox es una librería de Google que permite gestionar el Service Worker de una Aplicación Web Progresiva (PWA), facilitando el almacenamiento en caché de archivos, el funcionamiento parcial sin conexión y la instalación de la aplicación en dispositivos móviles. Se integra de manera automática mediante el plugin vite-plugin-pwa en proyectos desarrollados con Vite (Google Developers, 2024b).

En el presente proyecto, Workbox permitirá que el sistema funcione de manera parcial sin conexión a internet, que los archivos del sistema queden guardados en el dispositivo del usuario y que la aplicación pueda ser instalada como una app nativa en celulares y computadoras.

### **7.2.7. POSTGRESQL**

PostgreSQL es un sistema de gestión de bases de datos relacional que permite almacenar, organizar y gestionar información de manera estructurada. Se caracteriza por su robustez, seguridad y capacidad de manejar grandes volúmenes de datos (PostgreSQL Global Development Group, 2024).

En el presente proyecto, PostgreSQL será utilizado como base de datos principal para almacenar información de usuarios, reservas, partidos, torneos y estadísticas.

### **7.2.8. SUPABASE**

Supabase es una plataforma backend que permite desarrollar aplicaciones modernas utilizando PostgreSQL como base de datos. Proporciona servicios como autenticación de usuarios, almacenamiento y sincronización de datos en tiempo real (Supabase, 2024).

En este sistema, Supabase permitirá gestionar la base de datos, manejar usuarios y actualizar información en tiempo real, como resultados de partidos y reservas. La elección de esta plataforma frente a un backend tradicional se debe a que permite reducir la complejidad del desarrollo, al integrar múltiples servicios en una sola solución, facilitando una implementación más rápida y eficiente. Asimismo, ofrece escalabilidad, soporte en tiempo real y una integración sencilla con aplicaciones web progresivas y sistemas multiplataforma, lo que la convierte en una opción adecuada para el alcance del proyecto.

### **7.2.9. GIT Y GITHUB**

Git es un sistema de control de versiones que permite gestionar los cambios en el código fuente, mientras que GitHub es una plataforma que facilita el trabajo colaborativo en proyectos de software (GitHub, 2024\)

En el proyecto, estas herramientas permitirán mantener el control del desarrollo y facilitar el trabajo en equipo.

### **7.2.10. TRELLO**

Trello es una herramienta de gestión de proyectos que permite organizar tareas mediante tableros visuales, facilitando la planificación y seguimiento de actividades (Atlassian, 2024\)

En este proyecto, Trello será utilizado para organizar el desarrollo del sistema.

### **7.2.11.  FIGMA**  

Figma es una herramienta de diseño de interfaces que permite crear prototipos visuales de aplicaciones, facilitando la planificación del diseño antes del desarrollo (Figma, 2024\)

En el sistema propuesto, Figma será utilizado para diseñar la interfaz de usuario.

## **7.3. METODOLOGÍAS DE DESARROLLO ÁGIL**

### **7.3.1. SCRUM**

Scrum es una metodología ágil que permite gestionar proyectos de software mediante ciclos cortos denominados sprints. Facilita la planificación, adaptación a cambios y entrega progresiva de funcionalidades durante el desarrollo del Sistema (Schwaber & Sutherland, 2020).

En el presente proyecto, Scrum permitirá organizar el desarrollo de manera iterativa, priorizando los módulos principales del sistema y realizando entregas parciales para su revisión y mejora continua.

### **7.3.2. KANBAN**

Kanban es una metodología ágil que permite gestionar tareas mediante un flujo visual, facilitando el control del trabajo en progreso y la identificación de actividades pendientes, en proceso y finalizadas (Kanban University, 2023).

En el presente proyecto, Kanban será utilizado como apoyo para organizar las tareas del desarrollo, controlar el avance de los módulos y mejorar la planificación del trabajo.

## **7.4. PRUEBAS EN EL DESARROLLO DE SOFTWARE**

### **7.4.1. PRUEBAS UNITARIAS**

Las pruebas unitarias son un tipo de prueba de software que se enfocan en verificar el correcto funcionamiento de las unidades más pequeñas del sistema, tales como funciones, métodos o componentes individuales. Estas pruebas se realizan de manera aislada, permitiendo detectar errores en etapas tempranas del desarrollo, lo cual reduce costos y facilita el mantenimiento del sistema (Pressman & Maxim, 2019\)

En el desarrollo del sistema multiplataforma basado en una Aplicación Web Progresiva (PWA), las pruebas unitarias serán fundamentales para asegurar que cada módulo, como el registro de usuarios, la gestión de reservas o el manejo de resultados de partidos, funcione correctamente de manera independiente. Esto permitirá garantizar la calidad del código y evitar fallos en etapas posteriores del desarrollo.

### **7.4.2. PRUEBAS DE USABILIDAD**

Las pruebas de usabilidad tienen como objetivo evaluar la facilidad de uso de un sistema desde la perspectiva del usuario final. Estas pruebas permiten identificar problemas en la interfaz, dificultades de navegación o aspectos que afectan la experiencia del usuario (Nielsen Norman Group, 2023\)

En el contexto del sistema propuesto, este tipo de pruebas permitirá verificar que los usuarios puedan realizar acciones como reservar una cancha, organizar un partido o consultar estadísticas de manera sencilla e intuitiva. La usabilidad es un factor clave, ya que el sistema está dirigido a usuarios con diferentes niveles de conocimiento tecnológico.

### **7.4.3. PRUEBAS DE RENDIMIENTO**

Las pruebas de rendimiento permiten evaluar el comportamiento del sistema bajo diferentes condiciones de carga, como múltiples usuarios accediendo simultáneamente o grandes volúmenes de datos. Estas pruebas permiten identificar problemas de lentitud, fallos o limitaciones en la capacidad del sistema (Pressman & Maxim, 2019\)

En el sistema propuesto, estas pruebas serán importantes para asegurar que el sistema pueda manejar múltiples reservas, consultas de usuarios y actualizaciones en tiempo real sin afectar el rendimiento. Esto es especialmente relevante en momentos de alta demanda, como horarios deportivos concurridos o durante la realización de torneos con varios equipos activos simultáneamente.

### **7.4.4. PRUEBAS DE INTEGRACIÓN**

Las pruebas de integración se encargan de verificar que los diferentes módulos del sistema funcionen correctamente cuando interactúan entre sí. A diferencia de las pruebas unitarias, estas pruebas evalúan la comunicación entre componentes (Pressman & Maxim, 2019).

En el sistema propuesto, estas pruebas permitirán validar que módulos como usuarios, reservas, torneos y estadísticas trabajen de manera conjunta sin errores, garantizando el correcto funcionamiento global del sistema.

### **7.4.5. PRUEBAS DE COMPATIBILIDAD PWA**

Las pruebas de compatibilidad PWA permiten verificar que la Aplicación Web Progresiva funcione correctamente en diferentes navegadores y dispositivos. Estas pruebas evalúan aspectos como la adaptación de la interfaz a distintos tamaños de pantalla, la instalación de la aplicación desde el navegador, el acceso rápido al sistema, el funcionamiento básico sin conexión y el comportamiento de funcionalidades propias de una PWA (MDN Web Docs, 2024).

En el presente proyecto, estas pruebas serán importantes para validar que los usuarios puedan acceder al sistema desde computadoras y dispositivos móviles, manteniendo una experiencia uniforme en la gestión de reservas, partidos y torneos deportivos.

# **8\. METODOLOGÍA DE DESARROLLO DE LA PROPUESTA**

## **8.1. MÉTODOS Y HERRAMIENTAS DE DESARROLLO**

El desarrollo del sistema multiplataforma se llevará a cabo utilizando tecnologías modernas que permitan garantizar eficiencia, escalabilidad y facilidad de mantenimiento. Para la construcción de la plataforma se utilizará React JS junto con Vite, orientado al desarrollo de una Aplicación Web Progresiva (PWA). Este enfoque permitirá que el sistema sea accesible desde navegadores web y dispositivos móviles mediante una sola base de código, optimizando el proceso de desarrollo y facilitando su mantenimiento.

Para la gestión de la información se utilizará Supabase, el cual se basa en PostgreSQL y permite el manejo de bases de datos relacionales, autenticación de usuarios y sincronización de datos en tiempo real. Esto facilitará el desarrollo de funcionalidades como reservas, registro de partidos, gestión de torneos, pagos y actualización de estadísticas.

En cuanto a la gestión del proyecto, se aplicarán metodologías ágiles como Scrum y Kanban, las cuales permitirán organizar el trabajo en iteraciones, adaptarse a cambios y mejorar la productividad del equipo de desarrollo. Estas metodologías serán apoyadas por herramientas como Trello para la planificación de tareas y GitHub para el control de versiones.

Asimismo, se utilizará Figma como herramienta de diseño de interfaces, permitiendo crear prototipos visuales del sistema antes de su implementación, lo cual facilitará la validación del diseño y mejorará la experiencia del usuario.

# **9\. MARCO METODOLÓGICO**

## **9.1. ENFOQUE DE INVESTIGACIÓN**

El presente proyecto adopta un enfoque de investigación mixto, combinando el enfoque cualitativo y cuantitativo. Este enfoque permite analizar tanto la percepción de los usuarios respecto al sistema como los datos obtenidos a partir de su uso, proporcionando una visión más completa del problema y de la solución propuesta (Hernández Sampieri, 2018).

### **9.1.1. ENFOQUE CUALITATIVO**

El enfoque cualitativo permitirá analizar la experiencia de los usuarios, sus necesidades y percepciones respecto a la gestión de canchas deportivas. A través de este enfoque se busca comprender cómo organizan actualmente sus actividades, qué dificultades enfrentan al reservar canchas o coordinar partidos, y qué esperan de una solución tecnológica.

Para ello, se utilizarán técnicas como entrevistas y encuestas abiertas, que permitirán obtener información sobre los problemas actuales y las mejoras necesarias. Esta información ayudará a orientar el diseño del sistema para que sea útil, práctico y acorde a las necesidades reales de los usuarios.

### **9.1.2. ENFOQUE CUANTITATIVO**

El enfoque cuantitativo permitirá analizar datos numéricos relacionados con el uso del sistema, como la cantidad de reservas realizadas, la participación en torneos y la frecuencia de uso de la plataforma, con el fin de medir su impacto y efectividad.

Se considerarán indicadores como el número de usuarios registrados, la cantidad de reservas, los horarios más demandados, los partidos y torneos creados, las transacciones realizadas mediante pagos QR y la participación de los usuarios. También se considerará la accesibilidad desde diferentes dispositivos, debido a que el sistema será desarrollado bajo un enfoque de Aplicación Web Progresiva (PWA). El análisis de estos datos permitirá conocer el comportamiento de uso del sistema y evaluar su contribución en la mejora de la gestión de canchas deportivas.

## **9.2. TIPO DE INVESTIGACIÓN**

### **9.2.1. INVESTIGACIÓN APLICADA**

El proyecto se clasifica como investigación aplicada, ya que busca resolver un problema real mediante el desarrollo de un sistema multiplataforma basado en una Aplicación Web Progresiva (PWA), orientado a facilitar la gestión de canchas deportivas y la organización de actividades deportivas.

### **9.2.2. INVESTIGACIÓN DESCRIPTIVA**

También se considera una investigación descriptiva, ya que permite analizar y describir la situación actual en la gestión de canchas deportivas, identificando sus principales problemáticas, necesidades de los usuarios y procesos que pueden ser optimizados mediante una solución tecnológica.

## **9.3. MÉTODO DE INVESTIGACIÓN**

El desarrollo del presente proyecto se fundamenta en la aplicación de métodos de investigación que permiten obtener, analizar y validar la información necesaria para la construcción de la solución propuesta. En este sentido, se emplean métodos teóricos y empíricos, los cuales permiten abordar el problema desde una perspectiva integral, combinando el análisis conceptual con la recolección de datos reales del entorno.

El uso de ambos métodos resulta fundamental, ya que no solo se busca comprender el problema desde un enfoque académico y documental, sino también validar la solución a partir de la experiencia y necesidades reales de los usuarios. Esta combinación permite garantizar que el sistema desarrollado tenga una base sólida tanto en teoría como en la práctica.

### **9.3.1. MÉTODOS TEÓRICOS**

En el presente proyecto se emplean métodos teóricos con el objetivo de fundamentar la propuesta mediante el análisis de información existente relacionada con el desarrollo de software y sistemas multiplataforma. Estos métodos permiten comprender conceptos clave, tecnologías utilizadas y enfoques actuales en el desarrollo de aplicaciones.

Para ello, se realiza una revisión bibliográfica basada en libros, documentación técnica y recursos digitales actualizados, los cuales abordan temas como desarrollo web, aplicaciones web progresivas (PWA), bases de datos y metodologías ágiles. Asimismo, se analiza información de sistemas similares para identificar buenas prácticas que puedan aplicarse en el desarrollo del proyecto.

El uso de estos métodos permite construir una base teórica sólida que respalda la solución propuesta y orienta adecuadamente el desarrollo del sistema.

### **9.3.2. MÉTODOS EMPÍRICOS**

En el desarrollo del proyecto se emplean métodos empíricos orientados a la observación del contexto real en el que se presenta el problema. Estos métodos permiten identificar de manera directa las dificultades existentes en la organización de actividades deportivas y la gestión de canchas.

En este caso, se utiliza principalmente la observación como técnica, analizando cómo las personas organizan actualmente partidos, reservas de canchas y torneos. Esto permite comprender las limitaciones de los métodos tradicionales y detectar oportunidades de mejora mediante el uso de una solución tecnológica.

Asimismo, se contemplará la realización de pruebas del sistema, con el objetivo de verificar su correcto funcionamiento y evaluar el desempeño de sus principales funcionalidades, como reservas, pagos, organización de eventos y accesibilidad desde distintos dispositivos.

De igual manera, se realizará la validación con usuarios, permitiendo obtener retroalimentación sobre la usabilidad del sistema, su facilidad de uso y el nivel de aceptación por parte de los usuarios.

La aplicación de estos métodos permite que el sistema propuesto esté basado en una necesidad real, asegurando que la solución sea útil, práctica y acorde al entorno en el que será implementada.

## **9.4. POBLACIÓN Y MUESTRA**

La población del presente proyecto está conformada por personas que participan en actividades deportivas en la ciudad de Cochabamba, tales como jugadores, organizadores de partidos y administradores de canchas deportivas.

Para el desarrollo del estudio, se trabajará con una muestra no probabilística por conveniencia, conformada por aproximadamente 20 a 30 usuarios.

La elección de este tamaño de muestra se fundamenta en el enfoque del proyecto, orientado a la validación funcional y evaluación de usabilidad del sistema. En este tipo de estudios, un grupo reducido de usuarios es suficiente para identificar problemas de uso, evaluar el comportamiento del sistema y obtener retroalimentación significativa.

Asimismo, esta muestra permitirá realizar pruebas en escenarios reales y analizar la interacción de los usuarios con la plataforma, contribuyendo a la validación de la propuesta.

## **9.5. TÉCNICAS DE RECOLECCIÓN DE DATOS**

Para la obtención de información se emplea principalmente la técnica de observación directa, la cual permite analizar cómo las personas organizan actualmente sus actividades deportivas y qué dificultades presentan en este proceso.

Mediante esta técnica se identifican problemas como la falta de organización en partidos, dificultades para coordinar horarios y limitaciones en la gestión de canchas. Esta información es fundamental para definir los requerimientos del sistema y plantear una solución adecuada.

Asimismo, se utilizarán encuestas dirigidas a los usuarios, con el fin de recopilar información sobre sus necesidades, preferencias y percepción respecto al uso de plataformas digitales para la gestión de actividades deportivas.

Finalmente, se aplicará la validación del sistema mediante pruebas de uso, permitiendo obtener retroalimentación directa de los usuarios sobre la funcionalidad, facilidad de uso y utilidad del sistema propuesto.

## **9.6. HERRAMIENTAS DE INFORMACIÓN**

Para el desarrollo del proyecto se utilizan diversas herramientas tecnológicas que facilitan tanto la construcción del sistema como la organización de la información.

Entre las principales herramientas se encuentran lenguajes de programación como JavaScript, bibliotecas y herramientas de desarrollo como React JS y Vite para el desarrollo de la Aplicación Web Progresiva (PWA), así como servicios como Supabase para la gestión de la base de datos. Además, se emplean herramientas de control de versiones como Git y GitHub, herramientas de diseño como Figma y herramientas de gestión de tareas como Trello.

El uso de estas herramientas permite optimizar el proceso de desarrollo y garantizar una mejor organización del proyecto.

## **9.7. FUENTES DE INFORMACIÓN**

Las fuentes de información utilizadas en el presente proyecto se dividen en fuentes primarias y secundarias.

Las fuentes primarias corresponden a la información obtenida mediante la observación directa del entorno, lo que permite identificar las necesidades reales de los usuarios en relación con la organización de actividades deportivas.

Por otro lado, las fuentes secundarias incluyen libros, artículos académicos, documentación técnica y recursos digitales relacionados con el desarrollo de software, tecnologías utilizadas y metodologías de trabajo. Estas fuentes permiten fundamentar teóricamente el proyecto y respaldar la solución propuesta.

# **10\. ÍNDICE TENTATIVO**

#### **INTRODUCCIÓN**

**CAPÍTULO I**

**MARCO TEÓRICO**

#### 1.1   	**MARCO CONCEPTUAL**

1.1.1            	*SISTEMA MULTIPLATAFORMA*

1.1.2            	*TRANSFORMACIÓN DIGITAL*

1.1.3            	*GESTIÓN DE RESERVAS DEPORTIVAS*

1.1.4            	*ORGANIZACIÓN DE TORNEOS DEPORTIVOS*

1.1.5            	*VISUALIZACIÓN DE EVENTOS DEPORTIVOS*

1.1.6            	*ESTADÍSTICAS DEPORTIVAS EN TIEMPO REAL*

1.1.7            	*SISTEMA DE CALIFICACIÓN*

1.1.8            	*MODELO DE NEGOCIO FREEMIUM*

1.1.9            	*GEOLOCALIZACIÓN*

#### 1.2              	**MARCO TÉCNICO**

##### 1.2.1            	*JAVASCRIPT*

##### 1.2.2            	*REACT JS*

##### 1.2.3            	*VITE*

##### 1.2.4            	*REACT ROUTER DOM*

##### 1.2.5            	*APLICACIÓN WEB PROGRESIVA (PWA)*

##### 1.2.6            	*WORKBOX*

##### 1.2.7            	*POSTGRESQL*

##### 1.2.8            	*SUPABASE*

##### 1.2.9            	*GIT Y GITHUB*

##### 1.2.10          	*TRELLO*

##### 1.2.11          	*FIGMA*

#### 1.3                  **METODOLOGÍAS DE DESARROLLO ÁGIL**

##### 1.3.1            	*SCRUM*

##### 1.3.2            	*KANBAN*

#### 1.4                  **PRUEBAS EN EL DESARROLLO DE SOFTWARE**

##### 1.4.1            	*PRUEBAS UNITARIAS*

##### 1.4.2            	*PRUEBAS DE USABILIDAD*

##### 1.4.3            	*PRUEBAS DE RENDIMIENTO*

##### 1.4.4            	*PRUEBAS DE INTEGRACIÓN*

##### 1.4.5            	*PRUEBAS DE COMPATIBILIDAD PWA*

#### 1.5                   **MARCO METODOLÓGICO**

##### 1.5.1            	*ENFOQUE DE INVESTIGACIÓN*

##### 1.5.1.1 	             	*ENFOQUE CUALITATIVO*

##### 1.5.1.2 	             	*ENFOQUE CUANTITATIVO*

##### 1.5.2            	*TIPO DE INVESTIGACIÓN*

##### 1.5.2.1 	             	*INVESTIGACIÓN APLICADA*

##### 1.5.2.2 	             	*INVESTIGACIÓN DESCRIPTIVA*

##### 1.5.3            	*MÉTODO DE INVESTIGACIÓN*

##### 1.5.3.1 	             	*MÉTODOS TEÓRICOS*

##### 1.5.3.2 	             	*MÉTODOS EMPÍRICOS*

##### 1.5.4            	*POBLACIÓN Y MUESTRA*

##### 1.5.5            	*TÉCNICAS DE RECOLECCIÓN DE DATOS*

##### 1.5.6            	*HERRAMIENTAS DE INFORMACIÓN*

##### 1.5.7            	*FUENTES DE INFORMACIÓN*

   
 

**CAPÍTULO II**

**INGENIERÍA DEL PROYECTO  **

 

2.1        	**DETERMINACIÓN DE REQUERIMIENTOS**

2.1.1    	LEVANTAMIENTO DE REQUERIMIENTOS

2.1.2    	ESPECIFICACIÓN DE REQUERIMIENTOS FUNCIONALES

2.1.3    	ESPECIFICACIÓN DE REQUERIMIENTOS NO FUNCIONALES

2.2        	**MODELAMIENTO Y DISEÑO DEL SISTEMA**

2.2.1    	DISEÑO DE LA BASE DE DATOS

2.2.2    	DISEÑO DE ARQUITECTURA DEL SISTEMA

2.2.3    	DISEÑO DE ARQUITECTURA PWA

2.2.4    	DIAGRAMAS DEL SISTEMA

2.2.4.1 	DIAGRAMA DE CASOS DE USO

2.2.4.2 	DIAGRAMA DE SECUENCIA

2.2.4.3 	DIAGRAMA DE CLASES

2.2.5    	MODELO DE DATOS

2.2.5.1 	ENTIDADES (POSTGRESQL/SUPABASE)

2.2.5.2 	RELACIONES ENTRE TABLAS

2.2.6    	DISEÑO DE INTERFAZ DE USUARIO (FIGMA)

2.3        	**DESARROLLO DE LA APLICACIÓN WEB PROGRESIVA**

2.3.1    	MÓDULO DE GESTIÓN DE USUARIOS

2.3.2    	MÓDULO DE GESTIÓN DE CANCHAS DEPORTIVAS

2.3.3    	MÓDULO DE RESERVAS Y PAGOS

2.3.4    	MÓDULO DE ORGANIZACIÓN DE EVENTOS DEPORTIVOS

2.3.5    	MÓDULO DE RECOMPENSAS O PUNTOS

2.3.6    	MÓDULO DE SOPORTE A LA TOMA DE DECISIONES

2.3.7    	MÓDULO DE ENTRENAMIENTOS DEPORTIVOS

2.3.8    	MÓDULO DE GESTIÓN DE ENTRENADORES

2.3.9    	MÓDULO DE CALIFICACIONES

2.4        	**IMPLEMENTACIÓN DE FUNCIONALIDADES PWA**

2.5        	**PLAN DE IMPLEMENTACIÓN**

 

**CAPÍTULO III**

**PRUEBAS Y CALIDAD DE SOFTWARE**

 

3.1        	**ESTRATEGIA DE PRUEBAS**

3.2        	**PRUEBAS DEL SISTEMA**

3.2.1    	PRUEBAS UNITARIAS

3.2.2    	PRUEBAS DE INTEGRACIÓN

3.2.3    	PRUEBAS DE USABILIDAD

3.2.4    	PRUEBAS DE RENDIMIENTO

3.2.5    	PRUEBAS DE COMPATIBILIDAD PWA

3.3        	**RESULTADOS DE LAS PRUEBAS**

3.4        	**PLAN DE CONTINGENCIA**

3.5        	**PLANES DE RESPUESTA A INCIDENTES DE SEGURIDAD**

 

**CAPÍTULO IV**

**ESTIMACIÓN DE COSTOS**

 

#### 4.1       	**ESTIMACIÓN DE COSTOS DE RECURSOS DEL DESARROLLO**

4.1.1            	*CÁLCULO DE ESFUERZO*

4.1.2            	*CÁLCULO DEL TIEMPO DE DESARROLLO*

4.1.3            	*ESTIMACIÓN DE COSTOS DE HERRAMIENTAS*

#### 4.2       	**COSTO TOTAL DEL DESARROLLO**

 

**CONCLUSIONES Y RECOMENDACIONES**

**BIBLIOGRAFÍA**

**APÉNDICE**

**ANEXOS**

# **11\. CRONOGRAMA**

Para asegurar una adecuada gestión del tiempo y los recursos del proyecto, se elaboró un cronograma de actividades que permite visualizar la duración y distribución temporal de cada una de las fases del desarrollo del sistema multiplataforma basado en una Aplicación Web Progresiva (PWA).

En la Figura 11.1 se presenta el Cronograma de Actividades, el cual abarca un periodo de ocho meses, comprendido desde abril hasta noviembre. Este cronograma se encuentra dividido en seis etapas: planificación y análisis, diseño del sistema, desarrollo del sistema, pruebas y optimización, implementación y validación, y documentación. Cada una de estas fases contempla actividades específicas relacionadas con el desarrollo del sistema para la gestión de canchas deportivas, organización de partidos y torneos, las cuales se ejecutan de forma secuencial y, en algunos casos, de manera paralela para optimizar el tiempo de desarrollo.  
   
Figura 11.1 \- Cronograma de actividades

Fuente: Elaboración propia, 2026

# **12\. BIBLIOGRAFÍA**

#  

Atlassian. (2024). *Trello Guide*. Obtenido de Trello: https://trello.com/guide  
FIFA. (2022). *Organización de competiciones*. Obtenido de FIFA: https://www.fifa.com  
Figma. (2024). *Figma Help Center*. Obtenido de Figma: https://help.figma.com  
Flanagan, D. (2020). *JavaScript: The Definitive Guide.* Sebastopol: O’Reilly Media.  
Fulbito.pe. (2022). *Reserva de canchas de futbol*. Obtenido de Fulbito: https://fulbito.pe  
GitHub. (2024). *GitHub Documentation*. Obtenido de GitHub: https://docs.github.com  
Google Developers. (2024a). *Progressive Web Apps*. Obtenido de web.dev: https://web.dev/explore/progressive-web-apps  
Google Developers. (2024b). *Workbox*. Obtenido de Chrome Developers: https://developer.chrome.com/docs/workbox  
Hernández Sampieri, R. (2018). *Metodología de la investigación.* McGraw-Hill.  
Kanban University. (2023). *What is Kanban*. Obtenido de Kanban University: https://kanban.university  
Laudon, K. C., & Laudon, J. P. (2020). *Management Information Systems.* Pearson.  
MDN Web Docs. (2024). *Progressive Web Apps*. Obtenido de MDN Web Docs: https://developer.mozilla.org/en-US/docs/Web/Progressive\_web\_apps  
Meta. (2024). *React Documentation*. Obtenido de React: https://react.dev  
Nielsen Norman Group. (2023). *UX Research Methods*. Obtenido de Nielsen Norman Group: https://www.nngroup.com/articles/  
Playtomic. (2023). *Plataforma de reservas deportivas*. Obtenido de Playtomic: https://playtomic.io  
PostgreSQL Global Development Group. (2024). *PostgreSQL Documentation*. Obtenido de PostgreSQL: https://www.postgresql.org/docs/  
Pressman, R. S., & Maxim, B. R. (2019). *Software Engineering: A Practitioner’s Approach.* McGraw-Hill.  
React Router. (2024). *React Router Documentation*. Obtenido de React Router: https://reactrouter.com  
Schwaber, K., & Sutherland, J. (2020). *The Scrum Guide*. Obtenido de Scrum Guide: https://scrumguides.org  
Stripe. (2024). *Stripe Documentation*. Obtenido de Stripe: https://stripe.com/docs  
Supabase. (2024). *Supabase Documentation*. Obtenido de Supabase: https://supabase.com/docs  
Vite. (2024). *Vite Documentation*. Obtenido de Vite: https://vite.dev  
   
   
 

#  

 

