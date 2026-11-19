import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { LoginRequest, RegisterRequest } from '../../models/auth.model';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './auth.component.html',
  styleUrls: ['./auth.component.css']
})
export class AuthComponent {
  api = inject(ApiService);
  auth = inject(AuthService);
  router = inject(Router);

  modoAuth: 'login' | 'register' = 'login';
  formLogin: LoginRequest = { email: 'cliente1@smartgym.pe', password: 'Cliente123!' };
  formRegister: RegisterRequest = { email: '', password: '', nombre: '', apellido: '' };
  mensajeAuth = '';
  cargandoAuth = false;

  ejecutarLogin(): void {
    this.cargandoAuth = true;
    this.mensajeAuth = '';
    this.api.login(this.formLogin).subscribe({
      next: (res) => {
        this.cargandoAuth = false;
        this.auth.guardarSesion(res.data.token, res.data.usuario);
        this.redirigirSegunRol();
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
        this.router.navigate(['/onboarding']);
      },
      error: (err) => {
        this.cargandoAuth = false;
        this.mensajeAuth = err.error?.message || 'Error al registrarse';
      }
    });
  }

  loginRapido(email: string, pass: string): void {
    this.formLogin.email = email;
    this.formLogin.password = pass;
    this.ejecutarLogin();
  }

  redirigirSegunRol(): void {
    const rol = this.auth.obtenerRol();
    const u = this.auth.usuario();
    if (rol === 'CLIENTE') {
      if (!u?.onboarding_completado) {
        this.router.navigate(['/onboarding']);
      } else {
        this.router.navigate(['/socio']);
      }
    } else if (rol === 'ENTRENADOR') {
      this.router.navigate(['/entrenador']);
    } else if (rol === 'ADMIN') {
      this.router.navigate(['/admin']);
    }
  }
}
