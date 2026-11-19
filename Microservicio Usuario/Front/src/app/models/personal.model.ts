export interface UsuarioStaff {
  usuario_id: string;
  nombre: string;
  apellido: string;
  email: string;
  rol_nombre: 'ADMIN' | 'ENTRENADOR' | 'CLIENTE';
  activo: boolean;
  personal_telefono?: string;
  cliente_telefono?: string;
  especialidad?: string;
  dni?: string;
  numero_socio?: string;
  estado_membresia?: string;
  created_at?: string;
}

export interface MedicionPayload {
  peso: number;
  talla: number;
  porcentaje_grasa: number;
  notas: string;
}

export interface ObservacionPayload {
  tipo: string;
  contenido: string;
  objetivo_nuevo?: string;
}

export interface AuditoriaLog {
  log_id: number;
  usuario_id?: string;
  accion: string;
  tabla_afectada?: string;
  ip_origen?: string;
  fecha: string;
  detalle?: string;
}
