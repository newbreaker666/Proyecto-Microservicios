import { Component, OnInit, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from './services/api.service';
import { AuthService, UserSession } from './services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  api = inject(ApiService);
  auth = inject(AuthService);

  // Navegación
  tabActiva: 'onboarding' | 'socio' | 'entrenador' | 'admin' | 'auth' = 'auth';

  // Estado del microservicio
  msStatus: 'UP' | 'DOWN' | 'CHECKING' = 'CHECKING';
  msInfo: any = null;

  // Autenticación form
  modoAuth: 'login' | 'register' = 'login';
  formLogin = { email: 'cliente1@smartgym.pe', password: 'Cliente123!' };
  formRegister = { email: '', password: '', nombre: '', apellido: '' };
  mensajeAuth = '';
  cargandoAuth = false;

  // Onboarding Wizard
  pasoOnboarding = 1;
  formBio = {
    dni: '',
    fecha_nacimiento: '1998-05-15',
    sexo: 'M',
    telefono: '',
    direccion: '',
    contacto_emergencia: '',
    telefono_emergencia: '',
    peso: 75.0,
    talla: 175.0,
    objetivo_fitness: 'GANAR_MUSCULO',
    nivel_experiencia: 'PRINCIPIANTE',
    factor_actividad: 'MODERADO'
  };
  formPARQ = {
    p1: false, p2: false, p3: false, p4: false, p5: false, p6: false, p7: false,
    tipo_sangre: 'O+', alergias: '', lesiones_previas: '', notas_medicas: ''
  };
  formPref = {
    disciplinas: ['PESAS', 'CARDIO'],
    horario_preferido: 'TARDE',
    dias_semana: ['LUN', 'MIE', 'VIE'],
    frecuencia_semanal: 3,
    experiencia_previa: ''
  };
  onboardingResultado: any = null;
  cargandoOnboarding = false;

  // Portal Socio
  miPerfilData: any = null;
  miProgresoList: any[] = [];
  misMetasList: any[] = [];
  miCarnetData: any = null;
  nuevaMeta = {
    tipo_meta: 'PESO_OBJETIVO',
    descripcion: 'Llegar a 65 kg para diciembre',
    valor_actual: 70,
    valor_objetivo: 65,
    unidad: 'kg',
    fecha_limite: '2026-12-31'
  };
  cargandoSocio = false;

  // Modal Editar Perfil Socio
  modalEditarPerfil = false;
  formEditarPerfil = {
    nombre: '',
    apellido: '',
    email: '',
    telefono: '',
    direccion: '',
    contacto_emergencia: '',
    telefono_emergencia: ''
  };

  // Modal Cambiar Contraseña (Seguridad & Privacidad)
  modalCambiarPassword = false;
  formPassword = {
    passwordActual: '',
    passwordNueva: '',
    confirmarPassword: ''
  };
  mensajePassword = '';
  exitoPassword = false;
  cargandoPassword = false;

  // Conexión & Handoff hacia MS-Membresías
  modalMembresiasHandoff = false;
  urlMsMembresias = 'http://localhost:4300';
  payloadHandoffMembresias: any = null;
  copiadoPayload = false;
  copiadoEndpoints = false;
  copiadoRetorno = false;

  // Panel Entrenador
  clientesList: any[] = [];
  clienteSeleccionado: any = null;
  filtroBusqueda = '';
  filtroObjetivo = '';
  formNuevaMedicion = { peso: 70, talla: 170, porcentaje_grasa: 20, notas: '' };
  formNuevaObs = { tipo: 'PROGRESO', contenido: '', objetivo_nuevo: '' };
  cargandoEntrenador = false;

  // Admin
  subTabAdmin: 'staff' | 'clientes' | 'auditoria' = 'staff';
  usuariosList: any[] = [];
  auditoriaList: any[] = [];
  metricasAdmin: any = null;
  formStaff = { email: '', password: 'StaffPassword2026!', nombre: '', apellido: '', rol: 'ENTRENADOR', dni: '', especialidad: 'Musculación', telefono: '' };
  cargandoAdmin = false;

  // Modales de Edición Admin
  modalEditarStaff = false;
  staffSeleccionado: any = null;
  modalEditarCliente = false;
  clienteAdminSeleccionado: any = null;

  // Test de concurrencia UI
  resultadoConcurrencia: any = null;
  ejecutandoConcurrencia = false;

  ngOnInit(): void {
    this.verificarSalud();
    if (this.auth.estaAutenticado()) {
      this.cargarDatosSegunRol();
    }
    // Si regresa desde otro microservicio con parámetros en la URL, limpiar la barra manteniendo la sesión
    if (window.location.search) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }

  /**
   * Al regresar a esta pestaña (por ejemplo después de pagar en MS-Membresías),
   * recarga silenciosamente el perfil para reflejar el nuevo estado de membresía sin perder la sesión.
   */
  @HostListener('window:focus')
  alVolverAPestana(): void {
    if (this.auth.estaAutenticado() && this.tabActiva === 'socio') {
      this.api.getMiPerfil().subscribe({
        next: (res) => {
          if (res?.data) {
            this.miPerfilData = res.data;
          }
        }
      });
    }
  }

  verificarSalud(): void {
    this.api.checkHealth().subscribe({
      next: (res) => {
        this.msStatus = res.status;
        this.msInfo = res;
      },
      error: () => {
        this.msStatus = 'DOWN';
      }
    });
  }

  cambiarTab(tab: any): void {
    const rol = this.auth.obtenerRol();

    // Protección estricta de navegación RBAC: cada rol solo accede a su vista
    if (rol === 'ADMIN' && tab !== 'admin') return;
    if (rol === 'ENTRENADOR' && tab !== 'entrenador') return;
    if (rol === 'CLIENTE' && tab !== 'socio' && tab !== 'onboarding') return;
    if (rol === 'INVITADO' && tab !== 'onboarding' && tab !== 'auth') return;

    this.tabActiva = tab;
    if (tab === 'socio' && this.auth.estaAutenticado()) {
      this.cargarPortalSocio();
    } else if (tab === 'entrenador') {
      this.cargarPanelEntrenador();
    } else if (tab === 'admin') {
      this.cargarPanelAdmin();
    }
  }

  // Cálculos en tiempo real en la UI
  get imcCalculado(): number {
    const p = this.formBio.peso;
    const t = this.formBio.talla / 100;
    if (p > 0 && t > 0) {
      return parseFloat((p / (t * t)).toFixed(2));
    }
    return 0;
  }

  get clasificacionIMCCalculada(): string {
    const imc = this.imcCalculado;
    if (imc < 18.5) return 'Bajo peso';
    if (imc < 25) return 'Peso Normal';
    if (imc < 30) return 'Sobrepeso';
    if (imc < 35) return 'Obesidad Grado I';
    return 'Obesidad Grado II+';
  }

  get tmbEstimado(): number {
    const p = this.formBio.peso;
    const t = this.formBio.talla;
    const s = this.formBio.sexo;
    if (p > 0 && t > 0) {
      if (s === 'M') {
        return Math.round(88.362 + (13.397 * p) + (4.799 * t) - (5.677 * 28));
      } else {
        return Math.round(447.593 + (9.247 * p) + (3.098 * t) - (4.330 * 28));
      }
    }
    return 0;
  }

  // Auth Methods
  ejecutarLogin(): void {
    this.cargandoAuth = true;
    this.mensajeAuth = '';
    this.api.login(this.formLogin).subscribe({
      next: (res) => {
        this.cargandoAuth = false;
        this.auth.guardarSesion(res.data.token, res.data.usuario);
        this.cargarDatosSegunRol();
      },
      error: (err) => {
        this.cargandoAuth = false;
        this.mensajeAuth = err.error?.message || 'Error al iniciar sesión';
      }
    });
  }

  ejecutarRegistro(): void {
    this.cargandoAuth = true;
    this.mensajeAuth = '';
    this.api.register(this.formRegister).subscribe({
      next: (res) => {
        this.cargandoAuth = false;
        this.auth.guardarSesion(res.data.token, res.data.usuario);
        this.tabActiva = 'onboarding';
        this.pasoOnboarding = 1;
      },
      error: (err) => {
        this.cargandoAuth = false;
        this.mensajeAuth = err.error?.message || 'Error al registrarse';
      }
    });
  }

  cerrarSesion(): void {
    this.auth.logout();
    this.tabActiva = 'auth';
    this.modoAuth = 'login';
  }

  loginRapido(email: string, pass: string): void {
    this.formLogin.email = email;
    this.formLogin.password = pass;
    this.ejecutarLogin();
  }

  cargarDatosSegunRol(): void {
    const rol = this.auth.obtenerRol();
    if (rol === 'CLIENTE') {
      const u = this.auth.usuario();
      if (!u?.onboarding_completado) {
        this.tabActiva = 'onboarding';
      } else {
        this.tabActiva = 'socio';
        this.cargarPortalSocio();
      }
    } else if (rol === 'ENTRENADOR') {
      this.tabActiva = 'entrenador';
      this.cargarPanelEntrenador();
    } else if (rol === 'ADMIN') {
      this.tabActiva = 'admin';
      this.cargarPanelAdmin();
    } else {
      this.tabActiva = 'auth';
    }
  }

  // Onboarding Wizard Actions
  avanzarPaso1(): void {
    if (!this.auth.estaAutenticado()) {
      alert('Por favor inicie sesión o regístrese primero');
      this.tabActiva = 'auth';
      return;
    }
    this.cargandoOnboarding = true;
    this.api.completarPerfilBiometrico(this.formBio).subscribe({
      next: (res) => {
        this.cargandoOnboarding = false;
        this.onboardingResultado = res.data;
        this.auth.actualizarUsuario({ cliente_id: res.data.cliente_id, numero_socio: res.data.numero_socio });
        this.pasoOnboarding = 2;
      },
      error: (err) => {
        this.cargandoOnboarding = false;
        if (err.status === 409) {
          // Ya lo tiene registrado
          this.pasoOnboarding = 2;
        } else {
          alert(err.error?.message || 'Error al guardar perfil biométrico');
        }
      }
    });
  }

  avanzarPaso2(): void {
    this.cargandoOnboarding = true;
    const body = {
      p1_cardiopatia: this.formPARQ.p1,
      p2_dolor_pecho_actividad: this.formPARQ.p2,
      p3_dolor_pecho_reposo: this.formPARQ.p3,
      p4_mareos: this.formPARQ.p4,
      p5_problemas_oseos: this.formPARQ.p5,
      p6_medicacion: this.formPARQ.p6,
      p7_otra_razon: this.formPARQ.p7,
      tipo_sangre: this.formPARQ.tipo_sangre,
      alergias: this.formPARQ.alergias,
      lesiones_previas: this.formPARQ.lesiones_previas
    };
    this.api.completarFichaPARQ(body).subscribe({
      next: () => {
        this.cargandoOnboarding = false;
        this.pasoOnboarding = 3;
      },
      error: (err) => {
        this.cargandoOnboarding = false;
        alert(err.error?.message || 'Error al guardar ficha médica');
      }
    });
  }

  finalizarOnboarding(): void {
    this.cargandoOnboarding = true;
    this.api.completarPreferencias(this.formPref).subscribe({
      next: () => {
        this.cargandoOnboarding = false;
        this.auth.actualizarUsuario({ onboarding_completado: true });
        this.pasoOnboarding = 4; // Resumen final y pase virtual
      },
      error: (err) => {
        this.cargandoOnboarding = false;
        alert(err.error?.message || 'Error al guardar preferencias');
      }
    });
  }

  // Portal Socio
  cargarPortalSocio(): void {
    this.cargandoSocio = true;
    this.api.getMiPerfil().subscribe({
      next: (res) => {
        this.miPerfilData = res.data;
        if (res.data?.peso_actual && this.nuevaMeta.tipo_meta === 'PESO_OBJETIVO') {
          this.nuevaMeta.valor_actual = res.data.peso_actual;
        }
        this.cargandoSocio = false;
        this.prepararPayloadMembresias(true);
      },
      error: () => (this.cargandoSocio = false)
    });
    this.api.getMiProgreso().subscribe({
      next: (res) => (this.miProgresoList = res.data || [])
    });
    this.api.getMisMetas().subscribe({
      next: (res) => (this.misMetasList = res.data || [])
    });
    this.api.getMiCarnet().subscribe({
      next: (res) => (this.miCarnetData = res.data)
    });
  }

  cambiarTipoMeta(tipo: string): void {
    this.nuevaMeta.tipo_meta = tipo;
    if (tipo === 'PESO_OBJETIVO') {
      this.nuevaMeta.unidad = 'kg';
      this.nuevaMeta.valor_actual = this.miPerfilData?.peso_actual || 75;
      this.nuevaMeta.valor_objetivo = Math.round(this.nuevaMeta.valor_actual - 5);
      this.nuevaMeta.descripcion = `Llegar a ${this.nuevaMeta.valor_objetivo} kg`;
    } else if (tipo === 'PERSONALIZADA') {
      this.nuevaMeta.unidad = 'reps';
      this.nuevaMeta.valor_actual = 0;
      this.nuevaMeta.valor_objetivo = 15;
      this.nuevaMeta.descripcion = 'Hacer 15 flexiones estrictas';
    } else if (tipo === 'ASISTENCIA_SEMANAL') {
      this.nuevaMeta.unidad = 'días/sem';
      this.nuevaMeta.valor_actual = 1;
      this.nuevaMeta.valor_objetivo = 4;
      this.nuevaMeta.descripcion = 'Asistir 4 días por semana';
    } else if (tipo === 'PORCENTAJE_GRASA') {
      this.nuevaMeta.unidad = '%';
      this.nuevaMeta.valor_actual = 24;
      this.nuevaMeta.valor_objetivo = 18;
      this.nuevaMeta.descripcion = 'Reducir porcentaje graso a 18%';
    }
  }

  guardarMeta(): void {
    if (!this.nuevaMeta.descripcion) return;
    const payload = {
      ...this.nuevaMeta,
      valor_inicial: this.nuevaMeta.valor_actual
    };
    this.api.crearMeta(payload).subscribe({
      next: () => {
        this.cargarPortalSocio();
        this.nuevaMeta.descripcion = '';
      },
      error: (err) => alert(err.error?.message || 'Error al crear meta')
    });
  }

  actualizarAvanceMeta(m: any, incremento: number): void {
    if (m.porcentaje_avance >= 100 || m.estado === 'COMPLETADA') {
      alert('Esta meta ya ha sido cumplida y forma parte de tus logros alcanzados; ya no puede ser modificada.');
      return;
    }
    const nuevoVal = Math.max(0, parseFloat((m.valor_actual + incremento).toFixed(1)));
    this.api.actualizarMeta(m.meta_id, { valor_actual: nuevoVal }).subscribe({
      next: () => this.cargarPortalSocio(),
      error: (err) => alert(err.error?.message || 'Error al actualizar meta')
    });
  }

  eliminarMeta(metaId: number): void {
    const meta = this.misMetasList.find(x => x.meta_id === metaId);
    if (meta && (meta.porcentaje_avance >= 100 || meta.estado === 'COMPLETADA')) {
      alert('Esta meta ya ha sido cumplida y forma parte de tus logros alcanzados; no puede ser eliminada.');
      return;
    }
    if (!confirm('¿Estás seguro de que deseas eliminar esta meta personal?')) return;
    this.api.eliminarMeta(metaId).subscribe({
      next: () => {
        this.cargarPortalSocio();
      },
      error: (err) => alert(err.error?.message || 'Error al eliminar meta')
    });
  }

  abrirModalPassword(): void {
    this.formPassword = {
      passwordActual: '',
      passwordNueva: '',
      confirmarPassword: ''
    };
    this.mensajePassword = '';
    this.exitoPassword = false;
    this.modalCambiarPassword = true;
  }

  ejecutarCambioPassword(): void {
    if (!this.formPassword.passwordActual || !this.formPassword.passwordNueva) {
      this.mensajePassword = 'Debe ingresar su contraseña actual y la nueva contraseña';
      this.exitoPassword = false;
      return;
    }
    if (this.formPassword.passwordNueva.length < 8) {
      this.mensajePassword = 'La nueva contraseña debe tener un mínimo de 8 caracteres';
      this.exitoPassword = false;
      return;
    }
    if (this.formPassword.passwordNueva !== this.formPassword.confirmarPassword) {
      this.mensajePassword = 'Las contraseñas no coinciden. Verifique nuevamente';
      this.exitoPassword = false;
      return;
    }

    this.cargandoPassword = true;
    this.mensajePassword = '';
    this.api.changePassword({
      passwordActual: this.formPassword.passwordActual,
      passwordNueva: this.formPassword.passwordNueva
    }).subscribe({
      next: () => {
        this.cargandoPassword = false;
        this.exitoPassword = true;
        this.mensajePassword = '¡Contraseña actualizada con éxito! Tu cuenta está protegida.';
        setTimeout(() => {
          this.modalCambiarPassword = false;
        }, 1800);
      },
      error: (err) => {
        this.cargandoPassword = false;
        this.exitoPassword = false;
        this.mensajePassword = err.error?.message || 'Error al actualizar contraseña. Verifique su contraseña actual.';
      }
    });
  }

  abrirModalEditarPerfil(): void {
    if (!this.miPerfilData) return;
    this.formEditarPerfil = {
      nombre: this.miPerfilData.nombre || '',
      apellido: this.miPerfilData.apellido || '',
      email: this.miPerfilData.email || '',
      telefono: this.miPerfilData.telefono || '',
      direccion: this.miPerfilData.direccion || '',
      contacto_emergencia: this.miPerfilData.contacto_emergencia || '',
      telefono_emergencia: this.miPerfilData.telefono_emergencia || ''
    };
    this.modalEditarPerfil = true;
  }

  guardarEdicionPerfil(): void {
    this.api.updateMiPerfil(this.formEditarPerfil).subscribe({
      next: () => {
        alert('Datos personales actualizados correctamente');
        this.modalEditarPerfil = false;
        this.auth.actualizarUsuario({
          nombre: this.formEditarPerfil.nombre,
          apellido: this.formEditarPerfil.apellido,
          email: this.formEditarPerfil.email
        });
        this.cargarPortalSocio();
      },
      error: (err) => alert(err.error?.message || 'Error al actualizar datos')
    });
  }

  // ============================================================
  // Handoff e Integración con MS-Membresías
  // ============================================================
  get payloadJsonFormateado(): string {
    return this.payloadHandoffMembresias
      ? JSON.stringify(this.payloadHandoffMembresias, null, 2)
      : '';
  }

  get originActual(): string {
    return window.location.origin;
  }

  prepararPayloadMembresias(soloLogSilencioso = false): any {
    if (!this.miPerfilData || !this.miPerfilData.cliente_id) return null;

    const p = this.miPerfilData;
    const host = window.location.origin;
    const disciplinasArr = p.disciplinas
      ? (Array.isArray(p.disciplinas) ? p.disciplinas : String(p.disciplinas).split(',').map((s: string) => s.trim()))
      : ['PESAS'];
    const diasArr = p.dias_semana
      ? (Array.isArray(p.dias_semana) ? p.dias_semana : String(p.dias_semana).split(',').map((s: string) => s.trim()))
      : ['LUN', 'MIE', 'VIE'];

    const payload = {
      evento: 'SOLICITUD_PLANES_MEMBRESIA',
      origen_microservicio: 'MS-Usuarios',
      timestamp: new Date().toISOString(),
      socio: {
        usuario_id: p.usuario_id,
        cliente_id: p.cliente_id,
        numero_socio: p.numero_socio,
        nombre_completo: `${p.nombre} ${p.apellido}`,
        email: p.email,
        dni: p.dni,
        telefono: p.telefono || null,
        sexo: p.sexo,
        edad: p.edad,
        estado_cuenta: p.activo ? 'ACTIVO' : 'SUSPENDIDO',
        estado_membresia_actual: p.estado_membresia || 'PENDIENTE'
      },
      perfil_biometrico_y_preferencias: {
        objetivo_fitness: p.objetivo_fitness,
        nivel_experiencia: p.nivel_experiencia,
        factor_actividad: p.factor_actividad,
        peso_kg: p.peso_actual,
        talla_cm: p.talla_actual,
        imc: p.imc_actual,
        clasificacion_imc: p.clasificacion_imc,
        tmb_kcal: p.tmb_actual,
        tdee_kcal: p.tdee_actual,
        disciplinas: disciplinasArr,
        horario_preferido: p.horario_preferido || 'FLEXIBLE',
        dias_semana: diasArr,
        frecuencia_semanal: p.frecuencia_semanal || 3,
        nivel_riesgo_salud: p.nivel_riesgo || 'APTO',
        alergias: p.alergias || 'NINGUNA',
        lesiones_previas: p.lesiones_previas || 'NINGUNA'
      },
      endpoints_ms_usuarios: {
        base_url: `${host}/api/v1`,
        return_url_mantener_sesion: host,
        consultar_perfil_backend: `GET ${host}/api/v1/interno/usuarios/${p.numero_socio}/perfil`,
        activar_o_suspender_membresia: `PUT ${host}/api/v1/interno/clientes/${p.cliente_id}/membresia`,
        header_autenticacion: 'X-API-Key: smartgym_api_key_2026_interservice'
      }
    };

    this.payloadHandoffMembresias = payload;

    // Imprimir en la consola del navegador (F12) con formato claro para inspección y envío al compañero
    console.group(
      `%c🚀 [MS-Usuarios → MS-Membresías] Datos del Socio Listos (${p.numero_socio})`,
      'background: #ea580c; color: #ffffff; font-size: 12px; font-weight: bold; padding: 3px 8px; border-radius: 4px;'
    );
    console.log('%c👤 Socio autenticado:', 'color: #38bdf8; font-weight: bold;', `${payload.socio.nombre_completo} (${payload.socio.numero_socio}) | Membresía: ${payload.socio.estado_membresia_actual}`);
    console.log('%c🔁 Return URL (para volver sin perder sesión JWT):', 'color: #34d399; font-weight: bold;', host);
    console.log('%c📦 Objeto completo (puedes hacer clic derecho -> Copy object):', 'color: #facc15; font-weight: bold;', payload);
    console.log('%c📋 JSON formateado para enviar a tu compañero:', 'color: #a78bfa; font-weight: bold;');
    console.log(JSON.stringify(payload, null, 2));
    console.log('%c📡 Endpoints necesarios para MS-Membresías:', 'color: #34d399; font-weight: bold;');
    console.table([
      {
        Accion: '1. Obtener Perfil y Preferencias',
        Metodo: 'GET',
        Endpoint: `${host}/api/v1/interno/usuarios/${p.numero_socio}/perfil`,
        Header: 'X-API-Key: smartgym_api_key_2026_interservice'
      },
      {
        Accion: '2. Activar/Suspender Membresía',
        Metodo: 'PUT',
        Endpoint: `${host}/api/v1/interno/clientes/${p.cliente_id}/membresia`,
        Header: 'X-API-Key: smartgym_api_key_2026_interservice'
      }
    ]);
    console.groupEnd();

    if (!soloLogSilencioso) {
      this.modalMembresiasHandoff = true;
    }
    return payload;
  }

  conectarConMsMembresias(): void {
    this.prepararPayloadMembresias(false);
  }

  abrirMicroservicioMembresias(): void {
    const payload = this.payloadHandoffMembresias || this.prepararPayloadMembresias(true);
    if (!payload) return;

    // 1. Guardar en localStorage como respaldo por si comparten localhost/origen
    localStorage.setItem('smartgym_handoff_membresias', JSON.stringify(payload));

    // 2. Construir URL con Query Params llevando los identificadores y datos clave
    const base = this.urlMsMembresias.trim().replace(/\/+$/, '');
    const params = new URLSearchParams({
      usuario_id: String(payload.socio.usuario_id),
      cliente_id: String(payload.socio.cliente_id),
      numero_socio: String(payload.socio.numero_socio),
      nombre: payload.socio.nombre_completo,
      email: payload.socio.email,
      objetivo: payload.perfil_biometrico_y_preferencias.objetivo_fitness || 'SALUD_GENERAL',
      nivel: payload.perfil_biometrico_y_preferencias.nivel_experiencia || 'PRINCIPIANTE',
      disciplinas: payload.perfil_biometrico_y_preferencias.disciplinas.join(','),
      horario: payload.perfil_biometrico_y_preferencias.horario_preferido || 'FLEXIBLE',
      estado_membresia: payload.socio.estado_membresia_actual,
      api_usuarios: window.location.origin,
      return_url: window.location.origin,
      datos_json: btoa(unescape(encodeURIComponent(JSON.stringify(payload))))
    });

    const urlFinal = `${base}/?${params.toString()}`;
    console.log('%c🔗 Redirigiendo a MS-Membresías:', 'color: #fb923c; font-weight: bold;', urlFinal);

    window.open(urlFinal, '_blank');
  }

  get codigoRetornoEjemplo(): string {
    const host = this.originActual;
    return `# Python (Flask / FastAPI):
return_url = request.args.get('return_url', '${host}')
api_usuarios = request.args.get('api_usuarios', '${host}')
# Botón HTML: <a href="{{ return_url }}">Volver a SmartGym</a>

# Python (Streamlit):
return_url = st.query_params.get("return_url", "${host}")
st.link_button("🔙 Volver a SmartGym", return_url)

// JavaScript / Angular / React (o cerrar pestaña):
const p = new URLSearchParams(window.location.search);
window.location.href = p.get('return_url') || '${host}';`;
  }

  copiarParaCompanero(tipo: 'payload' | 'endpoints' | 'retorno'): void {
    const payload = this.payloadHandoffMembresias;
    if (!payload) return;
    const host = window.location.origin;

    let texto = '';
    if (tipo === 'payload') {
      texto = JSON.stringify(payload, null, 2);
      this.copiadoPayload = true;
      setTimeout(() => (this.copiadoPayload = false), 2500);
    } else if (tipo === 'retorno') {
      texto = this.codigoRetornoEjemplo;
      this.copiadoRetorno = true;
      setTimeout(() => (this.copiadoRetorno = false), 2500);
    } else {
      texto =
        `=== INTEGRACIÓN MS-USUARIOS <-> MS-MEMBRESÍAS ===\n` +
        `URL Base (Backend MS-Usuarios): ${host}/api/v1\n` +
        `Return URL (Volver sin perder sesión): ${host}\n` +
        `Header obligatorio en todas las peticiones internas:\n` +
        `  X-API-Key: smartgym_api_key_2026_interservice\n` +
        `  ngrok-skip-browser-warning: true\n\n` +
        `1) CONSULTAR PERFIL COMPLETO Y PREFERENCIAS DEL SOCIO (GET):\n` +
        `   ${host}/api/v1/interno/usuarios/${payload.socio.numero_socio}/perfil\n` +
        `   (Nota: :id acepta numero_socio, cliente_id o usuario_id UUID)\n\n` +
        `2) ACTIVAR, RENOVAR O SUSPENDER MEMBRESÍA DEL SOCIO (PUT):\n` +
        `   ${host}/api/v1/interno/clientes/${payload.socio.cliente_id}/membresia\n` +
        `   Body JSON:\n` +
        `   {\n` +
        `     "estado_membresia": "ACTIVA",\n` +
        `     "plan_nombre": "Plan Black VIP",\n` +
        `     "motivo": "Pago confirmado en MS-Membresías"\n` +
        `   }\n` +
        `   Estados válidos: ACTIVA | PENDIENTE | VENCIDA | CANCELADA | CONGELADA | SUSPENDIDA\n\n` +
        `3) VOLVER A MS-USUARIOS SIN PERDER EL LOGUEO:\n` +
        `   Redirigir al parámetro "return_url" que llegó en la URL (${host}).\n` +
        `   El navegador conserva el JWT en localStorage y recarga la membresía automáticamente.`;
      this.copiadoEndpoints = true;
      setTimeout(() => (this.copiadoEndpoints = false), 2500);
    }

    if (navigator.clipboard) {
      navigator.clipboard.writeText(texto);
    }
  }

  // Panel Entrenador
  cargarPanelEntrenador(): void {
    this.cargandoEntrenador = true;
    this.api.getClientes(this.filtroBusqueda, this.filtroObjetivo).subscribe({
      next: (res) => {
        this.clientesList = res.data || [];
        this.cargandoEntrenador = false;
        if (this.clientesList.length > 0 && !this.clienteSeleccionado) {
          this.seleccionarCliente(this.clientesList[0]);
        }
      },
      error: () => (this.cargandoEntrenador = false)
    });
  }

  seleccionarCliente(c: any): void {
    this.api.getClienteDetalle(c.cliente_id).subscribe({
      next: (res) => {
        this.clienteSeleccionado = res.data;
        this.formNuevaMedicion.peso = res.data.cliente.peso_actual;
        this.formNuevaMedicion.talla = res.data.cliente.talla_actual;
        // Limpiar inputs al cambiar de socio
        this.formNuevaMedicion.notas = '';
        this.formNuevaObs.contenido = '';
        this.formNuevaObs.objetivo_nuevo = '';
      }
    });
  }

  guardarMedicionEntrenador(): void {
    if (!this.clienteSeleccionado) return;
    const cid = this.clienteSeleccionado.cliente.cliente_id;
    this.api.registrarMedicion(cid, this.formNuevaMedicion).subscribe({
      next: () => {
        alert('Medición registrada con éxito');
        this.formNuevaMedicion.notas = ''; // Limpiar caja
        this.seleccionarCliente(this.clienteSeleccionado.cliente);
        this.cargarPanelEntrenador();
      }
    });
  }

  guardarObservacionEntrenador(): void {
    if (!this.clienteSeleccionado || !this.formNuevaObs.contenido) return;
    const cid = this.clienteSeleccionado.cliente.cliente_id;
    this.api.agregarObservacion(cid, this.formNuevaObs).subscribe({
      next: () => {
        alert('Observación añadida');
        this.formNuevaObs.contenido = ''; // Limpiar caja
        this.seleccionarCliente(this.clienteSeleccionado.cliente);
      }
    });
  }

  // Panel Admin
  cargarPanelAdmin(): void {
    this.cargandoAdmin = true;
    this.api.getEstadisticas().subscribe({
      next: (res) => (this.metricasAdmin = res.data)
    });
    this.api.getUsuarios().subscribe({
      next: (res) => {
        this.usuariosList = res.data || [];
        this.cargandoAdmin = false;
      },
      error: () => (this.cargandoAdmin = false)
    });
    this.api.getAuditoria().subscribe({
      next: (res) => (this.auditoriaList = res.data || [])
    });
  }

  get listaStaff(): any[] {
    return this.usuariosList.filter(u => u.rol_nombre === 'ADMIN' || u.rol_nombre === 'ENTRENADOR');
  }

  get listaClientesAdmin(): any[] {
    return this.usuariosList.filter(u => u.rol_nombre === 'CLIENTE');
  }

  abrirModalEditarStaff(u: any): void {
    this.staffSeleccionado = {
      usuario_id: u.usuario_id,
      nombre: u.nombre,
      apellido: u.apellido,
      email: u.email,
      telefono: u.personal_telefono || '',
      especialidad: u.especialidad || 'Entrenamiento General',
      activo: !!u.activo,
      rol_nombre: u.rol_nombre
    };
    this.modalEditarStaff = true;
  }

  guardarEdicionStaff(): void {
    if (!this.staffSeleccionado) return;
    this.api.editarUsuario(this.staffSeleccionado.usuario_id, this.staffSeleccionado).subscribe({
      next: () => {
        alert('Personal actualizado correctamente');
        this.modalEditarStaff = false;
        this.cargarPanelAdmin();
      },
      error: (err) => alert(err.error?.message || 'Error al actualizar personal')
    });
  }

  abrirModalEditarCliente(c: any): void {
    this.clienteAdminSeleccionado = {
      usuario_id: c.usuario_id,
      numero_socio: c.numero_socio,
      nombre: c.nombre,
      apellido: c.apellido,
      email: c.email,
      dni: c.dni,
      telefono: c.cliente_telefono || '',
      activo: !!c.activo,
      estado_membresia: c.estado_membresia || 'PENDIENTE'
    };
    this.modalEditarCliente = true;
  }

  guardarEdicionClienteAdmin(): void {
    if (!this.clienteAdminSeleccionado) return;
    this.api.editarUsuario(this.clienteAdminSeleccionado.usuario_id, this.clienteAdminSeleccionado).subscribe({
      next: () => {
        alert('Datos administrativos del socio actualizados');
        this.modalEditarCliente = false;
        this.cargarPanelAdmin();
      },
      error: (err) => alert(err.error?.message || 'Error al actualizar socio')
    });
  }

  guardarStaff(): void {
    if (!this.formStaff.email || !this.formStaff.nombre) return;
    this.api.crearStaff(this.formStaff).subscribe({
      next: () => {
        alert('Usuario de staff creado exitosamente');
        this.formStaff.email = '';
        this.formStaff.nombre = '';
        this.formStaff.apellido = '';
        this.cargarPanelAdmin();
      },
      error: (err) => alert(err.error?.message || 'Error al crear staff')
    });
  }

  // Disparar test de concurrencia desde la web
  simularConcurrencia(): void {
    this.ejecutandoConcurrencia = true;
    this.resultadoConcurrencia = null;

    const promesas: Promise<any>[] = [];
    const inicio = Date.now();
    const TOTAL = 30;

    for (let i = 1; i <= TOTAL; i++) {
      const p = new Promise((resolve) => {
        const ts = Date.now();
        const payload = {
          email: `live_concurrente_${i}_${ts}@smartgym.pe`,
          password: 'Password123!',
          nombre: `ClienteVirtual${i}`,
          apellido: `Demo${i}`
        };
        this.api.register(payload).subscribe({
          next: () => resolve({ index: i, success: true }),
          error: (err) => resolve({ index: i, success: false, error: err.message })
        });
      });
      promesas.push(p);
    }

    Promise.all(promesas).then((res: any[]) => {
      const fin = Date.now();
      const exitosos = res.filter((r) => r.success).length;
      this.resultadoConcurrencia = {
        total: TOTAL,
        exitosos,
        fallidos: TOTAL - exitosos,
        tiempoMs: fin - inicio,
        tps: ((TOTAL / (fin - inicio)) * 1000).toFixed(1)
      };
      this.ejecutandoConcurrencia = false;
      this.cargarPanelAdmin();
    });
  }
}
