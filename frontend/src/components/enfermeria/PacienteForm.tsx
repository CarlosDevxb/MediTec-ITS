import React, { useMemo, useState } from 'react';
import { UserPlus, Save, X, CircleAlert, KeyRound } from 'lucide-react';
import PageHeader from '../ui/PageHeader';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { Field, Input, Select, Textarea } from '../ui/Input';
import { detallesDe, mensajeDeError } from '../../services/api';
import type { ValorCatalogo } from '../../services/administracion.service';
import {
  TIPOS_SANGRE,
  type ExpedientePaciente,
  type PacienteResumen,
  type DatosPaciente,
} from '../../services/atencion.service';

/* ============================================================
   FORMULARIO DE PACIENTE · Alta de cuenta + expediente (o solo
   expediente al editar). La validación es en tiempo real: los
   números de control y correos repetidos se detectan mientras se
   escribe. Si no se captura contraseña, el sistema genera una
   temporal que se entrega una sola vez.
   ============================================================ */

const GENEROS = ['Masculino', 'Femenino', 'Otro'];

export interface PacienteFormProps {
  modo: 'alta' | 'editar';
  /** Requerido en edición */
  paciente?: ExpedientePaciente;
  tiposPaciente: ValorCatalogo[];
  carreras: ValorCatalogo[];
  /** Para avisar de duplicados mientras se escribe */
  existentes: PacienteResumen[];
  guardando?: boolean;
  onCancelar: () => void;
  onGuardar: (datos: DatosPaciente) => Promise<void>;
}

export default function PacienteForm({
  modo,
  paciente,
  tiposPaciente,
  carreras,
  existentes,
  guardando = false,
  onCancelar,
  onGuardar,
}: PacienteFormProps) {
  const esAlta = modo === 'alta';

  const [nombre, setNombre] = useState(paciente?.nombre ?? '');
  const [numeroControl, setNumeroControl] = useState(paciente?.numeroControl ?? '');
  const [correo, setCorreo] = useState('');
  const [telefono, setTelefono] = useState(paciente?.telefono ?? '');
  const [fechaNacimiento, setFechaNacimiento] = useState(paciente?.fechaNacimiento ?? '');
  const [genero, setGenero] = useState('');
  const [tipoPacienteId, setTipoPacienteId] = useState('');
  const [carreraId, setCarreraId] = useState('');
  const [tipoSangre, setTipoSangre] = useState(paciente?.tipoSangre ?? '');
  const [antecedentes, setAntecedentes] = useState(paciente?.antecedentes ?? '');
  const [contrasena, setContrasena] = useState('');

  const [tocado, setTocado] = useState<Record<string, boolean>>({});
  const [erroresServidor, setErroresServidor] = useState<Record<string, string>>({});
  const [errorGeneral, setErrorGeneral] = useState('');

  const valores = {
    nombre,
    numeroControl,
    correo,
    fechaNacimiento,
    genero,
    tipoPacienteId,
    contrasena,
  };

  /* ---------- Duplicados en tiempo real ---------- */
  // El número de control se detecta mientras se escribe; el correo duplicado
  // lo confirma la API al guardar (responde 409 y el formulario lo muestra)
  const numeroRepetido =
    numeroControl.trim().length > 0 &&
    existentes.some(
      (p) => p.id !== paciente?.id && p.numeroControl.trim().toLowerCase() === numeroControl.trim().toLowerCase(),
    );

  /* ---------- Errores vivos ---------- */
  const errores = useMemo(() => {
    const calculados: Record<string, string> = {};
    const texto = (clave: string) => (valores[clave as keyof typeof valores] ?? '').toString().trim();

    calculados.nombre = texto('nombre').length < 3 ? 'Escribe el nombre completo (mínimo 3 caracteres).' : '';
    calculados.numeroControl = !texto('numeroControl')
      ? 'Escribe el número de control.'
      : !/^[A-Za-z0-9-]+$/.test(texto('numeroControl'))
        ? 'Solo admite letras, números y guiones.'
        : numeroRepetido
          ? 'Ese número de control ya está registrado.'
          : '';
    calculados.correo = !esAlta
      ? ''
      : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(texto('correo'))
        ? 'Escribe un correo electrónico válido.'
        : '';
    calculados.fechaNacimiento = !/^\d{4}-\d{2}-\d{2}$/.test(texto('fechaNacimiento'))
      ? 'La fecha debe tener el formato AAAA-MM-DD.'
      : texto('fechaNacimiento') > new Date().toISOString().slice(0, 10)
        ? 'La fecha no puede ser futura.'
        : '';
    calculados.genero = !esAlta || genero ? '' : 'Selecciona un género.';
    calculados.tipoPacienteId = !esAlta || tipoPacienteId ? '' : 'Selecciona el tipo de paciente.';
    calculados.contrasena =
      !esAlta || !contrasena || contrasena.length >= 8
        ? ''
        : 'La contraseña debe tener al menos 8 caracteres.';
    return calculados;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nombre, numeroControl, correo, fechaNacimiento, genero, tipoPacienteId, contrasena, numeroRepetido, esAlta]);

  const errorVisible = (campo: string): string | undefined => {
    const propio = errores[campo];
    if (propio) return tocado[campo] ? propio : erroresServidor[campo] || undefined;
    return erroresServidor[campo] || undefined;
  };

  const hayErrores = Object.values(errores).some(Boolean);
  const marcarTocado = (campo: string) => setTocado((prev) => ({ ...prev, [campo]: true }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTocado({
      nombre: true,
      numeroControl: true,
      correo: true,
      fechaNacimiento: true,
      genero: true,
      tipoPacienteId: true,
      contrasena: true,
    });
    setErroresServidor({});
    setErrorGeneral('');
    if (hayErrores) return;

    try {
      if (esAlta) {
        await onGuardar({
          nombre: nombre.trim(),
          numeroControl: numeroControl.trim(),
          correo: correo.trim(),
          telefono: telefono.trim() || undefined,
          fechaNacimiento,
          genero: genero as DatosPaciente['genero'],
          tipoPacienteId: Number(tipoPacienteId),
          carreraId: carreraId ? Number(carreraId) : undefined,
          tipoSangre: tipoSangre || undefined,
          antecedentes: antecedentes.trim() || undefined,
          contrasena: contrasena.trim() || undefined,
        });
      } else {
        await onGuardar({
          nombre: paciente?.nombre ?? '',
          numeroControl: paciente?.numeroControl ?? '',
          correo: '',
          fechaNacimiento: paciente?.fechaNacimiento ?? '',
          genero: 'Otro',
          tipoSangre: tipoSangre || undefined,
          antecedentes: antecedentes.trim() || undefined,
        });
      }
    } catch (error) {
      const porCampo = detallesDe(error);
      if (Object.keys(porCampo).length > 0) setErroresServidor(porCampo);
      else setErrorGeneral(mensajeDeError(error));
    }
  };

  return (
    <div className="entrada p-10 xl:p-12 max-w-5xl mx-auto font-sans">
      <PageHeader
        title={esAlta ? 'Nuevo paciente' : `Expediente de ${paciente?.nombre ?? ''}`}
        subtitle={
          esAlta
            ? 'Abre el expediente y la cuenta de acceso del paciente'
            : 'Actualiza los datos del expediente clínico'
        }
      />

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6" noValidate>
        {esAlta && (
          <Card title="Datos de la cuenta" icon={UserPlus}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Nombre completo" className="md:col-span-2" error={errorVisible('nombre')}>
                <Input
                  value={nombre}
                  onChange={(e) => {
                    setNombre(e.target.value);
                    marcarTocado('nombre');
                  }}
                  onBlur={() => marcarTocado('nombre')}
                  placeholder="Ej. Ana Sofía Rivera"
                  aria-invalid={errorVisible('nombre') ? true : undefined}
                />
              </Field>
              <Field
                label="Número de control"
                error={errorVisible('numeroControl')}
                hint="Identificador del paciente en la institución."
              >
                <Input
                  value={numeroControl}
                  onChange={(e) => {
                    setNumeroControl(e.target.value);
                    marcarTocado('numeroControl');
                  }}
                  onBlur={() => marcarTocado('numeroControl')}
                  placeholder="Ej. AL-0001"
                  aria-invalid={errorVisible('numeroControl') ? true : undefined}
                />
              </Field>
              <Field label="Correo electrónico" error={errorVisible('correo')}>
                <Input
                  type="email"
                  value={correo}
                  onChange={(e) => {
                    setCorreo(e.target.value);
                    marcarTocado('correo');
                  }}
                  onBlur={() => marcarTocado('correo')}
                  placeholder="nombre@meditec.mx"
                  aria-invalid={errorVisible('correo') ? true : undefined}
                />
              </Field>
              <Field label="Teléfono" hint="Opcional.">
                <Input
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="Ej. 5512345678"
                />
              </Field>
              <Field label="Fecha de nacimiento" error={errorVisible('fechaNacimiento')}>
                <Input
                  type="date"
                  value={fechaNacimiento}
                  onChange={(e) => {
                    setFechaNacimiento(e.target.value);
                    marcarTocado('fechaNacimiento');
                  }}
                  onBlur={() => marcarTocado('fechaNacimiento')}
                  aria-invalid={errorVisible('fechaNacimiento') ? true : undefined}
                />
              </Field>
              <Field label="Género" error={errorVisible('genero')}>
                <Select
                  value={genero}
                  onChange={(e) => {
                    setGenero(e.target.value);
                    marcarTocado('genero');
                  }}
                  onBlur={() => marcarTocado('genero')}
                  aria-invalid={errorVisible('genero') ? true : undefined}
                >
                  <option value="">Selecciona…</option>
                  {GENEROS.map((opcion) => (
                    <option key={opcion} value={opcion}>
                      {opcion}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field
                label="Contraseña"
                hint="Opcional: si la dejas vacía, el sistema genera una temporal."
                error={errorVisible('contrasena')}
              >
                <Input
                  type="text"
                  value={contrasena}
                  onChange={(e) => {
                    setContrasena(e.target.value);
                    marcarTocado('contrasena');
                  }}
                  onBlur={() => marcarTocado('contrasena')}
                  placeholder="Mínimo 8 caracteres"
                  aria-invalid={errorVisible('contrasena') ? true : undefined}
                />
              </Field>
            </div>
          </Card>
        )}

        <Card title="Datos del expediente" icon={KeyRound}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {esAlta && (
              <>
                <Field label="Tipo de paciente" error={errorVisible('tipoPacienteId')}>
                  <Select
                    value={tipoPacienteId}
                    onChange={(e) => {
                      setTipoPacienteId(e.target.value);
                      marcarTocado('tipoPacienteId');
                    }}
                    onBlur={() => marcarTocado('tipoPacienteId')}
                    aria-invalid={errorVisible('tipoPacienteId') ? true : undefined}
                  >
                    <option value="">Selecciona…</option>
                    {tiposPaciente.map((tipo) => (
                      <option key={tipo.id} value={tipo.id}>
                        {tipo.nombre}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Carrera" hint="Opcional (solo alumnos).">
                  <Select value={carreraId} onChange={(e) => setCarreraId(e.target.value)}>
                    <option value="">Sin carrera</option>
                    {carreras.map((carrera) => (
                      <option key={carrera.id} value={carrera.id}>
                        {carrera.nombre}
                      </option>
                    ))}
                  </Select>
                </Field>
              </>
            )}
            <Field label="Tipo de sangre" hint="Opcional.">
              <Select value={tipoSangre} onChange={(e) => setTipoSangre(e.target.value)}>
                <option value="">Sin registrar</option>
                {TIPOS_SANGRE.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {tipo}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Antecedentes" className="md:col-span-2" hint="Opcional.">
              <Textarea
                rows={3}
                value={antecedentes}
                onChange={(e) => setAntecedentes(e.target.value)}
                placeholder="Antecedentes relevantes del paciente…"
              />
            </Field>
          </div>
        </Card>

        {(errorGeneral || hayErrores) && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            <CircleAlert size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>
              {errorGeneral ||
                'Revisa los campos marcados antes de guardar: hay datos inválidos o repetidos.'}
            </span>
          </div>
        )}

        <div className="flex justify-end gap-4 pb-10">
          <Button variant="secondary" icon={X} onClick={onCancelar} disabled={guardando}>
            Cancelar
          </Button>
          <Button type="submit" icon={Save} loading={guardando} disabled={guardando}>
            {esAlta ? 'Abrir expediente' : 'Guardar cambios'}
          </Button>
        </div>
      </form>
    </div>
  );
}
