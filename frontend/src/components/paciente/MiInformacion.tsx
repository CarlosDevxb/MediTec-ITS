import React, { useState } from 'react';
import { UserCog, Save, CircleAlert } from 'lucide-react';
import PageHeader from '../ui/PageHeader';
import Card from '../ui/Card';
import Button from '../ui/Button';
import ModalResultado from '../ui/ModalResultado';
import { Field, Select, Textarea } from '../ui/Input';
import { detallesDe, mensajeDeError } from '../../services/api';
import { actualizarExpediente, TIPOS_SANGRE, type ExpedientePaciente } from '../../services/atencion.service';
import ConfiguracionPerfil from '../cuenta/ConfiguracionPerfil';

/* ============================================================
   MI INFORMACIÓN (PACIENTE) · Actualización de sus datos:
   datos de contacto y contraseña (su correo no se modifica) y
   los datos de su expediente (tipo de sangre y antecedentes).
   ============================================================ */

export interface MiInformacionProps {
  expediente: ExpedientePaciente;
  /** Propaga el expediente actualizado al portal */
  onActualizado: (expediente: ExpedientePaciente) => void;
}

export default function MiInformacion({ expediente, onActualizado }: MiInformacionProps) {
  const [tipoSangre, setTipoSangre] = useState(expediente.tipoSangre ?? '');
  const [antecedentes, setAntecedentes] = useState(expediente.antecedentes ?? '');
  const [guardando, setGuardando] = useState(false);
  const [errorGeneral, setErrorGeneral] = useState('');
  const [resultado, setResultado] = useState<{
    titulo: string;
    mensaje: string;
    tipo: 'exito' | 'error';
  } | null>(null);

  const guardarExpediente = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorGeneral('');
    if (antecedentes.length > 2000) {
      setErrorGeneral('Los antecedentes no pueden exceder 2000 caracteres.');
      return;
    }

    setGuardando(true);
    try {
      const actualizado = await actualizarExpediente(expediente.id, {
        tipoSangre: tipoSangre || undefined,
        antecedentes: antecedentes.trim(),
      });
      onActualizado(actualizado);
      setResultado({
        titulo: 'Datos actualizados',
        mensaje: 'Tu tipo de sangre y tus antecedentes quedaron actualizados.',
        tipo: 'exito',
      });
    } catch (error) {
      const porCampo = detallesDe(error);
      if (Object.keys(porCampo).length > 0) {
        setErrorGeneral(Object.values(porCampo).join(' '));
      } else {
        setErrorGeneral(mensajeDeError(error));
      }
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="entrada p-10 xl:p-12 max-w-5xl mx-auto font-sans">
      <PageHeader
        title="Mi información"
        subtitle="Tus datos de contacto, tu contraseña y los datos de tu expediente"
      />

      {/* Datos de la cuenta: teléfono y contraseña (el correo no se modifica) */}
      <div className="mb-6">
        <ConfiguracionPerfil />
      </div>

      {/* Datos del expediente */}
      <form onSubmit={(e) => void guardarExpediente(e)} className="space-y-6" noValidate>
        <Card title="Datos de mi expediente" icon={UserCog}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Tipo de sangre" hint="Opcional. Si no lo conoces, déjalo en 'Sin registrar'.">
              <Select value={tipoSangre} onChange={(e) => setTipoSangre(e.target.value)}>
                <option value="">Sin registrar</option>
                {TIPOS_SANGRE.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {tipo}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Antecedentes"
              className="md:col-span-2"
              hint="Opcional. Información relevante para tu atención."
            >
              <Textarea
                rows={3}
                value={antecedentes}
                onChange={(e) => setAntecedentes(e.target.value)}
                placeholder="Ej. Antecedentes familiares, cirugías previas…"
              />
            </Field>
          </div>

          {errorGeneral && (
            <div
              role="alert"
              className="mt-4 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
            >
              <CircleAlert size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
              {errorGeneral}
            </div>
          )}

          <div className="flex justify-end gap-4 mt-6">
            <Button type="submit" icon={Save} loading={guardando} disabled={guardando}>
              Guardar mis datos
            </Button>
          </div>
        </Card>
      </form>

      {resultado && (
        <ModalResultado
          titulo={resultado.titulo}
          mensaje={resultado.mensaje}
          tipo={resultado.tipo}
          onCerrar={() => setResultado(null)}
        />
      )}
    </div>
  );
}
