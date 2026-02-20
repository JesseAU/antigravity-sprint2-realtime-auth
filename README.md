# Antigravity Sprint 2 - Realtime Match Room System

## � ¿De qué trata este proyecto?
Este proyecto implementa una plataforma de **Salas de Juego/Espera en Tiempo Real**.
El objetivo es permitir que múltiples usuarios se conecten simultáneamente, creen salas y se unan a ellas al instante, todo sincronizado en vivo (Realtime) sin necesidad de recargar la página.

Es la base fundamental para cualquier aplicación multijugador, sistema de colas o chat en vivo, construida con React (Frontend) y Supabase (Backend).

## �🚀 Developer 2: Arquitectura y Backend (MCP Sync)
Este repositorio contiene la implementación crítica del **sistema de gestión a nivel de servidor**.

A diferencia del Frontend (UI), este rol se centró en la **integridad de datos, seguridad y escalabilidad**.

---

### 🛡️ 1. Infraestructura Robusta (Core Backend)

#### A. Cliente Supabase Optimizado (`Singleton Pattern`)
Se implementó una instancia única del cliente Supabase en `src/lib/supabaseClient.js`.
*   **Por qué:** Evita conexiones múltiples innecesarias y fugas de memoria.
*   **Seguridad:** Valida automáticamente que las claves de entorno existan antes de intentar conectar, protegiendo la aplicación de errores silenciosos.

#### B. Diseño de Base de Datos Seguro (`Schema & RLS`)
La tabla `public.rooms` no es una simple lista; es una estructura protegida con **Row Level Security (RLS)** granular:
*   **Lectura:** Pública (Lobby).
*   **Escritura:** Solo usuarios autenticados.
*   **Modificación:** Estrictamente limitada al Host (creador) o al Guest (participante). *Nadie más puede alterar una sala ajena.*
*   **Restricciones de Integridad:** Se usan `CHECK constraints` para los estados (`waiting`, `active`, `finished`), garantizando que la DB rechace estados inválidos a nivel de motor SQL.

#### C. Lógica de Negocio Centralizada (`Service Layer`)
Toda la lógica compleja se encapsuló en `src/services/roomService.js`, desacoplando la UI de la base de datos.
*   **Validaciones Atómicas:** La función `joinRoom` verifica en una sola transacción que la sala:
    1.  Exista.
    2.  Esté en estado `waiting`.
    3.  El usuario no sea el Host intentando unirse a sí mismo.
*   **Manejo de Errores Estandarizado:** Todas las funciones retornan un objeto predecible `{ success: boolean, data?, error? }`, facilitando la vida al equipo de Frontend.

---

### 🧪 2. Verificación Independiente (QA Testing)

Para garantizar la solidez del sistema **antes** de que existiera cualquier interfaz gráfica, se creó un entorno de pruebas aislado:
*   **Script:** `test-dev2.js`
*   **Funcionalidad:**
    *   Simula usuarios reales (Host/Guest).
    *   Ejecuta inserciones y actualizaciones contra la producción.
    *   Verifica que las políticas RLS funcionen (intentando borrar salas ajenas, por ejemplo).
*   **Resultado:** 100% de éxito en operaciones CRUD bajo condiciones de red reales.

---

### 📡 3. Preparación para Realtime
Se configuró explícitamente la publicación de eventos (`alter publication supabase_realtime add table public.rooms;`). Esto:
*   Habilita al servidor Postgres para emitir eventos `INSERT`, `UPDATE`, `DELETE`.
*   Permite que el Frontend (Dev 3) se suscriba instantáneamente sin configuración adicional.

---

## ⏭️ Continuidad y Próximos Pasos (Handover a Developer 3)

El proyecto se entrega con el Backend totalmente funcional y probado. Para finalizar la implementación del sistema "Realtime Match Room", el siguiente desarrollador debe ejecutar estas acciones específicas:

### 1. Integración en el Lobby (`src/components/Lobby.jsx`)
*   **Estado Actual:** Muestra datos falsos (`initialMockRooms`).
*   **Acción Requerida:**
    *   Eliminar el array `initialMockRooms`.
    *   Importar `roomService` y llamar a `roomService.getWaitingRooms()` en un `useEffect`.
    *   Reemplazar la lógica de `handleCreateRoom` para usar `roomService.createRoom(user.id)`.

### 2. Activación de Realtime
*   **Estado Actual:** La base de datos emite eventos, pero nadie los escucha.
*   **Acción Requerida:**
    *   Configurar un canal de supabase (`supabase.channel('rooms-channel')`) en `Lobby.jsx`.
    *   Escuchar el evento `INSERT` para agregar nuevas salas a la lista en vivo sin recargar.
    *   Escuchar el evento `UPDATE` para remover salas que pasen a estado `active` (llenas).

### 3. Sala de Espera (`src/components/Room.jsx`)
*   **Estado Actual:** Componente estático.
*   **Acción Requerida:**
    *   Implementar un listener que detecte cuando el campo `guest_id` cambie (alguien se unió).
    *   Redirigir a ambos usuarios (Host y Guest) a la vista de juego/chat cuando el estado cambie a `active`.

---

## 👥 Roles del Proyecto

| Rol | Estado | Responsabilidad |
| :--- | :--- | :--- |
| **Dev 1 (Auth)** | ✅ Listo | Login y Registro de usuarios. |
| **Dev 2 (Backend)** | ✅ **FINALIZADO** | Arquitectura, DB, Servicios y Testing. |
| **Dev 3 (Frontend)** | ⏳ Pendiente | Interfaz Visual (UI) y consumo de servicios. |

---

## ⚙️ Ejecución

1.  **Configurar Entorno:**
    ```env
    VITE_SUPABASE_URL=...
    VITE_SUPABASE_ANON_KEY=...
    ```
2.  **Instalar y Correr:**
    ```bash
    npm install
    npm run dev
    ```
3.  **Verificar Backend (Independiente):**
    ```bash
    node test-dev2.js
    ```
---
