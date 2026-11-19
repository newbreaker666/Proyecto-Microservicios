import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.estaAutenticado()) {
    return true;
  }
  return router.parseUrl('/auth');
};

export const roleGuard = (allowedRoles: string[]): CanActivateFn => {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (!auth.estaAutenticado()) {
      return router.parseUrl('/auth');
    }

    const rol = auth.obtenerRol();
    if (allowedRoles.includes(rol)) {
      return true;
    }

    // Redirigir según rol asignado si no tiene permiso
    if (rol === 'CLIENTE') return router.parseUrl('/socio');
    if (rol === 'ENTRENADOR') return router.parseUrl('/entrenador');
    if (rol === 'ADMIN') return router.parseUrl('/admin');
    return router.parseUrl('/auth');
  };
};
