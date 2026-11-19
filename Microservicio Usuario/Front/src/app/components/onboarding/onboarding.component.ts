import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { PerfilBiometricoForm, FichaPARQForm, PreferenciasForm } from '../../models/cliente.model';

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './onboarding.component.html',
  styleUrls: ['./onboarding.component.css']
})
export class OnboardingComponent {
  api = inject(ApiService);
  auth = inject(AuthService);
  router = inject(Router);

  pasoOnboarding = 1;
  cargandoOnboarding = false;

  formBio: PerfilBiometricoForm = {
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

  formPARQ: FichaPARQForm = {
    p1: false, p2: false, p3: false, p4: false, p5: false, p6: false, p7: false,
    tipo_sangre: 'O+', alergias: '', lesiones_previas: '', notas_medicas: ''
  };

  formPref: PreferenciasForm = {
    disciplinas: ['PESAS', 'CARDIO'],
    horario_preferido: 'TARDE',
    dias_semana: ['LUN', 'MIE', 'VIE'],
    frecuencia_semanal: 3,
    experiencia_previa: ''
  };

  onboardingResultado: any = null;

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

  avanzarPaso1(): void {
    if (!this.auth.estaAutenticado()) {
      alert('Por favor inicie sesión o regístrese primero');
      this.router.navigate(['/auth']);
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
        this.pasoOnboarding = 4;
      },
      error: (err) => {
        this.cargandoOnboarding = false;
        alert(err.error?.message || 'Error al guardar preferencias');
      }
    });
  }

  irAPortalSocio(): void {
    this.router.navigate(['/socio']);
  }
}
