que p# SyncRoom: Realtime Match Room System 🚀

**Sprint 2 - Professional Edition**

SyncRoom es una plataforma de gestión de salas en tiempo real diseñada para ser segura, escalable y altamente resiliente. Este proyecto demuestra la implementación de arquitecturas empresariales modernas utilizando **React + Vite** en el frontend y **Supabase** (Postgres, Realtime, Functions) en el backend.

---

## 🏗️ 1. Arquitectura Profesional (Modular & Layered)

El proyecto ha sido reestructurado siguiendo estándares de **Clean Architecture** y convenciones de **Next.js**, organizando el código por dominios de negocio y capas de responsabilidad.

### Estructura de Directorios
```bash
src/
├── app/                  # Estilos globales e infraestructura base.
├── components/           # Componentes organizados por dominio.
│   ├── auth/            # Gestión de acceso y seguridad.
│   ├── dashboard/       # Lógica de salas, lobby y creación.
│   ├── matching/        # Sistema de emparejamiento (Swipe).
│   └── layout/          # Componentes compartidos (Error Boundaries, Prompts).
├── lib/
│   ├── supabase/        # Cliente centralizado y optimizado.
│   └── utils/           # Reglas de negocio (Domain Logic) y logging.
├── services/            # Capa de comunicación con la API (Singleton Services).
├── App.jsx              # Orquestador principal.
└── main.jsx             # Punto de entrada.
```

---

## ✨ 2. Características Principales

### 📡 Sincronización en Tiempo Real
- **Detección Instantánea**: Las salas nuevas aparecen en el lobby sin recargar.
- **Estado de Sala**: Sincronización en vivo de estados (`waiting` → `ready` → `playing` → `finished`).
- **Lista de Participantes**: Actualización inmediata cuando un usuario se une o abandona.

### 🧩 Sistema de Matching (Swipe System)
- **Exploración Dinámica**: Los usuarios pueden explorar salas mediante una interfaz de "Swipe".
- **Detección de Interés**: Al dar "Like" a una sala, el sistema registra el interés y notifica coincidencias automáticas mediante el `MatchPrompt`.

### 🛡️ Seguridad y Robustez
- **Row Level Security (RLS)**: Políticas granulares en Postgres para asegurar que solo los dueños puedan editar sus salas.
- **Edge Functions (Supabase Functions)**: Procesamiento server-side crítico para validar transiciones de estado de forma atómica.
- **Race Condition Prevention**: Validación concurrente en DB para evitar que dos acciones conflictivas ocurran al mismo tiempo.

---

## 3. Sincronización en Tiempo Real y Estado

- **Arquitectura de Sincronización**: Uso de canales dedicados (`room_details_[ID]` y `room_participants_[ID]`) para mantener el estado sincronizado sin refrescar la página.
- **Reference Counting**: Implementado en `src/services/room-service.js` para gestionar mútiples suscripciones a un mismo canal, evitando memory leaks y conexiones fantasma.
- **Transiciones de Estado Seguras**: Los cambios de estado de la sala (`waiting` -> `ready` -> `playing` -> `finished`) son validados estrictamente en Edge Functions para prevenir *Race Conditions* e inconsistencias.

## 🛠️ Debugging Guiado y Manejo de Errores

Durante el Sprint 2, realizamos una serie de simulaciones exhaustivas para garantizar la resiliencia de la plataforma. Todo el proceso está meticulosamente documentado en nuestro **Reporte Técnico de Debugging**:

👉 **[Ver Reporte Completo de Debugging Guiado](docs/DEBUGGING_REPORT.md)**

**Hitos clave logrados y documentados en el reporte:**
1. **Sistema de Logging Profesional (`debugLogger`)**: Implementación de niveles de logs (INFO, WARN, ERROR, DEBUG) con trazabilidad de red y renderizado para auditoría técnica.
2. **Prevención de Data Races (Condiciones de Carrera)**: Solución del critical bug del "doble clic" agresivo (Error 400 mitigado a un 409 Conflict manejado silenciosamente por UI).
3. **Resiliencia ante Desconexiones**: Manejo seguro del estado de suscripciones (`SUPABASE_REALTIME_SUBSCRIPTION_ERROR`) y reconexión de hosts.
4. **Boundary Catcher**: Simulación de errores de React (Unexpected Application Error) mitigados con notificaciones graceful en contexto de usuario.

---

## 4. UI / UX y Componentes Reutilizables

El sistema ha sido "blindado" contra situaciones inesperadas:

| Caso de Borde | Solución Implementada |
| :--- | :--- |
| **Re-entrada de Host** | Los creadores de salas tienen "llaves maestras" para re-entrar a sus salas aunque estén en estado `ready` o `playing`. |
| **Falla de Red** | Implementación de `Reference Counting` en suscripciones Realtime para recuperar la conexión automáticamente sin duplicar canales. |
| **Conflictos de Estado** | Uso de `ExpectedCurrentStatus` en llamadas a Edge Functions para asegurar que nadie actualice una sala que ya cambió. |
| **Campos de Login Vacíos** | Validaciones frontend y backend para evitar inserciones corruptas. |

---

## 5. Sistema de Simulación y Debugging

Para garantizar la calidad, se incluyeron herramientas de simulación de fallos:
- **`simulateNetworkFailure`**: Fuerza una desconexión para probar la resiliencia de la UI.
- **`simulateRaceCondition`**: Lanza actualizaciones simultáneas para verificar que la DB bloquea las inconsistencias.
- **`debugLogger`**: Un sistema de trazabilidad de colores que separa logs de Auth, Rooms y Matches en la consola.

---

## 🚀 5. Ejecución

1.  **Variables de Entorno**:
    Crea un archivo `.env` con tus credenciales de Supabase:
    ```env
    VITE_SUPABASE_URL=tu_url
    VITE_SUPABASE_ANON_KEY=tu_key
    ```
2.  **Instalación**:
    ```bash
    npm install
    ```
3.  **Desarrollo**:
    ```bash
    npm run dev
    ```

---

**Desarrollado con ❤️ por el equipo de Antigravity Sprint 2.**
