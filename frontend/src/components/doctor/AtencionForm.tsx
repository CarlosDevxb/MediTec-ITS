import React, { useEffect, useMemo, useState } from 'react';
import {
  ClipboardPlus,
  HeartPulse,
  Stethoscope,
  PackagePlus,
  Save,
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
  fechaCorta,
  type Cita,
  type DatosAtencion,
  type ExpedientePaciente,
} from '../../services/atencion.service';

/* ============================================================
   FORMULARIO DE ATENCIÓN · Signos vitales, consulta e insumos

   Regla central del sistema: toda consulta deriva de una cita.
   - Sin cita previa (atención directa): el formulario llena el
     motivo de la atención y el sistema crea primero la auto-cita
     'Atención directa' antes de guardar la consulta.
   - Con cita agendada: la consulta se liga a esa cita.

   La validación es en tiempo real (campos requeridos, rangos de
   signos vitales y cantidad de insumos contra el stock).
   ============================================================ */

export interface AtencionFormProps {
  expediente: ExpedientePaciente;
  /** Cita agendada que se atiende; si no viene, es atención directa */
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
  campo: 'motivo' | 'sintomas' | 'diagnostico' | 'tratamiento' | 'ta' | 'fc' | 'fr' | 'temp' | 'peso' | 'talla',
  valores: Record<string, string>,
  esAtencionDirecta: boolean,
): string {
  const texto = (clave: string) => (valores[clave] ?? '').trim();
  switch (campo) {
    case 'motivo':
      if (!esAtencionDirecta) return '';
      if (!texto('motivo')) return 'Indica el motivo de la atención (se registra en la cita).';
      return texto('motivo').length > 255 ? 'El motivo no puede exceder 255 caracteres.' : '';
    case 'sintomas':
      if (!texto('sintomas')) return 'Describe los síntomas.';
      return texto('sintomas').length > 2000 ? 'Los síntomas no pueden exceder 2000 caracteres.' : '';
    case 'diagnostico':
      if (!texto('diagnostico')) return 'El diagnóstico es obligatorio.';
      return texto('diagnostico').length > 255 ? 'El diagnóstico no puede exceder 255 caracteres.' : '';
    case 'tratamiento':
      if (!texto('tratamiento')) return 'El tratamiento es obligatorio.';
      return texto('tratamiento').length > 2000 ? 'El tratamiento no puede exceder 2000 caracteres.' : '';
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
  const [peso, setPeso] = useState('');
  const [talla, setTalla] = useState('');
  /* Consulta */
  const [sintomas, setSintomas] = useState('');
  const [exploracion, setExploracion] = useState('');
  const [diagnostico, setDiagnostico] = useState('');
  const [tratamiento, setTratamiento] = useState('');
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

  const valores = { motivo, sintomas, diagnostico, tratamiento, ta, fc, fr, temp, peso, talla };

  /* ---------- Errores vivos: se recalculan en cada tecla ---------- */
  const errores = useMemo(() => {
    const calculados: Record<string, string> = {};
    for (const campo of [
      'motivo',
      'sintomas',
      'diagnostico',
      'tratamiento',
      'ta',
      'fc',
      'fr',
      'temp',
      'peso',
      'talla',
    ] as const) {
      calculados[campo] = errorDeCampo(campo, valores, esAtencionDirecta);
    }
    return calculados;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [motivo, sintomas, diagnostico, tratamiento, ta, fc, fr, temp, peso, talla, esAtencionDirecta]);

  /** Avisos de los renglones de insumos (cantidad contra stock) */
  const erroresInsumos = useMemo(
    () =>
      insumos.map((renglon) => {
        const medicamento = medicamentos.find((m) => m.id === Number(renglon.medicamentoId));
        if (!renglon.medicamentoId) return 'Selecciona un medicamento.';
        if (!medicamento) return 'El medicamento ya no está en el inventario.';
        if (!medicamento.disponible) return `"${medicamento.nombre}" está agotado.`;
        const cantidad = Number(renglon.cantidad);
        if (!renglon.cantidad || Number.isNaN(cantidad) || cantidad <= 0) {
          return 'La cantidad debe ser mayor a cero.';
        }
        if (cantidad > medicamento.stock) {
          return `Solo quedan ${medicamento.stock} ${medicamento.abreviatura || medicamento.unidad}.`;
        }
        return '';
      }),
    [insumos, medicamentos],
  );

  const errorVisible = (campo: string): string | undefined => {
    const propio = errores[campo];
    if (propio) return tocado[campo] ? propio : erroresServidor[campo] || undefined;
    return erroresServidor[campo] || undefined;
  };

  const hayErrores =
    Object.values(errores).some(Boolean) || erroresInsumos.some(Boolean);
  const marcarTocado = (campo: string) => setTocado((prev) => ({ ...prev, [campo]: true }));

  /* ---------- Insumos ---------- */
  const medicamentosDisponibles = medicamentos.filter((m) => m.disponible);
  const yaAgregados = insumos.map((renglon) => Number(renglon.medicamentoId));
  const opcionesInsumo = medicamentosDisponibles.filter((m) => !yaAgregados.includes(m.id));

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
        sintomas: sintomas.trim(),
        exploracion: exploracion.trim() || undefined,
        diagnostico: diagnostico.trim(),
        tratamiento: tratamiento.trim(),
        ...(conSignos ? { signosVitales: signos } : {}),
        insumos: insumos
          .filter((renglon) => renglon.medicamentoId && Number(renglon.cantidad) > 0)
          .map((renglon) => ({
            medicamentoId: Number(renglon.medicamentoId),
            cantidad: Number(renglon.cantidad),
          })),
      });
    } catch (error) {
      // Errores del servidor pintados en su campo (400) o como resumen (409 / red)
      const porCampo = detallesDe(error);
      if (Object.keys(porCampo).length > 0) setErroresServidor(porCampo);
      else setErrorGeneral(mensajeDeError(error));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      {/* ===== Datos de la atención (la cita) ===== */}
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
                Al guardar se registrará primero la cita de atención directa (hoy, en este
                momento) y enseguida la consulta.
              </p>
            </div>
            <Field
              label="Motivo de la atención"
              error={errorVisible('motivo')}
              hint="Se registra como el motivo de la cita. Máximo 255 caracteres."
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
          <Field label="Peso (kg)" error={errorVisible('peso')}>
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
          <Field label="Talla (m)" error={errorVisible('talla')}>
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

      {/* ===== Consulta ===== */}
      <Card title="Consulta" icon={Stethoscope}>
        <div className="space-y-4">
          <Field label="Síntomas" error={errorVisible('sintomas')}>
            <Textarea
              rows={3}
              value={sintomas}
              onChange={(e) => {
                setSintomas(e.target.value);
                marcarTocado('sintomas');
              }}
              onBlur={() => marcarTocado('sintomas')}
              placeholder="Describe los síntomas que refiere el paciente al momento de la atención…"
              aria-invalid={errorVisible('sintomas') ? true : undefined}
            />
          </Field>
          <Field label="Exploración" hint="Opcional." error={errorVisible('exploracion')}>
            <Textarea
              rows={3}
              value={exploracion}
              onChange={(e) => setExploracion(e.target.value)}
              placeholder="Hallazgos de la exploración física…"
            />
          </Field>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Diagnóstico" error={errorVisible('diagnostico')}>
              <Input
                value={diagnostico}
                onChange={(e) => {
                  setDiagnostico(e.target.value);
                  marcarTocado('diagnostico');
                }}
                onBlur={() => marcarTocado('diagnostico')}
                placeholder="Ej. Gastroenteritis aguda"
                maxLength={255}
                aria-invalid={errorVisible('diagnostico') ? true : undefined}
              />
            </Field>
            <Field label="Tratamiento" error={errorVisible('tratamiento')}>
              <Input
                value={tratamiento}
                onChange={(e) => {
                  setTratamiento(e.target.value);
                  marcarTocado('tratamiento');
                }}
                onBlur={() => marcarTocado('tratamiento')}
                placeholder="Ej. Hidratación y dieta blanda por 3 días"
                aria-invalid={errorVisible('tratamiento') ? true : undefined}
              />
            </Field>
          </div>
        </div>
      </Card>

      {/* ===== Insumos usados ===== */}
      <Card title="Insumos usados" icon={PackagePlus}>
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <p className="text-sm text-gray-500">
            Opcionales. Se descuentan del inventario al guardar la consulta. Los medicamentos
            agotados no están disponibles.
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

        {medicamentos.length > 0 && opcionesInsumo.length === 0 && insumos.length > 0 && (
          <p className="mb-4 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
            Ya agregaste todos los medicamentos disponibles (o los que quedan están agotados).
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
                  <Field label="Medicamento">
                    <Select
                      value={renglon.medicamentoId}
                      onChange={(e) => cambiarInsumo(indice, { medicamentoId: e.target.value })}
                      aria-label={`Medicamento del insumo ${indice + 1}`}
                    >
                      <option value="">Selecciona un medicamento…</option>
                      {medicamentos
                        .filter((m) => m.id === Number(renglon.medicamentoId) || !yaAgregados.includes(m.id))
                        .map((m) => (
                          <option key={m.id} value={m.id} disabled={!m.disponible}>
                            {m.nombre} · {m.stock} {m.abreviatura || m.unidad}
                            {m.disponible ? '' : ' — Agotado'}
                          </option>
                        ))}
                    </Select>
                  </Field>
                  <Field
                    label="Cantidad"
                    error={erroresInsumos[indice] || undefined}
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
                      aria-invalid={erroresInsumos[indice] ? true : undefined}
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
          descripcion={
            citaInicial
              ? 'Se guardará la consulta ligada a la cita agendada.'
              : 'Se registrará primero la cita de atención directa y enseguida la consulta.'
          }
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
            Diagnóstico: {diagnostico.trim() || '—'}
            {insumos.length > 0 && ` · Insumos: ${insumos.length}`}
          </p>
        </Modal>
      )}
    </form>
  );
}
