export type TipoMeta = 'PESO_OBJETIVO' | 'PERSONALIZADA' | 'ASISTENCIA_SEMANAL' | 'PORCENTAJE_GRASA';

export interface MetaPersonal {
  meta_id: number;
  cliente_id: number;
  tipo_meta: TipoMeta | string;
  descripcion: string;
  valor_inicial?: number | null;
  valor_actual: number;
  valor_objetivo: number;
  unidad: string;
  porcentaje_avance: number;
  estado: 'ACTIVA' | 'COMPLETADA' | 'CANCELADA';
  fecha_limite?: string;
  created_at?: string;
}

export interface CrearMetaPayload {
  tipo_meta: string;
  descripcion: string;
  valor_actual: number;
  valor_objetivo: number;
  valor_inicial?: number;
  unidad: string;
  fecha_limite: string;
}
