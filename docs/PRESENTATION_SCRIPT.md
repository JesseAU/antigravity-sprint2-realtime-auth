# 🎬 Guion de Presentación Grupal - SyncRoom Sprint 2

> **Instrucciones para el equipo:** 
> - Este es el guion base para el video de 10-15 minutos. 
> - Divídanse los "Actos" entre los miembros del equipo.
> - Pueden copiar todo este texto y pegarlo en Microsoft Word para tenerlo a mano durante la grabación.

---

## 🎭 ACTO 1: Introducción y Arquitectura (Tiempos: 0:00 - 2:30)

**[Acción en Pantalla]**
- Abrir VS Code. 
- Mostrar el explorador de archivos con las carpetas: `src/app`, `src/components`, `src/services`, `src/lib`.
- Abrir brevemente el archivo `README.md` técnico.

**[Narrador 1 - Líder/Arquitectura]**
_"Hola a todos, somos el equipo encargado del desarrollo de **SyncRoom** y hoy les presentamos los resultados de nuestro Sprint 2._

_Nuestro objetivo principal en este sprint fue sentar unas bases sólidas y profesionales. Para ello, migramos de un prototipo básico a una **arquitectura tipo Next.js orientada al dominio (Feature Slices)**. Como pueden ver en nuestro código, ahora tenemos separada la lógica de negocio en la carpeta `services/`, la configuración de la base de datos en `lib/`, y las interfaces visuales reutilizables en `components/`. Esto hace que nuestra aplicación no solo funcione, sino que sea fácilmente mantenible y escalable para el futuro._

_Además, todo este esfuerzo se encuentra respaldado por una fuerte cultura de documentación, evidenciada en nuestro completo README técnico y reportes de depuración de errores."_

---

## 🎭 ACTO 2: Autenticación Segura (Tiempos: 2:30 - 5:30)

**[Acción en Pantalla]**
- Mostrar la aplicación web cargando (localhost:5173).
- Presionar `F12` para mostrar la Pestaña "Network" (Red) de Chrome.
- Hacer un registro o inicio de sesión en vivo.

**[Narrador 2 - Frontend/Auth]**
_"El primer pilar funcional que consolidamos fue la seguridad. Hemos integrado **Supabase Auth** como nuestro proveedor de identidad._

_En lugar de guardar tokens de forma insegura, nuestro `auth-service.js` delega la gestión de sesiones directamente a Supabase. Como estamos demostrando en pantalla, al iniciar sesión, el sistema valida nuestras credenciales en la base de datos PostgreSQL._

_(Mientras inicia sesión)_ _Una vez autenticados, nuestra aplicación utiliza escuchas de eventos globales (`onAuthStateChange`) para determinar a qué rutas podemos acceder. Si alguien intenta entrar a una sala sin sesión, o si cerramos la sesión en este momento, el enrutador nos protege redirigiéndonos a la pantalla de Login inmediatamente. Todo gestionado con Contextos de React y RLS (Row Level Security) en el backend."_

---

## 🎭 ACTO 3: Sincronización en Tiempo Real (Tiempos: 5:30 - 9:30)

**[Acción en Pantalla]**
- Poner la pantalla dividida (o abrir una ventana de Incógnito).
- Ventana Izquierda: El creador ("Host") hace una sala y espera en el menú.
- Ventana Derecha: El invitado entra usando el PIN de la sala.

**[Narrador 3 - Backend/Realtime]**
_"Pasando al núcleo de SyncRoom: la experiencia multijugador. Aquí demostraremos el uso de **Supabase Realtime**, que utiliza WebSockets bajo el capó para sincronizar a los usuarios sin tener que recargar la página web._

_(Mientras el invitado entra a la sala)_
_Vean cómo, al instante de que el invitado entra en la pestaña derecha, la pantalla del creador en la izquierda se actualiza mostrando el nuevo participante._

_Parece simple por fuera, pero técnicamente requirió decisiones importantes. Implementamos un mecanismo de **Reference Counting** (Conteo de Referencias) en nuestro código. Esto asegura que si múltiples componentes de la pantalla necesitan escuchar actualizaciones de la misma sala, no abramos 5 conexiones a la base de datos. Compartimos un solo canal eficiente y, cuando ambos usuarios se van, cerramos la suscripción limpiamente para evitar sobrecargar el servidor y prevenir Memory Leaks."_

---

## 🎭 ACTO 4: Debugging y Resiliencia (Tiempos: 9:30 - 13:00) 🌟 EL CLÍMAX

**[Acción en Pantalla]**
- El anfitrión da clic en "Set Ready" y "Start Match" rápido.
- Abrir la consola de Chrome (`F12` pestaña Console) para mostrar los registros del `debugLogger` (letras verdes/azules).
- Repetir el escenario de "Click Doble Rápido" en "Finish Match" para que se vea el error `409 Conflict` rojo, pero **la web siga intacta**.
- Mostrar brevemente el código `supabase/functions/room-manager/index.ts`.

**[Narrador 4 - Resolutor de Problemas/Zaid]**
_"Finalmente, queremos destacar la resiliencia que construimos hoy. Una aplicación web en tiempo real sufre mucho por desincronización de estado, específicamente por **Condiciones de Carrera (Race Conditions)**._

_Durante nuestras pruebas, descubrimos el 'Bug del Doble Clic'. Si un Host desesperado hacía clic en 'Finish Match' dos veces rapidísimo, enviaba mutaciones contradictorias a la base de datos, corrompiendo el estado de la sala y mostrando pantallas en blanco a los usuarios (Error 400)._

_Para solucionarlo de raíz:_
_1. **Backend Atómico:** Movimos la lógica crítica a un **Supabase Edge Function** que se ejecuta en la nube de Deno. Este código verifica atómicamente si el estado de la sala es el esperado. Si detecta el segundo clic simultáneo, lo rechaza enviando un código HTTP `409 Conflict` por seguridad._
_2. **Frontend Resiliente:** En nuestra UI, implementamos estados de carga (`isUpdating`). Pero lo más brillante es que enseñamos a React a capturar silenciosamente ese Error 409 enviado por el Edge Function. Como vieron en consola, el error ocurrió por la red, pero la pantalla del usuario jamás se rompió ni mostró alertas confusas; la experiencia siguió siendo perfecta._

_Documentamos meticulosamente estos procesos de depuración guiada, porque creemos que manejar los fallos es tan importante como programar la funcionalidad principal."_

---

## 🎭 ACTO 5: Conclusión (Tiempos: 13:00 - 15:00)

**[Acción en Pantalla]**
- Regresar a la pantalla de todos finalizando partida y saliendo al Dashboard.

**[Cualquier Narrador - Cierre]**
_"En conclusión, en este Sprint 2 no nos limitamos a hacer que la app funcione. Hemos 'blindado' la arquitectura. Tenemos perfiles de usuarios seguros, sincronización fluida, prevención de vulnerabilidades por latencia o clics múltiples, y un sistema de **Logging avanzado** que nos ahorró horas de depuración._

_Tenemos cimientos de nivel de producción listos para soportar mecánicas de juego mucho más ambiciosas. Gracias por su atención, ¡este fue el Sprint 2 de SyncRoom!"_
