import React, { useEffect, useMemo, useState } from 'react';
import {
  ClipboardPlus,
  HeartPulse,
  Stethoscope,
  PackagePlus,
  Save,
  ShieldAlert,
  X,
  Trash2,
  CircleAlert,
  CalendarClock,
} from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import IconButton from '../ui/IconButton';
import Badge from '../ui/Badge';
import { Field, Input, Select, Textarea } from '../ui/Input';
import { detallesDe, mensajeDeError } from '../../services/api';
import { listarMedicamentos, type Medicamento } from '../../services/operacion.service';
import {
  type DatosAtencion,
  type ExpedientePaciente,
  type Cita,
  alergiaEnConflicto,
  fechaCorta,
  hoyISO,
} from '../../services/atencion.service';

/* ============================================================
   FORMULARIO DE ATENCIÓN · Signos vitales, consulta e insumos

   Regla central del sistema: toda consulta deriva de una cita.
   El personal registra atenciones de llegada (estado "Atención
   directa") y el sistema crea la cita interna automáticamente
   antes de guardar la consulta.

   Según el `rol`:
   - Personal médico: diagnóstico y tratamiento (todo el inventario
     disponible como insumo).
   - Enfermería: intervención de enfermería y solo insumos
     comunes (categorías 'Insumo' y 'Medicamento común').

   La validación es en tiempo real (campos requeridos, rangos de
   signos vitales y cantidad de insumos contra el stock).
   ============================================================ */

/** Categorías del inventario que puede usar cada tipo de consulta */
const CATEGORIAS_POR_ROL: Record<'medico' | 'enfermeria' | 'nutricion' | 'odontologia', string[]> = {
  medico: ['Insumo', 'Medicamento común', 'Medicamento especial', 'Insumo dental'],
  enfermeria: ['Insumo', 'Medicamento común'],
  nutricion: [],
  odontologia: ['Medicamento común', 'Medicamento especial', 'Insumo dental'],
};

export interface AtencionFormProps {
  expediente: ExpedientePaciente;
  /** 'medico', 'enfermeria', 'nutricion' u 'odontologia' */
  rol?: 'medico' | 'enfermeria' | 'nutricion' | 'odontologia';
  /** Cita agendada que se atiende (nutrición y odontología siempre; el
   *  doctor y la enfermería atienden sin cita, con auto-cita) */
  citaInicial?: Cita | null;
  guardando?: boolean;
  onGuardar: (datos: DatosAtencion) => Promise<void>;
  onCancelar: () => void;
}

interface RenglonInsumo {
  medicamentoId: string;
  cantidad: string;
}

/** Aviso de un campo (cadena vacía si está bien) */
function errorDeCampo(
  campo:
    | 'motivo'
    | 'sintomas'
    | 'diagnostico'
    | 'tratamiento'
    | 'intervencionEnfermeria'
    | 'ta'
    | 'fc'
    | 'fr'
    | 'temp'
    | 'peso'
    | 'talla',
  valores: Record<string, string>,
  rol: 'medico' | 'enfermeria' | 'nutricion' | 'odontologia',
  esAtencionDirecta: boolean,
): string {
  const texto = (clave: string) => (valores[clave] ?? '').trim();
  switch (campo) {
    case 'motivo':
      // Con cita agendada el motivo ya vive en la cita
      if (!esAtencionDirecta) return '';
      if (!texto('motivo')) return 'Indica el motivo de la atención.';
      return texto('motivo').length > 255 ? 'El motivo no puede exceder 255 caracteres.' : '';
    case 'sintomas':
      // Las sesiones de nutrición no capturan síntomas
      if (rol === 'nutricion') return '';
      if (!texto('sintomas')) return 'Describe los síntomas.';
      return texto('sintomas').length > 2000 ? 'Los síntomas no pueden exceder 2000 caracteres.' : '';
    case 'diagnostico':
      // Solo enfermería no diagnostica (nutrición sí, con su enfoque)
      if (rol === 'enfermeria') return '';
      if (!texto('diagnostico')) return 'El diagnóstico es obligatorio.';
      return texto('diagnostico').length > 255 ? 'El diagnóstico no puede exceder 255 caracteres.' : '';
    case 'tratamiento':
      if (rol === 'enfermeria') return '';
      if (!texto('tratamiento')) return 'El tratamiento es obligatorio.';
      return texto('tratamiento').length > 2000 ? 'El tratamiento no puede exceder 2000 caracteres.' : '';
    case 'intervencionEnfermeria':
      if (rol !== 'enfermeria') return '';
      if (!texto('intervencionEnfermeria')) return 'Describe la intervención de enfermería.';
      return texto('intervencionEnfermeria').length > 2000
        ? 'La intervención no puede exceder 2000 caracteres.'
        : '';
    case 'ta':
      return texto('ta').length > 10 ? 'La presión arterial no puede exceder 10 caracteres.' : '';
    case 'fc': {
      if (!texto('fc')) return '';
      const valor = Number(texto('fc'));
      if (!Number.isInteger(valor)) return 'La frecuencia cardíaca debe ser un número entero.';
      return valor < 20 || valor > 250 ? 'Debe estar entre 20 y 250 lpm.' : '';
    }
    case 'fr': {
      if (!texto('fr')) return '';
      const valor = Number(texto('fr'));
      if (!Number.isInteger(valor)) return 'La frecuencia respiratoria debe ser un número entero.';
      return valor < 5 || valor > 60 ? 'Debe estar entre 5 y 60 rpm.' : '';
    }
    case 'temp': {
      if (!texto('temp')) return '';
      const valor = Number(texto('temp'));
      if (Number.isNaN(valor)) return 'La temperatura debe ser un número.';
      return valor < 25 || valor > 45 ? 'Debe estar entre 25 y 45 °C.' : '';
    }
    case 'peso': {
      if (!texto('peso')) return '';
      const valor = Number(texto('peso'));
      if (Number.isNaN(valor)) return 'El peso debe ser un número.';
      return valor < 0.5 || valor > 500 ? 'Debe estar entre 0.5 y 500 kg.' : '';
    }
    case 'talla': {
      if (!texto('talla')) return '';
      const valor = Number(texto('talla'));
      if (Number.isNaN(valor)) return 'La talla debe ser un número.';
      return valor < 0.3 || valor > 2.5 ? 'Debe estar entre 0.3 y 2.5 m.' : '';
    }
  }
}

export default function AtencionForm({
  expediente,
  rol = 'medico',
  citaInicial = null,
  guardando = false,
  onGuardar,
  onCancelar,
}: AtencionFormProps) {
  const esAtencionDirecta = !citaInicial;

  /* Datos de la atención (auto-cita) */
  const [motivo, setMotivo] = useState('');
  /* Signos vitales */
  const [ta, setTa] = useState('');
  const [fc, setFc] = useState('');
  const [fr, setFr] = useState('');
  const [temp, setTemp] = useState('');
  // Peso y talla se precargan con la última medición del paciente (signos de
  // su consulta previa o cuestionario de salud): se pueden ajustar si cambió
  const [peso, setPeso] = useState(
    expediente.ultimaMedicion?.peso != null ? String(expediente.ultimaMedicion.peso) : '',
  );
  const [talla, setTalla] = useState(
    expediente.ultimaMedicion?.talla != null ? String(expediente.ultimaMedicion.talla) : '',
  );
  /* Consulta (según el rol: médica, de enfermería o de nutrición) */
  const [sintomas, setSintomas] = useState('');
  const [exploracion, setExploracion] = useState('');
  const [diagnostico, setDiagnostico] = useState('');
  const [tratamiento, setTratamiento] = useState('');
  const [intervencionEnfermeria, setIntervencionEnfermeria] = useState('');
  /* Plan alimenticio (se registra junto con la sesión de nutrición) */
  const [planInicio, setPlanInicio] = useState(() => hoyISO());
  const [planFin, setPlanFin] = useState(() => {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() + 30);
    return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(
      fecha.getDate(),
    ).padStart(2, '0')}`;
  });
  const [planDieta, setPlanDieta] = useState('');
  const [planCalorias, setPlanCalorias] = useState('');
  /* Insumos */
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([]);
  const [insumos, setInsumos] = useState<RenglonInsumo[]>([]);
  /* Estados de captura */
  const [tocado, setTocado] = useState<Record<string, boolean>>({});
  const [erroresServidor, setErroresServidor] = useState<Record<string, string>>({});
  const [errorGeneral, setErrorGeneral] = useState('');
  const [confirmar, setConfirmar] = useState(false);

  // Inventario para los insumos (solo se ofrecen los disponibles)
  useEffect(() => {
    let vigente = true;
    listarMedicamentos()
      .then((lista) => {
        if (vigente) setMedicamentos(lista);
      })
      .catch(() => {
        // Sin inventario no se pueden registrar insumos: la atención sigue
        if (vigente) setMedicamentos([]);
      });
    return () => {
      vigente = false;
    };
  }, []);

  const valores = {
    motivo,
    sintomas,
    diagnostico,
    tratamiento,
    intervencionEnfermeria,
    ta,
    fc,
    fr,
    temp,
    peso,
    talla,
  };

  /* ---------- Errores vivos: se recalculan en cada tecla ---------- */
  const errores = useMemo(() => {
    const calculados: Record<string, string> = {};
    for (const campo of [
      'motivo',
      'sintomas',
      'diagnostico',
      'tratamiento',
      'intervencionEnfermeria',
      'ta',
      'fc',
      'fr',
      'temp',
      'peso',
      'talla',
    ] as const) {
      calculados[campo] = errorDeCampo(campo, valores, rol, esAtencionDirecta);
    }

    // Plan alimenticio: obligatorio junto con la sesión de nutrición
    if (rol === 'nutricion') {
      calculados.planInicio = planInicio ? '' : 'Indica la fecha de inicio del plan.';
      calculados.planFin = !planFin
        ? 'Indica la fecha de fin del plan.'
        : planInicio && planFin < planInicio
          ? 'La fecha de fin no puede ser anterior a la de inicio.'
          : '';
      calculados.planDieta = !planDieta.trim()
        ? 'Describe la dieta del plan alimenticio.'
        : planDieta.length > 4000
          ? 'La descripción no puede exceder 4000 caracteres.'
          : '';
      const calorias = Number(planCalorias);
      calculados.planCalorias = !planCalorias
        ? 'Indica las calorías diarias.'
        : Number.isNaN(calorias) || !Number.isInteger(calorias)
          ? 'Las calorías diarias deben ser un número entero.'
          : calorias < 500 || calorias > 10000
            ? 'Las calorías deben estar entre 500 y 10,000.'
            : '';
    }

    return calculados;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [motivo, sintomas, diagnostico, tratamiento, intervencionEnfermeria, ta, fc, fr, temp, peso, talla, rol, citaInicial, planInicio, planFin, planDieta, planCalorias]);

  /* ---------- Seguridad clínica: alergias del paciente ----------
     Con las alergias registradas del expediente se bloquea el medicamento
     que las provoca (mismo criterio que el servidor) y se sugieren
     alternativas del inventario. */
  const alergiasPaciente = expediente.alergias ?? [];

  /** Avisos de los renglones de insumos: por medicamento y por cantidad */
  const erroresInsumos = useMemo(
    () =>
      insumos.map((renglon) => {
        const medicamento = medicamentos.find((m) => m.id === Number(renglon.medicamentoId));
        if (!renglon.medicamentoId) {
          return { medicamento: 'Selecciona un medicamento.', cantidad: '' };
        }
        if (!medicamento) {
          return { medicamento: 'El medicamento ya no está en el inventario.', cantidad: '' };
        }
        if (!medicamento.disponible) {
          return { medicamento: `"${medicamento.nombre}" está agotado.`, cantidad: '' };
        }
        const alergia = alergiaEnConflicto(medicamento.nombre, alergiasPaciente);
        if (alergia) {
          return {
            medicamento: `No se puede dispensar "${medicamento.nombre}": hay alergia registrada a "${alergia}".`,
            cantidad: '',
          };
        }
        const cantidad = Number(renglon.cantidad);
        if (!renglon.cantidad || Number.isNaN(cantidad) || cantidad <= 0) {
          return { medicamento: '', cantidad: 'La cantidad debe ser mayor a cero.' };
        }
        if (cantidad > medicamento.stock) {
          return {
            medicamento: '',
            cantidad: `Solo quedan ${medicamento.stock} ${medicamento.abreviatura || medicamento.unidad}.`,
          };
        }
        return { medicamento: '', cantidad: '' };
      }),
    [insumos, medicamentos, alergiasPaciente],
  );

  const errorVisible = (campo: string): string | undefined => {
    const propio = errores[campo];
    if (propio) return tocado[campo] ? propio : erroresServidor[campo] || undefined;
    return erroresServidor[campo] || undefined;
  };

  const hayErrores =
    Object.values(errores).some(Boolean) ||
    erroresInsumos.some((renglon) => Boolean(renglon.medicamento || renglon.cantidad));
  const marcarTocado = (campo: string) => setTocado((prev) => ({ ...prev, [campo]: true }));

  /* ---------- Insumos ----------
     Cada tipo de consulta solo descuenta sus categorías del inventario
     (ver CATEGORIAS_POR_ROL). */
  const medicamentosDisponibles = medicamentos.filter(
    (m) => m.disponible && CATEGORIAS_POR_ROL[rol].includes(m.categoria),
  );
  const yaAgregados = insumos.map((renglon) => Number(renglon.medicamentoId));
  const opcionesInsumo = medicamentosDisponibles.filter((m) => !yaAgregados.includes(m.id));
  /** Alternativas sin choque con las alergias del paciente (para sugerirlas) */
  const medicamentosSugeridos =
    alergiasPaciente.length === 0
      ? []
      : medicamentosDisponibles.filter((m) => !alergiaEnConflicto(m.nombre, alergiasPaciente));

  const agregarInsumo = () => setInsumos((prev) => [...prev, { medicamentoId: '', cantidad: '' }]);
  const cambiarInsumo = (indice: number, cambios: Partial<RenglonInsumo>) =>
    setInsumos((prev) => prev.map((renglon, i) => (i === indice ? { ...renglon, ...cambios } : renglon)));
  const quitarInsumo = (indice: number) =>
    setInsumos((prev) => prev.filter((_, i) => i !== indice));

  /* ---------- Envío ---------- */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTocado({
      motivo: true,
      sintomas: true,
      diagnostico: true,
      tratamiento: true,
      intervencionEnfermeria: true,
      planInicio: true,
      planFin: true,
      planDieta: true,
      planCalorias: true,
      ta: true,
      fc: true,
      fr: true,
      temp: true,
      peso: true,
      talla: true,
    });
    setErroresServidor({});
    setErrorGeneral('');
    if (hayErrores) return;
    setConfirmar(true);
  };

  const ejecutarGuardado = async () => {
    setConfirmar(false);
    const signos = {
      ta: ta.trim() || undefined,
      fc: fc.trim() ? Number(fc) : undefined,
      fr: fr.trim() ? Number(fr) : undefined,
      temp: temp.trim() ? Number(temp) : undefined,
      peso: peso.trim() ? Number(peso) : undefined,
      talla: talla.trim() ? Number(talla) : undefined,
    };
    const conSignos = Object.values(signos).some((valor) => valor !== undefined);

    try {
      await onGuardar({
        pacienteId: expediente.id,
        ...(citaInicial ? { citaId: citaInicial.id } : { motivo: motivo.trim() }),
        // Las sesiones de nutrición no capturan síntomas ni exploración
        ...(rol === 'nutricion'
          ? {}
          : { sintomas: sintomas.trim(), exploracion: exploracion.trim() || undefined }),
        ...(rol === 'enfermeria'
          ? { intervencionEnfermeria: intervencionEnfermeria.trim() }
          : { diagnostico: diagnostico.trim(), tratamiento: tratamiento.trim() }),
        // El plan alimenticio se registra junto con la sesión de nutrición
        ...(rol === 'nutricion'
          ? {
              planAlimenticio: {
                fechaInicio: planInicio,
                fechaFin: planFin,
                descripcionDieta: planDieta.trim(),
                caloriasDiarias: Number(planCalorias),
              },
            }
          : {}),
        ...(conSignos ? { signosVitales: signos } : {}),
        // Las sesiones de nutrición no registran insumos
        ...(rol === 'nutricion'
          ? {}
          : {
              insumos: insumos
                .filter((renglon) => renglon.medicamentoId && Number(renglon.cantidad) > 0)
                .map((renglon) => ({
                  medicamentoId: Number(renglon.medicamentoId),
                  cantidad: Number(renglon.cantidad),
                })),
            }),
      });
    } catch (error) {
      // Errores del servidor pintados en su campo (400) o como resumen (409 / red)
      const porCampo = detallesDe(error);
      if (Object.keys(porCampo).length > 0) setErroresServidor(porCampo);
      else setErrorGeneral(mensajeDeError(error));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="entrada space-y-6" noValidate>
      {/* ===== Datos de la atención ===== */}
      <Card title="Datos de la atención" icon={CalendarClock}>
        {citaInicial ? (
          <div className="flex flex-wrap items-center gap-3">
            <Badge status="confirmed">Cita agendada</Badge>
            <p className="text-gray-700">
              {fechaCorta(citaInicial.fecha)} a las {citaInicial.hora} · {citaInicial.motivo}
            </p>
            <p className="text-sm text-gray-500">
              La consulta se registrará ligada a esta cita.
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <Badge status="scheduled">Atención directa</Badge>
              <p className="text-sm text-gray-500">
                Atención de llegada: se registra en este momento con estado "Atención directa".
              </p>
            </div>
            <Field
              label="Motivo de la atención"
              error={errorVisible('motivo')}
              hint="Motivo por el que el paciente solicita atención. Máximo 255 caracteres."
            >
              <Input
                value={motivo}
                onChange={(e) => {
                  setMotivo(e.target.value);
                  marcarTocado('motivo');
                }}
                onBlur={() => marcarTocado('motivo')}
                placeholder="Ej. Dolor abdominal desde hace dos días"
                maxLength={255}
                aria-invalid={errorVisible('motivo') ? true : undefined}
              />
            </Field>
          </>
        )}
      </Card>

      {/* ===== Signos vitales ===== */}
      <Card title="Signos vitales" icon={HeartPulse}>
        <p className="text-sm text-gray-500 mb-4">
          Opcionales. Si los captura personal de enfermería antes de la consulta, aparecerán en
          el expediente.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Field label="Presión arterial" hint="Ej. 120/80" error={errorVisible('ta')}>
            <Input
              value={ta}
              onChange={(e) => {
                setTa(e.target.value);
                marcarTocado('ta');
              }}
              onBlur={() => marcarTocado('ta')}
              placeholder="120/80"
              aria-invalid={errorVisible('ta') ? true : undefined}
            />
          </Field>
          <Field label="Frecuencia cardíaca (lpm)" error={errorVisible('fc')}>
            <Input
              type="number"
              min={20}
              max={250}
              value={fc}
              onChange={(e) => {
                setFc(e.target.value);
                marcarTocado('fc');
              }}
              onBlur={() => marcarTocado('fc')}
              placeholder="78"
              className="tabular-nums"
              aria-invalid={errorVisible('fc') ? true : undefined}
            />
          </Field>
          <Field label="Frecuencia respiratoria (rpm)" error={errorVisible('fr')}>
            <Input
              type="number"
              min={5}
              max={60}
              value={fr}
              onChange={(e) => {
                setFr(e.target.value);
                marcarTocado('fr');
              }}
              onBlur={() => marcarTocado('fr')}
              placeholder="16"
              className="tabular-nums"
              aria-invalid={errorVisible('fr') ? true : undefined}
            />
          </Field>
          <Field label="Temperatura (°C)" error={errorVisible('temp')}>
            <Input
              type="number"
              step="0.1"
              min={25}
              max={45}
              value={temp}
              onChange={(e) => {
                setTemp(e.target.value);
                marcarTocado('temp');
              }}
              onBlur={() => marcarTocado('temp')}
              placeholder="36.5"
              className="tabular-nums"
              aria-invalid={errorVisible('temp') ? true : undefined}
            />
          </Field>
          <Field
            label="Peso (kg)"
            error={errorVisible('peso')}
            hint={
              expediente.ultimaMedicion?.peso != null
                ? `Se cargó el último registro (${expediente.ultimaMedicion.fecha}): ${expediente.ultimaMedicion.peso} kg. Edítalo si cambió.`
                : 'Obligatorio.'
            }
          >
            <Input
              type="number"
              step="0.01"
              min={0.5}
              max={500}
              value={peso}
              onChange={(e) => {
                setPeso(e.target.value);
                marcarTocado('peso');
              }}
              onBlur={() => marcarTocado('peso')}
              placeholder="70.5"
              className="tabular-nums"
              aria-invalid={errorVisible('peso') ? true : undefined}
            />
          </Field>
          <Field
            label="Talla (m)"
            error={errorVisible('talla')}
            hint={
              expediente.ultimaMedicion?.talla != null
                ? `Se cargó el último registro (${expediente.ultimaMedicion.fecha}): ${expediente.ultimaMedicion.talla} m. Edítalo si cambió.`
                : 'Obligatorio.'
            }
          >
            <Input
              type="number"
              step="0.01"
              min={0.3}
              max={2.5}
              value={talla}
              onChange={(e) => {
                setTalla(e.target.value);
                marcarTocado('talla');
              }}
              onBlur={() => marcarTocado('talla')}
              placeholder="1.70"
              className="tabular-nums"
              aria-invalid={errorVisible('talla') ? true : undefined}
            />
          </Field>
        </div>
      </Card>

      {/* ===== Consulta (según el rol) ===== */}
      <Card
        title={
          rol === 'enfermeria'
            ? 'Atención de enfermería'
            : rol === 'nutricion'
              ? 'Valoración nutricional'
              : rol === 'odontologia'
                ? 'Consulta odontológica'
                : 'Consulta'
        }
        icon={Stethoscope}
      >
        <div className="space-y-4">
          {/* Las sesiones de nutrición no capturan síntomas ni exploración */}
          {rol !== 'nutricion' && (
            <>
              <Field
                label={rol === 'odontologia' ? 'Síntomas bucales' : 'Síntomas'}
                error={errorVisible('sintomas')}
              >
                <Textarea
                  rows={3}
                  value={sintomas}
                  onChange={(e) => {
                    setSintomas(e.target.value);
                    marcarTocado('sintomas');
                  }}
                  onBlur={() => marcarTocado('sintomas')}
                  placeholder={
                    rol === 'odontologia'
                      ? 'Describe los síntomas bucales que refiere el paciente al momento de la atención…'
                      : 'Describe los síntomas que refiere el paciente al momento de la atención…'
                  }
                  aria-invalid={errorVisible('sintomas') ? true : undefined}
                />
              </Field>
              <Field
                label={rol === 'odontologia' ? 'Exploración bucal' : 'Exploración'}
                hint="Opcional."
                error={errorVisible('exploracion')}
              >
                <Textarea
                  rows={3}
                  value={exploracion}
                  onChange={(e) => setExploracion(e.target.value)}
                  placeholder={
                    rol === 'odontologia'
                      ? 'Hallazgos de la exploración bucal: piezas dentales, encías, oclusión…'
                      : 'Hallazgos de la exploración física…'
                  }
                />
              </Field>
            </>
          )}
          {rol === 'enfermeria' ? (
            <Field
              label="Intervención de enfermería"
              hint="Atención, cuidados y orientación proporcionados. No incluye diagnóstico ni prescripción de medicamentos."
              error={errorVisible('intervencionEnfermeria')}
            >
              <Textarea
                rows={3}
                value={intervencionEnfermeria}
                onChange={(e) => {
                  setIntervencionEnfermeria(e.target.value);
                  marcarTocado('intervencionEnfermeria');
                }}
                onBlur={() => marcarTocado('intervencionEnfermeria')}
                placeholder="Ej. Toma de signos vitales, curación básica, orientación de salud sexual…"
                aria-invalid={errorVisible('intervencionEnfermeria') ? true : undefined}
              />
            </Field>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field
                label={rol === 'nutricion' ? 'Diagnóstico nutricional' : 'Diagnóstico'}
                error={errorVisible('diagnostico')}
              >
                <Input
                  value={diagnostico}
                  onChange={(e) => {
                    setDiagnostico(e.target.value);
                    marcarTocado('diagnostico');
                  }}
                  onBlur={() => marcarTocado('diagnostico')}
                  placeholder={
                    rol === 'nutricion'
                      ? 'Ej. Sobrepeso grado I con dieta desbalanceada'
                      : rol === 'odontologia'
                        ? 'Ej. Caries dental en pieza 36'
                        : 'Ej. Gastroenteritis aguda'
                  }
                  maxLength={255}
                  aria-invalid={errorVisible('diagnostico') ? true : undefined}
                />
              </Field>
              <Field
                label={rol === 'nutricion' ? 'Indicaciones de alimentación' : 'Tratamiento'}
                error={errorVisible('tratamiento')}
              >
                <Input
                  value={tratamiento}
                  onChange={(e) => {
                    setTratamiento(e.target.value);
                    marcarTocado('tratamiento');
                  }}
                  onBlur={() => marcarTocado('tratamiento')}
                  placeholder={
                    rol === 'nutricion'
                      ? 'Ej. Plan hipocalórico de 1500 kcal y control mensual'
                      : rol === 'odontologia'
                        ? 'Ej. Restauración con resina compuesta en pieza 36'
                        : 'Ej. Hidratación y dieta blanda por 3 días'
                  }
                  aria-invalid={errorVisible('tratamiento') ? true : undefined}
                />
              </Field>
            </div>
          )}
        </div>
      </Card>

      {/* ===== Plan alimenticio (se registra con la sesión de nutrición) ===== */}
      {rol === 'nutricion' && (
        <Card title="Plan alimenticio" icon={ClipboardPlus}>
          <p className="text-sm text-gray-500 mb-4">
            El plan se da de alta junto con la sesión y queda como el plan alimenticio del
            paciente en este periodo.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Fecha de inicio" error={errorVisible('planInicio')}>
              <Input
                type="date"
                value={planInicio}
                onChange={(e) => {
                  setPlanInicio(e.target.value);
                  marcarTocado('planInicio');
                }}
                onBlur={() => marcarTocado('planInicio')}
                aria-invalid={errorVisible('planInicio') ? true : undefined}
              />
            </Field>
            <Field label="Fecha de fin" error={errorVisible('planFin')}>
              <Input
                type="date"
                value={planFin}
                min={planInicio || undefined}
                onChange={(e) => {
                  setPlanFin(e.target.value);
                  marcarTocado('planFin');
                }}
                onBlur={() => marcarTocado('planFin')}
                aria-invalid={errorVisible('planFin') ? true : undefined}
              />
            </Field>
            <Field label="Calorías diarias" error={errorVisible('planCalorias')}>
              <Input
                type="number"
                min={500}
                max={10000}
                value={planCalorias}
                onChange={(e) => {
                  setPlanCalorias(e.target.value);
                  marcarTocado('planCalorias');
                }}
                onBlur={() => marcarTocado('planCalorias')}
                placeholder="Ej. 1500"
                className="tabular-nums"
                aria-invalid={errorVisible('planCalorias') ? true : undefined}
              />
            </Field>
            <Field
              label="Descripción de la dieta"
              className="md:col-span-3"
              error={errorVisible('planDieta')}
            >
              <Textarea
                rows={3}
                value={planDieta}
                onChange={(e) => {
                  setPlanDieta(e.target.value);
                  marcarTocado('planDieta');
                }}
                onBlur={() => marcarTocado('planDieta')}
                placeholder="Ej. Desayuno: avena con fruta; comida: pollo a la plancha con ensalada…"
                aria-invalid={errorVisible('planDieta') ? true : undefined}
              />
            </Field>
          </div>
        </Card>
      )}

      {/* ===== Insumos usados (no aplica en las sesiones de nutrición) ===== */}
      {rol !== 'nutricion' && (
      <Card title="Insumos usados" icon={PackagePlus}>
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <p className="text-sm text-gray-500">
            {rol === 'enfermeria'
              ? 'Opcionales. Solo insumos y medicamentos comunes: se descuentan del inventario al guardar. Los medicamentos especiales no aplican en consultas de enfermería.'
              : rol === 'odontologia'
                ? 'Opcionales. Medicamentos (común y especial) e insumos dentales: se descuentan del inventario al guardar.'
                : 'Opcionales. Se descuentan del inventario al guardar la consulta. Los medicamentos agotados no están disponibles.'}
          </p>
          <Button
            variant="secondary"
            icon={PackagePlus}
            onClick={agregarInsumo}
            type="button"
            disabled={opcionesInsumo.length === 0}
          >
            Agregar insumo
          </Button>
        </div>

        {/* Alergias del paciente: bloqueo de lo que las provoca y alternativas */}
        {alergiasPaciente.length > 0 && (
          <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            <p className="flex items-center gap-2 font-semibold">
              <ShieldAlert size={16} aria-hidden="true" />
              Alergias registradas: {alergiasPaciente.join(', ')}.
            </p>
            <p className="mt-1">
              Los medicamentos que coincidan con estas alergias no se pueden dispensar.
              {medicamentosSugeridos.length > 0
                ? ` Alternativas disponibles: ${medicamentosSugeridos
                    .map((m) => m.nombre)
                    .join(' · ')}.`
                : ' Por ahora no hay alternativas disponibles en el inventario.'}
            </p>
          </div>
        )}

        {opcionesInsumo.length === 0 && (
          <p className="mb-4 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
            {medicamentos.length === 0
              ? 'No hay medicamentos registrados en el inventario. Da de alta en el panel de administración (Medicamentos) para poder usarlos como insumos.'
              : medicamentosDisponibles.length === 0
                ? 'Los medicamentos del inventario están agotados y no están disponibles para consultas.'
                : 'Ya agregaste como insumo todos los medicamentos disponibles.'}
          </p>
        )}

        {insumos.length === 0 ? (
          <p className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 text-sm text-gray-600">
            Sin insumos registrados en esta atención.
          </p>
        ) : (
          <ul className="space-y-3">
            {insumos.map((renglon, indice) => {
              const medicamento = medicamentos.find((m) => m.id === Number(renglon.medicamentoId));
              return (
                <li
                  key={indice}
                  className="rounded-xl border border-gray-200 p-4 grid grid-cols-1 md:grid-cols-[2fr_1fr_auto] gap-3 items-start"
                >
                  <Field label="Medicamento" error={erroresInsumos[indice]?.medicamento || undefined}>
                    <Select
                      value={renglon.medicamentoId}
                      onChange={(e) => cambiarInsumo(indice, { medicamentoId: e.target.value })}
                      aria-label={`Medicamento del insumo ${indice + 1}`}
                      aria-invalid={erroresInsumos[indice]?.medicamento ? true : undefined}
                    >
                      <option value="">Selecciona un medicamento…</option>
                      {medicamentos
                        .filter((m) => m.id === Number(renglon.medicamentoId) || !yaAgregados.includes(m.id))
                        .map((m) => {
                          const alergia = alergiaEnConflicto(m.nombre, alergiasPaciente);
                          return (
                            <option
                              key={m.id}
                              value={m.id}
                              disabled={!m.disponible || Boolean(alergia)}
                            >
                              {m.nombre} · {m.stock} {m.abreviatura || m.unidad}
                              {!m.disponible
                                ? ' — Agotado'
                                : alergia
                                  ? ` — No disponible: alergia registrada (${alergia})`
                                  : ''}
                            </option>
                          );
                        })}
                    </Select>
                  </Field>
                  <Field
                    label="Cantidad"
                    error={erroresInsumos[indice]?.cantidad || undefined}
                    hint={medicamento ? `Disponible: ${medicamento.stock}` : undefined}
                  >
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={renglon.cantidad}
                      onChange={(e) => cambiarInsumo(indice, { cantidad: e.target.value })}
                      className="tabular-nums"
                      aria-label={`Cantidad del insumo ${indice + 1}`}
                      aria-invalid={erroresInsumos[indice]?.cantidad ? true : undefined}
                    />
                  </Field>
                  <div className="md:pt-8">
                    <IconButton
                      icon={Trash2}
                      label={`Quitar insumo ${indice + 1}`}
                      tone="danger"
                      onClick={() => quitarInsumo(indice)}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
      )}

      {(errorGeneral || hayErrores) && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          <CircleAlert size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>
            {errorGeneral ||
              'Revisa los campos marcados antes de guardar: hay datos inválidos o incompletos.'}
          </span>
        </div>
      )}

      <div className="flex justify-end gap-4 pb-10">
        <Button variant="secondary" icon={X} onClick={onCancelar} disabled={guardando}>
          Cancelar
        </Button>
        <Button type="submit" icon={Save} loading={guardando} disabled={guardando}>
          Guardar atención
        </Button>
      </div>

      {/* Confirmación antes de registrar la atención */}
      {confirmar && (
        <Modal
          titulo={`¿Registrar la atención de ${expediente.nombre}?`}
          descripcion="Se guardará la consulta con estado de atención directa."
          icono={ClipboardPlus}
          onCerrar={() => setConfirmar(false)}
          acciones={
            <>
              <Button variant="secondary" onClick={() => setConfirmar(false)}>
                Seguir revisando
              </Button>
              <Button icon={Save} onClick={() => void ejecutarGuardado()}>
                Sí, registrar
              </Button>
            </>
          }
        >
          <p className="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-600">
            {rol === 'enfermeria'
              ? `Intervención: ${intervencionEnfermeria.trim() || '—'}`
              : rol === 'nutricion'
                ? `Diagnóstico nutricional: ${diagnostico.trim() || '—'} · Plan: ${planCalorias || '—'} kcal/día`
                : `Diagnóstico: ${diagnostico.trim() || '—'}`}
            {rol !== 'nutricion' && insumos.length > 0 && ` · Insumos: ${insumos.length}`}
          </p>
        </Modal>
      )}
    </form>
  );
}
