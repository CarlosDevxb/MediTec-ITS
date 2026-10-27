/**
 * Definición de los catálogos administrables (`tablas cat_*`).
 *
 * ⚠️ Este mapa es una LISTA BLANCA. El identificador que manda el cliente
 * (`/api/catalogos/:catalogo`) solo se usa para buscar aquí: nunca se usa
 * para armar el nombre de la tabla. Así es imposible inyectar SQL por la URL,
 * y si el catálogo no existe se responde 404 en lugar de ejecutar nada.
 *
 * Si se agrega un catálogo al esquema, hay que registrarlo aquí y en la lista
 * de `uso` (para poder impedir borrar valores que ya están asignados).
 */
export interface CampoCandidato {
  /** Nombre real de la columna en MySQL */
  columna: string;
  etiqueta: string;
  placeholder: string;
  /** Largo máximo del VARCHAR de la columna */
  maximo: number;
  hint?: string;
}

export interface DefinicionCatalogo {
  id: string;
  titulo: string;
  descripcion: string;
  singular: string;
  articulo: 'el' | 'la';
  /** Tabla real; solo se conoce aquí, nunca desde el cliente */
  tabla: string;
  columnaId: string;
  campos: CampoCandidato[];
  /** Tablas que referencian este catálogo */
  uso: Array<{
    tabla: string;
    columna: string;
    descripcion: string;
    /** En tablas puente con clave compuesta, la otra columna de la clave */
    columnaRelacion?: string;
  }>;
}

export const CATALOGOS: Record<string, DefinicionCatalogo> = {
  alergias: {
    id: 'alergias',
    titulo: 'Alergias',
    descripcion:
      'Sustancias que provocan reacción alérgica. Se asignan al expediente del paciente y aparecen como alerta al atender una consulta.',
    singular: 'alergia',
    articulo: 'la',
    tabla: 'cat_alergias',
    columnaId: 'id_alergia',
    campos: [
      {
        columna: 'nombre',
        etiqueta: 'Nombre de la alergia',
        placeholder: 'Ej. Penicilina',
        maximo: 100,
        hint: 'Sustancia o grupo de sustancias, no el caso particular de un paciente.',
      },
    ],
    uso: [
      {
        tabla: 'paciente_alergias',
        columna: 'cat_alergias_id_alergia',
        descripcion: 'expedientes de pacientes',
        columnaRelacion: 'pacientes_id_paciente',
      },
    ],
  },
  enfermedades: {
    id: 'enfermedades',
    titulo: 'Enfermedades',
    descripcion:
      'Padecimientos crónicos o de relevancia clínica. Se registran en el expediente y en el cuestionario de salud.',
    singular: 'enfermedad',
    articulo: 'la',
    tabla: 'cat_enfermedades',
    columnaId: 'id_enfermedad',
    campos: [
      {
        columna: 'nombre',
        etiqueta: 'Nombre de la enfermedad',
        placeholder: 'Ej. Diabetes tipo 2',
        maximo: 100,
        hint: 'Usa el nombre del padecimiento, no el medicamento ni el síntoma.',
      },
    ],
    uso: [
      {
        tabla: 'paciente_enfermedades',
        columna: 'cat_enfermedades_id_enfermedad',
        descripcion: 'expedientes de pacientes',
        columnaRelacion: 'pacientes_id_paciente',
      },
    ],
  },
  unidades_medida: {
    id: 'unidades_medida',
    titulo: 'Unidades de medida',
    descripcion:
      'Unidades con las que se surte el inventario y se prescriben los medicamentos (cápsulas, mililitros, gramos…).',
    singular: 'unidad de medida',
    articulo: 'la',
    tabla: 'cat_unidades_medida',
    columnaId: 'id_unidad',
    campos: [
      { columna: 'nombre', etiqueta: 'Nombre de la unidad', placeholder: 'Ej. Comprimido', maximo: 50 },
      {
        columna: 'abreviatura',
        etiqueta: 'Abreviatura',
        placeholder: 'Ej. COMP',
        maximo: 10,
        hint: 'Se usa en etiquetas del inventario y en las recetas. En mayúsculas.',
      },
    ],
    uso: [{ tabla: 'medicamentos', columna: 'cat_unidades_medida_id_unidad', descripcion: 'medicamentos del inventario' }],
  },
  tipo_paciente: {
    id: 'tipo_paciente',
    titulo: 'Tipos de paciente',
    descripcion:
      'Clasificación institucional con la que se da de alta un paciente. Determina qué datos se le piden al registrarlo.',
    singular: 'tipo de paciente',
    articulo: 'el',
    tabla: 'cat_tipo_paciente',
    columnaId: 'id_tipo',
    campos: [
      {
        columna: 'nombre',
        etiqueta: 'Nombre del tipo',
        placeholder: 'Ej. Alumno',
        maximo: 50,
        hint: 'Solo la clasificación: Alumno, Docente, Administrativo…',
      },
    ],
    uso: [{ tabla: 'pacientes', columna: 'cat_tipo_paciente_id_tipo', descripcion: 'pacientes registrados' }],
  },
  carreras: {
    id: 'carreras',
    titulo: 'Carreras',
    descripcion:
      'Oferta educativa de la institución. Se asigna únicamente a los pacientes de tipo Alumno.',
    singular: 'carrera',
    articulo: 'la',
    tabla: 'cat_carreras',
    columnaId: 'id_carrera',
    campos: [
      {
        columna: 'nombre',
        etiqueta: 'Nombre de la carrera',
        placeholder: 'Ej. Ing. en Sistemas Computacionales',
        maximo: 100,
        hint: 'Escribe el nombre completo con el grado, como aparece en los documentos oficiales.',
      },
    ],
    uso: [{ tabla: 'pacientes', columna: 'cat_carreras_id_carrera', descripcion: 'pacientes de tipo alumno' }],
  },
};

/** Devuelve el catálogo o `undefined` (para responder 404) */
export function buscarCatalogo(id: string): DefinicionCatalogo | undefined {
  return CATALOGOS[id];
}
