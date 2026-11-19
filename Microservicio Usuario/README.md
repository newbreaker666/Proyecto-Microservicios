# 🏋️ SmartGym — Microservicio de Usuarios, Identidad y Salud Deportiva (MS-Usuarios)

> **Proyecto:** Sistema de Microservicios para Gimnasio Inteligente (SmartGym)  
> **Alumno:** Wiley Fabian Guerra Rios  
> **Curso:** Taller de Desarrollo — Dr. León Esteban Flores Saldaña  
> **Universidad:** Universidad Nacional de Ucayali (UNU)  
> **Ubicación:** `C:\Users\CURACAO\Desktop\MODULO USUARIO\Microservicio nuevo\`

---

## 1. 🎯 Justificación Técnica del Microservicio

Frente a la crítica de un monolito distribuido donde los servicios solo hacen CRUD básico, **MS-Usuarios** implementa el patrón de microservicios con un propósito claro y de alto impacto:

| Problema del Enfoque Tradicional | Solución Implementada en MS-Usuarios |
|---|---|
| Clientes hacen cola física en el mostrador del gimnasio para registrarse en papel. | **Auto-Servicio Digital (Digital Onboarding):** El cliente se registra desde su celular o PC en segundos. |
| El registro manual no valida condición médica ni cálculos calóricos. | **Perfil Biométrico & Salud:** Cálculo automático de IMC, TMB (Harris-Benedict), TDEE y cuestionario médico PAR-Q con alertas de riesgo. |
| Si el sistema de facturación o pagos se cae, se bloquea el registro. | **Aislamiento de Fallos:** MS-Usuarios es autónomo con su propia base de datos (`BBDD_SmartGym_Usuarios`). Si pagos se cae, el registro sigue 100% operativo. |
| Un solo servidor colapsa cuando se lanza una promoción o campaña publicitaria. | **Alta Concurrencia:** Probado y validado para procesar decenas de registros masivos simultáneos sin colisiones de datos ni bloqueos. |
| Dependencia de carnets físicos o pulseras plásticas costosas. | **Carnet Virtual & QR Dinámico:** Credencial digital en pantalla para validación instantánea en el torniquete/acceso. |

---

## 2. 🗄️ Arquitectura y Base de Datos (Database-per-Service)

**Base de datos independiente:** `BBDD_SmartGym_Usuarios` en Microsoft SQL Server.  
**11 Tablas Especializadas:**

```
├── Roles                       (ADMIN, ENTRENADOR, CLIENTE)
├── Usuarios                    (Identidad, credenciales con bcrypt, soft-delete)
├── Clientes                    (DNI, biometría, IMC, TMB, TDEE, número de socio SMART-2026-XXXX)
├── Personal                    (Entrenadores, especialidad, contratación)
├── HistorialMediciones         (Seguimiento longitudinal de peso, talla, IMC, % grasa)
├── ObservacionesEntrenador     (Notas técnicas, alertas, cambios de objetivo sugeridos)
├── FichaMedicaPARQ             (7 preguntas de salud cardiovascular/ósea, nivel de riesgo)
├── MetasPersonales             (Objetivos personales con porcentaje de avance automático)
├── PreferenciasDeportivas      (Disciplinas de interés, horarios preferidos, frecuencia)
├── SesionesActivas             (Gestión de dispositivos y refresh tokens)
└── Auditoria                   (Trazabilidad de cada acción con IP, usuario y timestamp)
```

---

## 3. 👥 Cuentas de Acceso Preconfiguradas (Datos de Prueba)

| Rol | Correo Electrónico | Contraseña | Descripción |
|---|---|---|---|
| **ADMIN** | `admin@smartgym.pe` | `Admin123!` | Carlos Mendoza — Administrador total del microservicio |
| **ENTRENADOR** | `entrenador1@smartgym.pe` | `Trainer123!` | María García — Especialista en Musculación y Funcional |
| **ENTRENADOR** | `entrenador2@smartgym.pe` | `Trainer123!` | Pedro Sánchez — Especialista en Cardio, HIIT y CrossFit |
| **CLIENTE (Socio 1)** | `cliente1@smartgym.pe` | `Cliente123!` | Ana López — 67 kg, meta: `PERDER_PESO` (Progreso de 4 meses) |
| **CLIENTE (Socio 2)** | `cliente2@smartgym.pe` | `Cliente123!` | Juan Torres — 88 kg, meta: `GANAR_MUSCULO` (Hipertrofia) |
| **CLIENTE (Socio 3)** | `cliente3@smartgym.pe` | `Cliente123!` | Rosa Díaz — 55 kg, meta: `SALUD_GENERAL` |
| **CLIENTE (Socio 4)** | `cliente4@smartgym.pe` | `Cliente123!` | Luis Ramírez — 89 kg, riesgo PAR-Q: `PRECAUCION` |
| **CLIENTE (Socio 5)** | `cliente5@smartgym.pe` | `Cliente123!` | Sofía Vargas — 61 kg, meta: `GANAR_FUERZA` (Powerlifting) |

---

## 4. 🔌 Endpoints REST Principales (25+ Rutas)

### Autenticación (`/api/v1/auth`)
* `POST /api/v1/auth/register` — Auto-registro público con emisión de JWT.
* `POST /api/v1/auth/login` — Inicio de sesión con validación de credenciales.
* `POST /api/v1/auth/refresh` — Renovación de token de sesión.
* `POST /api/v1/auth/change-password` — Cambio seguro de contraseña.
* `GET /api/v1/auth/validate` — Verificación de token.

### Onboarding Digital (`/api/v1/onboarding`)
* `POST /api/v1/onboarding/perfil-biometrico` — Registro biométrico con cálculo de IMC, TMB, TDEE y asignación de número de socio.
* `POST /api/v1/onboarding/ficha-medica` — Cuestionario PAR-Q con clasificación de riesgo.
* `POST /api/v1/onboarding/preferencias` — Registro de disciplinas y horarios habituales.
* `GET /api/v1/onboarding/status` — Consulta del progreso del onboarding.

### Portal Socio (`/api/v1/clientes`)
* `GET /api/v1/clientes/mi-perfil` — Expediente completo con macronutrientes sugeridos.
* `GET /api/v1/clientes/mi-progreso` — Línea de tiempo de mediciones históricas.
* `GET /api/v1/clientes/mi-carnet` — Carnet virtual con payload para código QR.
* `GET /api/v1/clientes/mis-metas` — Metas activas con porcentaje de avance.
* `POST /api/v1/clientes/mis-metas` — Crear nueva meta personal.
* `POST /api/v1/clientes/calculadora-tdee` — Simulador interactivo de calorías y macros.
* `GET /api/v1/clientes/mis-sesiones` — Dispositivos y sesiones activas.

### Panel del Entrenador (`/api/v1/entrenador`)
* `GET /api/v1/entrenador/clientes` — Directorio de socios con filtros y paginación.
* `GET /api/v1/entrenador/clientes/:id` — Ficha técnica y médica de un cliente.
* `POST /api/v1/entrenador/clientes/:id/mediciones` — Registro de nuevo pesaje y cálculo de evolución.
* `POST /api/v1/entrenador/clientes/:id/observaciones` — Nota técnica del entrenador.
* `PUT /api/v1/entrenador/clientes/:id/objetivo` — Cambio de objetivo deportivo recomendado.

### Inter-Servicio con MS-Membresías y MS-Pagos (`/api/v1/interno`)
* `GET /api/v1/interno/usuarios/:id/perfil` (Requiere `X-API-Key`) — Consumido por **MS-Membresías** para alimentar su algoritmo de recomendación de planes.
* `GET /api/v1/interno/usuarios/:id/existe` (Requiere `X-API-Key`) — Consumido por **MS-Pagos** para verificar identidad y vigencia antes del cobro.
* `GET /health` — Health check para monitoreo y balanceadores.

---

## 5. 🚀 Cómo Ejecutar el Sistema

### Opción A: Ejecución Local en 1 Clic (Recomendada para la laptop)
Doble clic en:
```
INICIAR_LOCAL.bat
```
* Inicia la base de datos, levanta el Backend en el puerto **3001** y el Frontend en el puerto **4200**.
* Abre automáticamente el navegador en: `http://localhost:4200`.

Para detener todo en 1 clic:
```
DETENER_LOCAL.bat
```

### Opción B: Ejecución en Docker
Doble clic en:
```
INICIAR_DOCKER.bat
```
*(Requiere Docker Desktop activo)*

Para detener Docker:
```
DETENER_DOCKER.bat
```

---

## 6. 🧪 Pruebas Automatizadas y de Concurrencia

### Ejecutar Suite Completa de Tests (100% Pasadas)
```powershell
cd Back
npm test
```

### Ejecutar Test de Alta Concurrencia (50 Clientes Simultáneos)
Para demostrar al docente cómo el sistema soporta alta demanda sin colisiones:
```powershell
cd Back
node tests/test_concurrencia.js
```
*También disponible mediante el botón interactivo **"Ejecutar Prueba Concurrente"** en la pestaña de Administración de la interfaz web.*
