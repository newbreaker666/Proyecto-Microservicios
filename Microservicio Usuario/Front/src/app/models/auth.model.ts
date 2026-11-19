export type UserRol = 'CLIENTE' | 'ENTRENADOR' | 'ADMIN' | 'INVITADO';

export interface UserSession {
  usuario_id: string;
  email: string;
  nombre: string;
  apellido: string;
  rol: UserRol;
  cliente_id?: number | null;
  numero_socio?: string | null;
  objetivo_fitness?: string | null;
  onboarding_completado?: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  nombre: string;
  apellido: string;
}

export interface ChangePasswordRequest {
  passwordActual: string;
  passwordNueva: string;
}
