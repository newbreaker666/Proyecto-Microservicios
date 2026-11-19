import { Component, OnInit, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { PerfilCliente } from '../../models/cliente.model';
import { MetaPersonal, CrearMetaPayload, TipoMeta } from '../../models/meta.model';
import { HandoffMembresiasPayload } from '../../models/interservicio.model';

@Component({
  selector: 'app-portal-socio',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './portal-socio.component.html',
  styleUrls: ['./portal-socio.component.css']
})
export class PortalSocioComponent implements OnInit {
  api = inject(ApiService);
  auth = inject(AuthService);

  miPerfilData: PerfilCliente | null = null;
  miProgresoList: any[] = [];
  misMetasList: MetaPersonal[] = [];
  miCarnetData: any = null;
  cargandoSocio = false;

  nuevaMeta: CrearMetaPayload = {
    tipo_meta: 'PESO_OBJETIVO',
    descripcion: 'Llegar a 65 kg para diciembre',
    valor_actual: 70,
    valor_objetivo: 65,
    unidad: 'kg',
    fecha_limite: '2026-12-31'
  };

  // Modal Editar Perfil
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

  // Modal Cambiar Password
  modalCambiarPassword = false;
  formPassword = {
    passwordActual: '',
    passwordNueva: '',
    confirmarPassword: ''
  };
  mensajePassword = '';
  exitoPassword = false;
  cargandoPassword = false;

  // Modal Conexión Handoff MS-Membresías
  modalMembresiasHandoff = false;
  urlMsMembresias = 'http://localhost:4300';
  payloadHandoffMembresias: HandoffMembresiasPayload | null = null;
  copiadoPayload = false;
  copiadoEndpoints = false;
  copiadoRetorno = false;

  get originActual(): string {
    return window.location.origin;
  }

  get payloadJsonFormateado(): string {
    return this.payloadHandoffMembresias
      ? JSON.stringify(this.payloadHandoffMembresias, null, 2)
      : '';
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

  ngOnInit(): void {
    this.cargarPortalSocio();
    if (window.location.search) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }

  @HostListener('window:focus')
  alVolverAPestana(): void {
    if (this.auth.estaAutenticado()) {
      this.api.getMiPerfil().subscribe({
        next: (res) => {
          if (res?.data) {
            this.miPerfilData = res.data;
          }
        }
      });
    }
  }

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

  cambiarTipoMeta(tipo: TipoMeta | string): void {
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

  actualizarAvanceMeta(m: MetaPersonal, incremento: number): void {
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
      next: () => this.cargarPortalSocio(),
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

    const payload: HandoffMembresiasPayload = {
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

    localStorage.setItem('smartgym_handoff_membresias', JSON.stringify(payload));

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
}
