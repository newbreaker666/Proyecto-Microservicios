export interface HandoffMembresiasPayload {
  evento: string;
  origen_microservicio: string;
  timestamp: string;
  socio: {
    usuario_id: string;
    cliente_id: number;
    numero_socio: string;
    nombre_completo: string;
    email: string;
    dni: string;
    telefono: string | null;
    sexo: string;
    edad?: number;
    estado_cuenta: string;
    estado_membresia_actual: string;
  };
  perfil_biometrico_y_preferencias: {
    objetivo_fitness: string;
    nivel_experiencia: string;
    factor_actividad: string;
    peso_kg: number;
    talla_cm: number;
    imc: number;
    clasificacion_imc: string;
    tmb_kcal: number;
    tdee_kcal: number;
    disciplinas: string[];
    horario_preferido: string;
    dias_semana: string[];
    frecuencia_semanal: number;
    nivel_riesgo_salud: string;
    alergias: string;
    lesiones_previas: string;
  };
  endpoints_ms_usuarios: {
    base_url: string;
    return_url_mantener_sesion: string;
    consultar_perfil_backend: string;
    activar_o_suspender_membresia: string;
    header_autenticacion: string;
  };
}
