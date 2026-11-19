import { Routes } from '@angular/router';
import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthComponent } from './components/auth/auth.component';
import { OnboardingComponent } from './components/onboarding/onboarding.component';
import { PortalSocioComponent } from './components/portal-socio/portal-socio.component';
import { PanelEntrenadorComponent } from './components/panel-entrenador/panel-entrenador.component';
import { PanelAdminComponent } from './components/panel-admin/panel-admin.component';
import { authGuard, roleGuard } from './guards/auth.guard';
import { AuthService } from './services/auth.service';

const defaultRedirectGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.estaAutenticado()) {
    return router.parseUrl('/auth');
  }
  const rol = auth.obtenerRol();
  const u = auth.usuario();
  if (rol === 'CLIENTE') {
    return !u?.onboarding_completado ? router.parseUrl('/onboarding') : router.parseUrl('/socio');
  }
  if (rol === 'ENTRENADOR') return router.parseUrl('/entrenador');
  if (rol === 'ADMIN') return router.parseUrl('/admin');
  return router.parseUrl('/auth');
};

export const routes: Routes = [
  { path: '', canActivate: [defaultRedirectGuard], children: [] },
  { path: 'auth', component: AuthComponent },
  { path: 'login', redirectTo: 'auth', pathMatch: 'full' },
  { path: 'onboarding', component: OnboardingComponent },
  {
    path: 'socio',
    component: PortalSocioComponent,
    canActivate: [authGuard, roleGuard(['CLIENTE'])]
  },
  {
    path: 'entrenador',
    component: PanelEntrenadorComponent,
    canActivate: [authGuard, roleGuard(['ENTRENADOR'])]
  },
  {
    path: 'admin',
    component: PanelAdminComponent,
    canActivate: [authGuard, roleGuard(['ADMIN'])]
  },
  { path: '**', redirectTo: 'auth' }
];
