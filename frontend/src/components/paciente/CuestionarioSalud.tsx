import React, { useState } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Send,
  Scale,
  CheckCircle2,
  Pencil,
} from 'lucide-react';
import PageHeader from '../ui/PageHeader';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { Field, Input, Select, Textarea } from '../ui/Input';
import { fechaCorta, TIPOS_SANGRE, type Paciente, type TipoSangre } from '../clinica/datos';

/* ============================================================
   CUESTIONARIO DE SALUD INICIAL · Wizard del portal del
   paciente. Captura: datos básicos, alergias, medicamentos,
   antecedentes, hábitos y síntomas. Solo front (demo).
   ============================================================ */

const PASOS = [
  'Datos básicos',
  'Alergias y medicamentos',
  'Antecedentes',
  'Hábitos y síntomas',
  'Resumen',
];

const ALERGIAS = [
  'Penicilina',
  'Látex',
  'Anestésicos dentales',
  'Yodo',
  'Ibuprofeno',
  'Aspirina',
  'Mariscos',
  'Polen',
];

const ENFERMEDADES = [
  'Ninguna',
  'Diabetes',
  'Hipertensión',
  'Asma',
  'Enfermedad cardíaca',
  'Problemas de tiroides',
  'Trastorno de coagulación',
  'Epilepsia',
];

const SINTOMAS = [
  'Ninguno',
  'Dolor',
  'Fiebre',
  'Mareos',
  'Náuseas',
  'Palpitaciones',
  'Fatiga',
  'Pérdida de peso',
];

interface Respuestas {
  peso: string;
  talla: string;
  tipoSangre: TipoSangre;
  alergias: string[];
  alergiaOtra: string;
  medicamentos: string;
  enfermedades: string[];
  enfermedadOtra: string;
  cirugias: string;
  actividad: string;
  tabaco: string;
  alcohol: string;
  sueno: string;
  sintomas: string[];
  comentarios: string;
}

/** Alterna un valor en la lista; "Ninguna/Ninguno" excluye al resto */
const alternar = (lista: string[], valor: string, exclusivo: string): string[] => {
  if (lista.includes(valor)) return lista.filter((v) => v !== valor);
  const base = valor === exclusivo ? [] : lista.filter((v) => v !== exclusivo);
  return [...base, valor];
};

/* Chip de selección múltiple (mismo lenguaje que los días del calendario) */
function Casilla({
  etiqueta,
  activo,
  onToggle,
}: {
  etiqueta: string;
  activo: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={activo}
      onClick={onToggle}
      className={[
        'px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/40',
        activo
          ? 'bg-brand-800 text-white border-brand-800 shadow-sm'
          : 'bg-white text-gray-600 border-gray-300 hover:border-brand-300 hover:text-brand-800',
      ].join(' ')}
    >
      {etiqueta}
    </button>
  );
}

interface Props {
  paciente: Paciente;
}

export default function CuestionarioSalud({ paciente }: Props) {
  const [paso, setPaso] = useState(0);
  const [maxPaso, setMaxPaso] = useState(0);
  const [enviado, setEnviado] = useState<string | null>(null);
  const [error, setError] = useState('');

  // Datos de prueba precargados (borrador)
  const [r, setR] = useState<Respuestas>({
    peso: '58',
    talla: '1.64',
    tipoSangre: paciente.tipoSangre,
    alergias: paciente.alergias !== 'Ninguna' ? [paciente.alergias] : [],
    alergiaOtra: '',
    medicamentos: '',
    enfermedades: ['Ninguna'],
    enfermedadOtra: '',
    cirugias: '',
    actividad: 'Leve',
    tabaco: 'Nunca',
    alcohol: 'Ocasional',
    sueno: '7',
    sintomas: ['Ninguno'],
    comentarios: '',
  });

  const set = <K extends keyof Respuestas>(clave: K, valor: Respuestas[K]) =>
    setR((prev) => ({ ...prev, [clave]: valor }));

  /* ---- IMC calculado ---- */
  const imc = (() => {
    const peso = Number(r.peso);
    const talla = Number(r.talla);
    if (!peso || !talla) return null;
    const valor = peso / (talla * talla);
    const categoria =
      valor < 18.5 ? 'Peso bajo' : valor < 25 ? 'Peso normal' : valor < 30 ? 'Sobrepeso' : 'Obesidad';
    return { valor: valor.toFixed(1), categoria };
  })();

  /* ---- Navegación ---- */
  const siguiente = () => {
    if (paso === 0) {
      if (!r.peso || !r.talla || Number(r.peso) <= 0 || Number(r.talla) <= 0) {
        setError('Captura tu peso y tu talla para continuar.');
        return;
      }
    }
    setError('');
    const nuevo = Math.min(paso + 1, PASOS.length - 1);
    setPaso(nuevo);
    setMaxPaso((m) => Math.max(m, nuevo));
  };

  const enviar = () => {
    setEnviado(
      new Date().toLocaleDateString('es-MX', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    );
  };

  const listaOTexto = (lista: string[], vacio: string) =>
    lista.length ? lista.join(', ') : vacio;

  return (
    <div className="p-8 xl:p-10 max-w-5xl mx-auto">
      <PageHeader
        title="Cuestionario de salud inicial"
        subtitle="Ayúdanos a conocer tu estado de salud antes de tu primera cita"
        meta={
          enviado ? (
            <Badge status="completed">Enviado</Badge>
          ) : (
            <Badge status="pending">Borrador</Badge>
          )
        }
      />

      {/* ============ ESTADO: ENVIADO ============ */}
      {enviado && paso < 4 && (
        <Card>
          <div className="py-8 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-brand-50 flex items-center justify-center mb-5">
              <CheckCircle2 size={34} className="text-brand-700" />
            </div>
            <h3 className="text-2xl font-semibold tracking-tight text-gray-900">
              Cuestionario enviado
            </h3>
            <p className="text-base text-gray-500 mt-2 max-w-md">
              Recibido el {enviado}. Tu equipo médico lo revisará antes de tu próxima cita.
            </p>
            <div className="flex gap-4 mt-6">
              <Button variant="secondary" onClick={() => setPaso(4)}>
                Ver mis respuestas
              </Button>
              <Button
                icon={Pencil}
                onClick={() => {
                  setEnviado(null);
                  setPaso(0);
                }}
              >
                Editar respuestas
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* ============ CUESTIONARIO ============ */}
      <div className={enviado && paso < 4 ? 'hidden' : ''}>
        
        {/* Stepper */}
        <ol className="flex items-center gap-2 mb-8 overflow-x-auto pb-2" aria-label="Progreso del cuestionario">
          {PASOS.map((nombre, i) => {
            const activo = i === paso;
            const hecho = i < paso || Boolean(enviado);
            const alcanzado = i <= maxPaso || Boolean(enviado);
            return (
              <React.Fragment key={nombre}>
                <li className="shrink-0">
                  <button
                    type="button"
                    onClick={() => alcanzado && setPaso(i)}
                    aria-current={activo ? 'step' : undefined}
                    disabled={!alcanzado}
                    className="flex items-center gap-2.5 rounded-lg px-1 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/40 disabled:cursor-not-allowed"
                  >
                    <span
                      className={[
                        'w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2',
                        activo
                          ? 'bg-brand-800 border-brand-800 text-white'
                          : hecho
                            ? 'bg-brand-50 border-brand-500 text-brand-700'
                            : 'bg-white border-gray-300 text-gray-400',
                      ].join(' ')}
                    >
                      {hecho && !activo ? <Check size={16} /> : i + 1}
                    </span>
                    <span
                      className={[
                        'text-sm font-medium whitespace-nowrap',
                        activo ? 'text-brand-800' : hecho ? 'text-gray-700' : 'text-gray-400',
                      ].join(' ')}
                    >
                      {nombre}
                    </span>
                  </button>
                </li>
                {i < PASOS.length - 1 && <li className="w-6 h-px bg-gray-200 shrink-0" />}
              </React.Fragment>
            );
          })}
        </ol>

        {/* ---- Paso 1: Datos básicos ---- */}
        {paso === 0 && (
          <Card title="Datos básicos" description="Los datos personales provienen de tu expediente.">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Nombre completo">
                <Input value={paciente.nombre} disabled className="bg-gray-50 text-gray-500" />
              </Field>
              <Field label="Número de expediente">
                <Input value={paciente.expediente} disabled className="bg-gray-50 text-gray-500 tabular-nums" />
              </Field>
              <Field label="Fecha de nacimiento">
                <Input
                  value={fechaCorta(paciente.fechaNacimiento)}
                  disabled
                  className="bg-gray-50 text-gray-500 tabular-nums"
                />
              </Field>
              <Field label="Género">
                <Input value={paciente.genero} disabled className="bg-gray-50 text-gray-500" />
              </Field>
              <Field label="Peso (kg)">
                <Input
                  type="number"
                  step="0.1"
                  value={r.peso}
                  onChange={(e) => set('peso', e.target.value)}
                  placeholder="Ej. 58.5"
                  className="tabular-nums"
                />
              </Field>
              <Field label="Talla (m)">
                <Input
                  type="number"
                  step="0.01"
                  value={r.talla}
                  onChange={(e) => set('talla', e.target.value)}
                  placeholder="Ej. 1.64"
                  className="tabular-nums"
                />
              </Field>
              <Field label="Tipo de sangre">
                <Select
                  value={r.tipoSangre}
                  onChange={(e) => set('tipoSangre', e.target.value as TipoSangre)}
                >
                  {TIPOS_SANGRE.map((tipo) => (
                    <option key={tipo} value={tipo}>
                      {tipo}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            {imc && (
              <div className="mt-5 flex items-center gap-3 bg-brand-50 border border-brand-200 text-brand-800 rounded-lg px-4 py-3 text-base">
                <Scale size={18} className="shrink-0" />
                <span>
                  <strong className="tabular-nums">IMC {imc.valor}</strong> · {imc.categoria}
                  <span className="text-sm text-brand-700"> (calculado con tu peso y talla)</span>
                </span>
              </div>
            )}
          </Card>
        )}

        {/* ---- Paso 2: Alergias y medicamentos ---- */}
        {paso === 1 && (
          <Card title="Alergias y medicamentos" description="Marca lo que aplique y describe lo demás.">
            <div className="space-y-5">
              <div>
                <p className="text-base font-semibold text-gray-700 mb-3">¿Tienes alergias conocidas?</p>
                <div className="flex flex-wrap gap-2">
                  {ALERGIAS.map((alergia) => (
                    <Casilla
                      key={alergia}
                      etiqueta={alergia}
                      activo={r.alergias.includes(alergia)}
                      onToggle={() => set('alergias', alternar(r.alergias, alergia, ''))}
                    />
                  ))}
                </div>
                <div className="mt-4">
                  <Field label="Otra alergia">
                    <Input
                      value={r.alergiaOtra}
                      onChange={(e) => set('alergiaOtra', e.target.value)}
                      placeholder="Describe cualquier otra alergia..."
                    />
                  </Field>
                </div>
              </div>

              <Field
                label="Medicamentos que tomas actualmente"
                hint="Incluye la dosis si la conoces."
              >
                <Textarea
                  rows={3}
                  value={r.medicamentos}
                  onChange={(e) => set('medicamentos', e.target.value)}
                  placeholder="Ej. Losartán 50 mg, una vez al día..."
                />
              </Field>
            </div>
          </Card>
        )}

        {/* ---- Paso 3: Antecedentes ---- */}
        {paso === 2 && (
          <Card title="Antecedentes" description="Enfermedades diagnósticadas y cirugías previas.">
            <div className="space-y-5">
              <div>
                <p className="text-base font-semibold text-gray-700 mb-3">
                  ¿Has sido diagnosticado con alguna enfermedad?
                </p>
                <div className="flex flex-wrap gap-2">
                  {ENFERMEDADES.map((enfermedad) => (
                    <Casilla
                      key={enfermedad}
                      etiqueta={enfermedad}
                      activo={r.enfermedades.includes(enfermedad)}
                      onToggle={() =>
                        set('enfermedades', alternar(r.enfermedades, enfermedad, 'Ninguna'))
                      }
                    />
                  ))}
                </div>
                <div className="mt-4">
                  <Field label="Otra enfermedad">
                    <Input
                      value={r.enfermedadOtra}
                      onChange={(e) => set('enfermedadOtra', e.target.value)}
                      placeholder="Describe cualquier otra condición..."
                    />
                  </Field>
                </div>
              </div>

              <Field label="Cirugías o hospitalizaciones previas" hint="Escribe “Ninguna” si no aplica.">
                <Textarea
                  rows={3}
                  value={r.cirugias}
                  onChange={(e) => set('cirugias', e.target.value)}
                  placeholder="Ej. Apendicectomía en 2018..."
                />
              </Field>
            </div>
          </Card>
        )}

        {/* ---- Paso 4: Hábitos y síntomas ---- */}
        {paso === 3 && (
          <Card title="Hábitos y síntomas" description="Tu estilo de vida y cómo te sientes hoy.">
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Actividad física">
                  <Select value={r.actividad} onChange={(e) => set('actividad', e.target.value)}>
                    <option>Ninguna</option>
                    <option>Leve</option>
                    <option>Moderada</option>
                    <option>Intensa</option>
                  </Select>
                </Field>
                <Field label="Consumo de tabaco">
                  <Select value={r.tabaco} onChange={(e) => set('tabaco', e.target.value)}>
                    <option>Nunca</option>
                    <option>Ex-fumador</option>
                    <option>Fumador</option>
                  </Select>
                </Field>
                <Field label="Consumo de alcohol">
                  <Select value={r.alcohol} onChange={(e) => set('alcohol', e.target.value)}>
                    <option>Nunca</option>
                    <option>Ocasional</option>
                    <option>Frecuente</option>
                  </Select>
                </Field>
                <Field label="Horas de sueño por noche">
                  <Input
                    type="number"
                    min={0}
                    max={24}
                    value={r.sueno}
                    onChange={(e) => set('sueno', e.target.value)}
                    className="tabular-nums"
                  />
                </Field>
              </div>

              <div>
                <p className="text-base font-semibold text-gray-700 mb-3">¿Presentas alguno de estos síntomas?</p>
                <div className="flex flex-wrap gap-2">
                  {SINTOMAS.map((sintoma) => (
                    <Casilla
                      key={sintoma}
                      etiqueta={sintoma}
                      activo={r.sintomas.includes(sintoma)}
                      onToggle={() => set('sintomas', alternar(r.sintomas, sintoma, 'Ninguno'))}
                    />
                  ))}
                </div>
              </div>

              <Field label="Comentarios adicionales" hint="Cualquier cosa que debamos saber.">
                <Textarea
                  rows={3}
                  value={r.comentarios}
                  onChange={(e) => set('comentarios', e.target.value)}
                  placeholder="Ej. Me duele la molar inferior derecha al masticar..."
                />
              </Field>
            </div>
          </Card>
        )}

        {/* ---- Paso 5: Resumen ---- */}
        {paso === 4 && (
          <Card
            title="Revisa tus respuestas"
            description={
              enviado ? `Enviado el ${enviado}` : 'Confirma que todo sea correcto antes de enviar.'
            }
          >
            <dl className="space-y-6">
              <div>
                <h4 className="text-sm font-semibold text-gray-500 mb-2">Datos básicos</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 text-base">
                  <p className="text-gray-800"><span className="text-gray-500">Peso:</span> <span className="tabular-nums">{r.peso} kg</span></p>
                  <p className="text-gray-800"><span className="text-gray-500">Talla:</span> <span className="tabular-nums">{r.talla} m</span></p>
                  <p className="text-gray-800">
                    <span className="text-gray-500">IMC:</span>{' '}
                    <span className="tabular-nums">{imc ? `${imc.valor} · ${imc.categoria}` : '—'}</span>
                  </p>
                  <p className="text-gray-800"><span className="text-gray-500">Tipo de sangre:</span> {r.tipoSangre}</p>
                </div>
              </div>

              <div className="pt-5 border-t border-gray-100">
                <h4 className="text-sm font-semibold text-gray-500 mb-2">Alergias y medicamentos</h4>
                <div className="space-y-1 text-base">
                  <p className="text-gray-800">
                    <span className="text-gray-500">Alergias:</span>{' '}
                    {listaOTexto([...r.alergias, r.alergiaOtra].filter(Boolean), 'Ninguna')}
                  </p>
                  <p className="text-gray-800">
                    <span className="text-gray-500">Medicamentos actuales:</span>{' '}
                    {r.medicamentos.trim() || 'No registra'}
                  </p>
                </div>
              </div>

              <div className="pt-5 border-t border-gray-100">
                <h4 className="text-sm font-semibold text-gray-500 mb-2">Antecedentes</h4>
                <div className="space-y-1 text-base">
                  <p className="text-gray-800">
                    <span className="text-gray-500">Enfermedades:</span>{' '}
                    {listaOTexto([...r.enfermedades, r.enfermedadOtra].filter(Boolean), 'Ninguna')}
                  </p>
                  <p className="text-gray-800">
                    <span className="text-gray-500">Cirugías previas:</span> {r.cirugias.trim() || 'Ninguna'}
                  </p>
                </div>
              </div>

              <div className="pt-5 border-t border-gray-100">
                <h4 className="text-sm font-semibold text-gray-500 mb-2">Hábitos y síntomas</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 text-base">
                  <p className="text-gray-800"><span className="text-gray-500">Actividad física:</span> {r.actividad}</p>
                  <p className="text-gray-800"><span className="text-gray-500">Tabaco:</span> {r.tabaco}</p>
                  <p className="text-gray-800"><span className="text-gray-500">Alcohol:</span> {r.alcohol}</p>
                  <p className="text-gray-800"><span className="text-gray-500">Sueño:</span> <span className="tabular-nums">{r.sueno} h</span></p>
                </div>
                <div className="space-y-1 text-base mt-2">
                  <p className="text-gray-800"><span className="text-gray-500">Síntomas:</span> {listaOTexto(r.sintomas, 'Ninguno')}</p>
                  <p className="text-gray-800"><span className="text-gray-500">Comentarios:</span> {r.comentarios.trim() || '—'}</p>
                </div>
              </div>
            </dl>
          </Card>
        )}

        {/* ---- Navegación ---- */}
        {error && (
          <p className="text-base text-red-600 font-medium mt-4" role="alert">
            {error}
          </p>
        )}

        <div className="flex items-center justify-between gap-4 pt-6 pb-10">
          <Button
            variant="secondary"
            icon={ChevronLeft}
            onClick={() => setPaso((p) => Math.max(0, p - 1))}
            disabled={paso === 0}
          >
            Atrás
          </Button>

          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400 tabular-nums hidden sm:block">
              Paso {paso + 1} de {PASOS.length}
            </span>
            {paso < PASOS.length - 1 ? (
              <Button icon={ChevronRight} onClick={siguiente}>
                Siguiente
              </Button>
            ) : enviado ? (
              <Button
                variant="secondary"
                icon={Pencil}
                onClick={() => {
                  setEnviado(null);
                  setPaso(0);
                }}
              >
                Editar respuestas
              </Button>
            ) : (
              <Button icon={Send} onClick={enviar}>
                Enviar cuestionario
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
