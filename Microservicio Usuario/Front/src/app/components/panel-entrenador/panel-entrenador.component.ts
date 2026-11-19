import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { MedicionPayload, ObservacionPayload } from '../../models/personal.model';

@Component({
  selector: 'app-panel-entrenador',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './panel-entrenador.component.html',
  styleUrls: ['./panel-entrenador.component.css']
})
export class PanelEntrenadorComponent implements OnInit {
  api = inject(ApiService);
  auth = inject(AuthService);

  clientesList: any[] = [];
  clienteSeleccionado: any = null;
  filtroBusqueda = '';
  filtroObjetivo = '';
  cargandoEntrenador = false;

  formNuevaMedicion: MedicionPayload = { peso: 70, talla: 170, porcentaje_grasa: 20, notas: '' };
  formNuevaObs: ObservacionPayload = { tipo: 'PROGRESO', contenido: '', objetivo_nuevo: '' };

  ngOnInit(): void {
    this.cargarPanelEntrenador();
  }

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
        this.formNuevaMedicion.notas = '';
        this.seleccionarCliente(this.clienteSeleccionado.cliente);
        this.cargarPanelEntrenador();
      },
      error: (err) => alert(err.error?.message || 'Error al registrar medición')
    });
  }

  guardarObservacionEntrenador(): void {
    if (!this.clienteSeleccionado || !this.formNuevaObs.contenido) return;
    const cid = this.clienteSeleccionado.cliente.cliente_id;
    this.api.agregarObservacion(cid, this.formNuevaObs).subscribe({
      next: () => {
        alert('Observación añadida');
        this.formNuevaObs.contenido = '';
        this.seleccionarCliente(this.clienteSeleccionado.cliente);
      },
      error: (err) => alert(err.error?.message || 'Error al registrar observación')
    });
  }
}
