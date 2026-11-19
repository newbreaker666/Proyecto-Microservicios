import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { UsuarioStaff, AuditoriaLog } from '../../models/personal.model';

@Component({
  selector: 'app-panel-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './panel-admin.component.html',
  styleUrls: ['./panel-admin.component.css']
})
export class PanelAdminComponent implements OnInit {
  api = inject(ApiService);
  auth = inject(AuthService);

  subTabAdmin: 'staff' | 'clientes' | 'auditoria' = 'staff';
  usuariosList: any[] = [];
  auditoriaList: AuditoriaLog[] = [];
  metricasAdmin: any = null;
  cargandoAdmin = false;

  formStaff = {
    email: '',
    password: 'StaffPassword2026!',
    nombre: '',
    apellido: '',
    rol: 'ENTRENADOR',
    dni: '',
    especialidad: 'Musculación',
    telefono: ''
  };

  modalEditarStaff = false;
  staffSeleccionado: any = null;

  modalEditarCliente = false;
  clienteAdminSeleccionado: any = null;

  resultadoConcurrencia: any = null;
  ejecutandoConcurrencia = false;

  get listaStaff(): any[] {
    return this.usuariosList.filter(u => u.rol_nombre === 'ADMIN' || u.rol_nombre === 'ENTRENADOR');
  }

  get listaClientesAdmin(): any[] {
    return this.usuariosList.filter(u => u.rol_nombre === 'CLIENTE');
  }

  ngOnInit(): void {
    this.cargarPanelAdmin();
  }

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
