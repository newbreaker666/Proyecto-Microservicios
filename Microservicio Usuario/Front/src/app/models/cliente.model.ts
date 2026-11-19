export interface Macronutrientes {
  proteinas_g: number;
  carbohidratos_g: number;
  grasas_g: number;
}

export interface PerfilCliente {
  usuario_id: string;
  cliente_id: number;
  numero_socio: string;
  nombre: string;
  apellido: string;
  email: string;
  dni: string;
  telefono?: string;
  direccion?: string;
  contacto_emergencia?: string;
  telefono_emergencia?: string;
  sexo: string;
  fecha_nacimiento?: string;
  edad?: number;
  peso_actual: number;
  talla_actual: number;
  imc_actual: number;
  clasificacion_imc: string;
  tmb_actual: number;
  tdee_actual: number;
  objetivo_fitness: string;
  nivel_experiencia: string;
  factor_actividad: string;
  estado_membresia: string;
  activo?: boolean;
  tipo_sangre?: string;
  nivel_riesgo?: string;
  alergias?: string;
  lesiones_previas?: string;
  disciplinas?: string | string[];
  horario_preferido?: string;
  dias_semana?: string | string[];
  frecuencia_semanal?: number;
  macronutrientes_sugeridos?: Macronutrientes;
  onboarding_completado?: boolean;
}

export interface PerfilBiometricoForm {
  dni: string;
  fecha_nacimiento: string;
  sexo: string;
  telefono: string;
  direccion: string;
  contacto_emergencia: string;
  telefono_emergencia: string;
  peso: number;
  talla: number;
  objetivo_fitness: string;
  nivel_experiencia: string;
  factor_actividad: string;
}

export interface FichaPARQForm {
  p1: boolean;
  p2: boolean;
  p3: boolean;
  p4: boolean;
  p5: boolean;
  p6: boolean;
  p7: boolean;
  tipo_sangre: string;
  alergias: string;
  lesiones_previas: string;
  notas_medicas: string;
}

export interface PreferenciasForm {
  disciplinas: string[];
  horario_preferido: string;
  dias_semana: string[];
  frecuencia_semanal: number;
  experiencia_previa: string;
}

export interface CarnetDigital {
  numero_socio: string;
  nombre: string;
  apellido: string;
  dni: string;
  tipo_sangre: string;
  nivel_riesgo: string;
  estado_membresia: string;
}
