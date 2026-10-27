import React, { useEffect, useMemo, useState } from 'react';
import { ClipboardPlus, Save, X, CircleAlert, Plus, CheckCircle2 } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import IconButton from '../ui/IconButton';
import { Field, Input, Select, Textarea } from '../ui/Input';
import { detallesDe, mensajeDeError } from '../../services/api';
import { listarValoresCatalogo } from '../../services/administracion.service';
import {
  guardarCuestionario,
  errorNombreClinico,
  normalizarNombre,
  normalizarNombreClinico,
  TIPOS_SANGRE,
  type DatosCuestionario,
  type ExpedientePaciente,
} from '../../services/atencion.service';

/* ============================================================
   CUESTIONARIO DE SALUD · Inicial y único por paciente

   Se llena de dos formas:
   1. Al primer acceso del paciente a su portal.
   2. Antes de su primera consulta cuando llega de manera
      directa: lo completa el personal clínico.

   Las alergias y las enfermedades crónicas se capturan como
   listas de nombres: los que no existan en los catálogos se dan
   de alta al guardar y se vinculan al paciente para que aparezcan
   como alertas en la atención.
   ============================================================ */

const ACTIVIDADES = ['Ninguna', 'Leve', 'Moderada', 'Intensa'];
const TABACO = ['Nunca', 'Ex-fumador', 'Fumador'];
const ALCOHOL = ['Nunca', 'Ocasional', 'Frecuente'];

export interface CuestionarioSaludProps {
  expediente: ExpedientePaciente;
  /** 'consulta': antes de atender · 'directo': gestión del paciente ·
   *  'portal': primer acceso del paciente a su portal */
  contexto?: 'consulta' | 'directo' | 'portal';
  guardando?: boolean;
  onGuardado: (expediente: ExpedientePaciente) => void;
  onCancelar?: () => void;
}

/* ---------------- Campo de conceptos (alergias / enfermedades) ---------------- */

function CampoConceptos({
  etiqueta,
  hint,
  opciones,
  valores,
  onChange,
  clave,
  error,
}: {
  etiqueta: string;
  hint: string;
  opciones: string[];
  valores: string[];
  onChange: (nuevos: string[]) => void;
  clave: string;
  /** Error de la lista completa (valores inválidos o rechazados por el servidor) */
  error?: string;
}) {
  const [texto, setTexto] = useState('');

  // Validación en vivo: el mismo criterio que el servidor (nombre clínico)
  const problema = texto.trim() ? errorNombreClinico(texto) : '';

  const agregar = () => {
    const nombre = normalizarNombreClinico(texto);
    // La validación ocurre al darle a Agregar: si el nombre no es válido no
    // entra a la lista y el aviso ya está visible junto al campo
    if (!nombre || errorNombreClinico(nombre)) return;
    // Si el concepto ya existe en el catálogo escrito distinto, se usa su nombre
    const existente = opciones.find(
      (opcion) => normalizarNombre(opcion) === normalizarNombre(nombre),
    );
    const definitivo = existente ?? nombre;
    if (!valores.some((valor) => normalizarNombre(valor) === normalizarNombre(definitivo))) {
      onChange([...valores, definitivo]);
    }
    setTexto('');
  };

  return (
    <div>
      <span className="block text-base font-semibold text-gray-700 mb-1.5">{etiqueta}</span>
      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            list={`opciones-${clave}`}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                agregar();
              }
            }}
            placeholder="Escribe o selecciona y presiona Agregar…"
            aria-label={etiqueta}
            aria-invalid={problema ? true : undefined}
            maxLength={100}
          />
          <datalist id={`opciones-${clave}`}>
            {opciones
              .filter(
                (opcion) =>
                  !valores.some((v) => normalizarNombre(v) === normalizarNombre(opcion)),
              )
              .map((opcion) => (
                <option key={opcion} value={opcion} />
              ))}
          </datalist>
        </div>
        <Button
          variant="secondary"
          icon={Plus}
          onClick={agregar}
          type="button"
          disabled={!texto.trim()}
        >
          Agregar
        </Button>
      </div>

      {problema && (
        <p className="text-xs text-red-600 mt-1 font-medium" role="alert">
          {problema}
        </p>
      )}

      {valores.length > 0 ? (
        <ul className="flex flex-wrap gap-2 mt-3">
          {valores.map((valor) => {
            const esNuevo = !opciones.some(
              (opcion) => normalizarNombre(opcion) === normalizarNombre(valor),
            );
            return (
              <li
                key={valor}
                className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-sm text-brand-800"
              >
                {valor}
                {esNuevo && <span className="text-xs text-brand-600">(nuevo)</span>}
                <button
                  type="button"
                  onClick={() =>
                    onChange(valores.filter((v) => normalizarNombre(v) !== normalizarNombre(valor)))
                  }
                  aria-label={`Quitar ${valor}`}
                  className="text-brand-500 hover:text-brand-800 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/40"
                >
                  ✕
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-xs text-gray-400 mt-2">Ninguno registrado.</p>
      )}

      {error && (
        <p className="text-xs text-red-600 mt-2 font-medium" role="alert">
          {error}
        </p>
      )}
      <p className="text-xs text-gray-400 mt-2">{hint}</p>
    </div>
  );
}

/* ---------------- Cuestionario ---------------- */

export default function CuestionarioSalud({
  expediente,
  contexto = 'directo',
  guardando = false,
  onGuardado,
  onCancelar,
}: CuestionarioSaludProps) {
  const cuestionario = expediente.cuestionario;

  /** Tipo de sangre (dato del expediente que se captura en el cuestionario) */
  const [tipoSangre, setTipoSangre] = useState(expediente.tipoSangre ?? '');
  const [peso, setPeso] = useState(cuestionario?.peso != null ? String(cuestionario.peso) : '');
  const [talla, setTalla] = useState(cuestionario?.talla != null ? String(cuestionario.talla) : '');
  const [medicamentosActuales, setMedicamentosActuales] = useState(
    cuestionario?.medicamentosActuales ?? '',
  );
  const [cirugiasPrevias, setCirugiasPrevias] = useState(cuestionario?.cirugiasPrevias ?? '');
  const [alergias, setAlergias] = useState<string[]>(expediente.alergias);
  const [alergiaOtra, setAlergiaOtra] = useState(cuestionario?.alergiaOtra ?? '');
  const [enfermedades, setEnfermedades] = useState<string[]>(expediente.enfermedades);
  const [enfermedadOtra, setEnfermedadOtra] = useState(cuestionario?.enfermedadOtra ?? '');
  const [actividadFisica, setActividadFisica] = useState(cuestionario?.actividadFisica ?? '');
  const [tabaco, setTabaco] = useState(cuestionario?.tabaco ?? '');
  const [alcohol, setAlcohol] = useState(cuestionario?.alcohol ?? '');
  const [horasSueno, setHorasSueno] = useState(
    cuestionario?.horasSueno != null ? String(cuestionario.horasSueno) : '',
  );
  const [sintomasActuales, setSintomasActuales] = useState(cuestionario?.sintomasActuales ?? '');
  const [comentarios, setComentarios] = useState(cuestionario?.comentarios ?? '');

  /** Opciones de los catálogos (alergias y enfermedades registradas) */
  const [opcionesAlergias, setOpcionesAlergias] = useState<string[]>([]);
  const [opcionesEnfermedades, setOpcionesEnfermedades] = useState<string[]>([]);

  const [tocado, setTocado] = useState<Record<string, boolean>>({});
  const [erroresServidor, setErroresServidor] = useState<Record<string, string>>({});
  const [errorGeneral, setErrorGeneral] = useState('');
  /** Guardado propio del formulario (además del estado que pase el padre) */
  const [guardandoInterno, setGuardandoInterno] = useState(false);

  useEffect(() => {
    let vigente = true;
    Promise.all([
      listarValoresCatalogo('alergias').catch(() => []),
      listarValoresCatalogo('enfermedades').catch(() => []),
    ]).then(([listaAlergias, listaEnfermedades]) => {
      if (!vigente) return;
      setOpcionesAlergias(listaAlergias.map((valor) => valor.nombre));
      setOpcionesEnfermedades(listaEnfermedades.map((valor) => valor.nombre));
    });
    return () => {
      vigente = false;
    };
  }, []);

  /* ---------- Validación en tiempo real ---------- */
  const errores = useMemo(() => {
    const calculados: Record<string, string> = {};

    const validarMedida = (
      texto: string,
      requerido: boolean,
      minimo: number,
      maximo: number,
      etiqueta: string,
      unidad: string,
    ) => {
      const valor = texto.trim();
      if (!valor) return requerido ? `Indica ${etiqueta}.` : '';
      const numero = Number(valor);
      if (Number.isNaN(numero)) return `${etiqueta} debe ser un número.`;
      if (numero < minimo || numero > maximo) {
        return `${etiqueta} debe estar entre ${minimo} y ${maximo} ${unidad}.`;
      }
      return '';
    };

    calculados.peso = validarMedida(peso, true, 0.5, 500, 'el peso', 'kg');
    calculados.talla = validarMedida(talla, true, 0.3, 2.5, 'la talla', 'm');
    calculados.actividadFisica = actividadFisica ? '' : 'Selecciona el nivel de actividad física.';
    calculados.tabaco = tabaco ? '' : 'Selecciona el consumo de tabaco.';
    calculados.alcohol = alcohol ? '' : 'Selecciona el consumo de alcohol.';
    calculados.horasSueno = validarMedida(horasSueno, false, 0, 24, 'las horas de sueño', 'horas');
    calculados.medicamentosActuales =
      medicamentosActuales.length > 2000
        ? 'Los medicamentos actuales no pueden exceder 2000 caracteres.'
        : '';
    calculados.cirugiasPrevias =
      cirugiasPrevias.length > 2000 ? 'Las cirugías previas no pueden exceder 2000 caracteres.' : '';
    calculados.sintomasActuales =
      sintomasActuales.length > 2000 ? 'Los síntomas actuales no pueden exceder 2000 caracteres.' : '';
    calculados.comentarios =
      comentarios.length > 2000 ? 'Los comentarios no pueden exceder 2000 caracteres.' : '';
    calculados.alergiaOtra =
      alergiaOtra.length > 100 ? 'La otra alergia no puede exceder 100 caracteres.' : '';
    calculados.enfermedadOtra =
      enfermedadOtra.length > 100 ? 'La otra enfermedad no puede exceder 100 caracteres.' : '';
    // Las listas también se validan: un valor ya vinculado con formato inválido
    // (por ejemplo, capturado antes de existir la regla) no debe bloquear el
    // guardado en silencio
    const nombreInvalido = (nombres: string[]) =>
      nombres.find((nombre) => errorNombreClinico(nombre)) ?? '';
    const alergiaInvalida = nombreInvalido(alergias);
    calculados.alergias = alergiaInvalida
      ? `«${alergiaInvalida}» no tiene un formato válido: quítalo de la lista o corrígelo en Catálogos.`
      : '';
    const enfermedadInvalida = nombreInvalido(enfermedades);
    calculados.enfermedades = enfermedadInvalida
      ? `«${enfermedadInvalida}» no tiene un formato válido: quítalo de la lista o corrígelo en Catálogos.`
      : '';
    return calculados;
  }, [
    peso,
    talla,
    actividadFisica,
    tabaco,
    alcohol,
    horasSueno,
    medicamentosActuales,
    cirugiasPrevias,
    sintomasActuales,
    comentarios,
    alergiaOtra,
    enfermedadOtra,
    alergias,
    enfermedades,
  ]);

  const errorVisible = (campo: string): string | undefined => {
    const propio = errores[campo];
    if (propio) return tocado[campo] ? propio : erroresServidor[campo] || undefined;
    return erroresServidor[campo] || undefined;
  };
  const hayErrores = Object.values(errores).some(Boolean);
  const marcarTocado = (campo: string) => setTocado((prev) => ({ ...prev, [campo]: true }));

  /* ---------- Guardado ---------- */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTocado({
      peso: true,
      talla: true,
      actividadFisica: true,
      tabaco: true,
      alcohol: true,
      horasSueno: true,
      alergias: true,
      enfermedades: true,
    });
    setErroresServidor({});
    setErrorGeneral('');
    if (hayErrores) return;

    const datos: DatosCuestionario = {
      tipoSangre: tipoSangre || undefined,
      peso: Number(peso),
      talla: Number(talla),
      actividadFisica: actividadFisica as DatosCuestionario['actividadFisica'],
      tabaco: tabaco as DatosCuestionario['tabaco'],
      alcohol: alcohol as DatosCuestionario['alcohol'],
      medicamentosActuales: medicamentosActuales.trim() || undefined,
      cirugiasPrevias: cirugiasPrevias.trim() || undefined,
      alergiaOtra: alergiaOtra.trim() || undefined,
      enfermedadOtra: enfermedadOtra.trim() || undefined,
      horasSueno: horasSueno.trim() ? Number(horasSueno) : undefined,
      sintomasActuales: sintomasActuales.trim() || undefined,
      comentarios: comentarios.trim() || undefined,
      alergias,
      enfermedades,
    };

    try {
      setGuardandoInterno(true);
      onGuardado(await guardarCuestionario(expediente.id, datos));
    } catch (error) {
      const porCampo = detallesDe(error);
      if (Object.keys(porCampo).length > 0) setErroresServidor(porCampo);
      else setErrorGeneral(mensajeDeError(error));
    } finally {
      setGuardandoInterno(false);
    }
  };

  const ocupado = guardando || guardandoInterno;

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="entrada space-y-6" noValidate>
      {/* Aviso del contexto */}
      <p
        className={
          contexto === 'consulta'
            ? 'flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900'
            : 'flex items-start gap-2.5 rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-800'
        }
      >
        <ClipboardPlus size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
        {contexto === 'consulta'
          ? `Antes de registrar la consulta, completa el cuestionario de salud de ${expediente.nombre}. Es único por paciente y sus alergias y enfermedades quedarán como alertas de atención.`
          : contexto === 'portal'
            ? `Bienvenido(a), ${expediente.nombre}. Antes de entrar a tu portal, completa tu cuestionario de salud inicial: es único por paciente y ayuda a que tu atención sea mejor.`
            : `Cuestionario de salud de ${expediente.nombre}. Es único por paciente: al guardarlo se actualiza el anterior.`}
      </p>

      {/* Datos básicos */}
      <Card title="Datos básicos" icon={CheckCircle2}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field
            label="Tipo de sangre"
            hint="Si lo dejas en 'Sin registrar', se conserva el que ya tenga el expediente."
          >
            <Select value={tipoSangre} onChange={(e) => setTipoSangre(e.target.value)}>
              <option value="">Sin registrar</option>
              {TIPOS_SANGRE.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {tipo}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Peso (kg)" error={errorVisible('peso')} hint="Obligatorio.">
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
              placeholder="Ej. 70.5"
              className="tabular-nums"
              aria-invalid={errorVisible('peso') ? true : undefined}
            />
          </Field>
          <Field label="Talla (m)" error={errorVisible('talla')} hint="Obligatorio.">
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
              placeholder="Ej. 1.70"
              className="tabular-nums"
              aria-invalid={errorVisible('talla') ? true : undefined}
            />
          </Field>
        </div>
      </Card>

      {/* Salud actual */}
      <Card title="Salud actual" icon={ClipboardPlus}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              label="Medicamentos actuales"
              hint="Opcional. Sepáralos con comas."
              error={errorVisible('medicamentosActuales')}
            >
              <Textarea
                rows={2}
                value={medicamentosActuales}
                onChange={(e) => setMedicamentosActuales(e.target.value)}
                placeholder="Ej. Losartán 50 mg cada 24 h"
              />
            </Field>
            <Field
              label="Cirugías previas"
              hint="Opcional."
              error={errorVisible('cirugiasPrevias')}
            >
              <Textarea
                rows={2}
                value={cirugiasPrevias}
                onChange={(e) => setCirugiasPrevias(e.target.value)}
                placeholder="Ej. Apendicectomía en 2018"
              />
            </Field>
          </div>

          <CampoConceptos
            clave="alergias"
            etiqueta="Alergias"
            hint="Selecciona las registradas o escribe una nueva: al guardar se agrega al catálogo y queda ligada al paciente."
            opciones={opcionesAlergias}
            valores={alergias}
            onChange={setAlergias}
            error={errores.alergias || erroresServidor['alergias']}
          />
          <Field
            label="Otra alergia (detalle)"
            hint="Opcional. Para detalles que no apliquen como concepto aparte."
            error={errorVisible('alergiaOtra')}
          >
            <Input
              value={alergiaOtra}
              onChange={(e) => setAlergiaOtra(e.target.value)}
              placeholder="Ej. Reacción leve a picaduras"
              maxLength={100}
            />
          </Field>

          <CampoConceptos
            clave="enfermedades"
            etiqueta="Enfermedades crónicas"
            hint="Selecciona las registradas o escribe una nueva: al guardar se agrega al catálogo y queda ligada al paciente."
            opciones={opcionesEnfermedades}
            valores={enfermedades}
            onChange={setEnfermedades}
            error={errores.enfermedades || erroresServidor['enfermedades']}
          />
          <Field
            label="Otra enfermedad (detalle)"
            hint="Opcional."
            error={errorVisible('enfermedadOtra')}
          >
            <Input
              value={enfermedadOtra}
              onChange={(e) => setEnfermedadOtra(e.target.value)}
              placeholder="Ej. Control periódico por riesgo familiar"
              maxLength={100}
            />
          </Field>

          <Field
            label="Síntomas actuales"
            hint="Opcional. Lo que refiere el paciente al momento de llenar."
            error={errorVisible('sintomasActuales')}
          >
            <Textarea
              rows={2}
              value={sintomasActuales}
              onChange={(e) => setSintomasActuales(e.target.value)}
              placeholder="Ej. Dolor de cabeza ocasional"
            />
          </Field>
        </div>
      </Card>

      {/* Hábitos */}
      <Card title="Hábitos" icon={CheckCircle2}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Field label="Actividad física" error={errorVisible('actividadFisica')} hint="Obligatorio.">
            <Select
              value={actividadFisica}
              onChange={(e) => {
                setActividadFisica(e.target.value);
                marcarTocado('actividadFisica');
              }}
              onBlur={() => marcarTocado('actividadFisica')}
              aria-invalid={errorVisible('actividadFisica') ? true : undefined}
            >
              <option value="">Selecciona…</option>
              {ACTIVIDADES.map((opcion) => (
                <option key={opcion} value={opcion}>
                  {opcion}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Tabaco" error={errorVisible('tabaco')} hint="Obligatorio.">
            <Select
              value={tabaco}
              onChange={(e) => {
                setTabaco(e.target.value);
                marcarTocado('tabaco');
              }}
              onBlur={() => marcarTocado('tabaco')}
              aria-invalid={errorVisible('tabaco') ? true : undefined}
            >
              <option value="">Selecciona…</option>
              {TABACO.map((opcion) => (
                <option key={opcion} value={opcion}>
                  {opcion}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Alcohol" error={errorVisible('alcohol')} hint="Obligatorio.">
            <Select
              value={alcohol}
              onChange={(e) => {
                setAlcohol(e.target.value);
                marcarTocado('alcohol');
              }}
              onBlur={() => marcarTocado('alcohol')}
              aria-invalid={errorVisible('alcohol') ? true : undefined}
            >
              <option value="">Selecciona…</option>
              {ALCOHOL.map((opcion) => (
                <option key={opcion} value={opcion}>
                  {opcion}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Horas de sueño" error={errorVisible('horasSueno')} hint="Opcional (0 a 24).">
            <Input
              type="number"
              min={0}
              max={24}
              value={horasSueno}
              onChange={(e) => {
                setHorasSueno(e.target.value);
                marcarTocado('horasSueno');
              }}
              onBlur={() => marcarTocado('horasSueno')}
              placeholder="Ej. 7"
              className="tabular-nums"
              aria-invalid={errorVisible('horasSueno') ? true : undefined}
            />
          </Field>
        </div>

        <Field
          label="Comentarios"
          className="mt-4"
          hint="Opcional. Cualquier otra información relevante."
          error={errorVisible('comentarios')}
        >
          <Textarea
            rows={2}
            value={comentarios}
            onChange={(e) => setComentarios(e.target.value)}
            placeholder="Ej. Refiere estrés por exámenes"
          />
        </Field>
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
        {onCancelar && (
          <Button variant="secondary" icon={X} onClick={onCancelar} disabled={ocupado} type="button">
            Cancelar
          </Button>
        )}
        <Button type="submit" icon={Save} loading={ocupado} disabled={ocupado}>
          Guardar cuestionario
        </Button>
      </div>
    </form>
  );
}
