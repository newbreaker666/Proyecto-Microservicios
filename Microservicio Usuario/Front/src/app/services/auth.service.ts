import { Injectable, signal } from '@angular/core';
import type { UserSession, UserRol } from '../models/auth.model';

export type { UserSession, UserRol };

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  usuario = signal<UserSession | null>(null);

  constructor() {
    this.cargarSesion();
  }

  cargarSesion(): void {
    const rawUser = localStorage.getItem('usuario');
    const token = localStorage.getItem('token');
    if (rawUser && token) {
      try {
        this.usuario.set(JSON.parse(rawUser));
      } catch {
        this.logout();
      }
    }
  }

  guardarSesion(token: string, usuario: UserSession): void {
    localStorage.setItem('token', token);
    localStorage.setItem('usuario', JSON.stringify(usuario));
    this.usuario.set(usuario);
  }

  actualizarUsuario(parcial: Partial<UserSession>): void {
    const actual = this.usuario();
    if (actual) {
      const actualizado = { ...actual, ...parcial };
      localStorage.setItem('usuario', JSON.stringify(actualizado));
      this.usuario.set(actualizado);
    }
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    this.usuario.set(null);
  }

  estaAutenticado(): boolean {
    return !!this.usuario() && !!localStorage.getItem('token');
  }

  obtenerRol(): string {
    return this.usuario()?.rol || 'INVITADO';
  }
}
