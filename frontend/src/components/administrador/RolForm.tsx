import React, { useState } from 'react';
import { Save, X } from 'lucide-react';
import PageHeader from '../ui/PageHeader';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { Field, Input, Textarea } from '../ui/Input';
import { detallesDe, mensajeDeError } from '../../services/api';
import type { Rol } from '../../services/administracion.service';

/* ============================================================
   FORMULARIO DE ROL · alta y edición (subpágina)
   Conectado a POST/PUT /api/roles
   ============================================================ */

export interface RolFormProps {
  modo: 'alta' | 'editar';
  rol?: Rol;
  guardando: boolean;
  onCancelar: () => void;
  onGuardar: (datos: { nombre: string; descripcion: string }) => void | Promise<void>;
}

export default function RolForm({ modo, rol, guardando, onCancelar, onGuardar }: RolFormProps) {
  const [nombre, setNombre] = useState(rol?.nombre ?? '');
  const [descripcion, setDescripcion] = useState(rol?.descripcion ?? '');
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [errorGeneral, setErrorGeneral] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorGeneral('');

    // Validación rápida en cliente; el servidor vuelve a validar
    const nuevos: Record<string, string> = {};
    if (!nombre.trim()) {
      nuevos.nombre = 'Escribe un nombre para el rol.';
    } else if (nombre.trim().length < 3) {
      nuevos.nombre = 'El nombre debe tener al menos 3 caracteres.';
    } else if (nombre.length > 50) {
      nuevos.nombre = 'Máximo 50 caracteres.';
    }
    if (descripcion.length > 255) {
      nuevos.descripcion = 'Máximo 255 caracteres.';
    }
    setErrores(nuevos);
    if (Object.keys(nuevos).length > 0) return;

    try {
      await onGuardar({ nombre: nombre.trim(), descripcion: descripcion.trim() });
      setErrores({});
    } catch (error) {
      const porCampo = detallesDe(error);
      if (Object.keys(porCampo).length > 0) {
        setErrores(porCampo);
      } else {
        setErrorGeneral(mensajeDeError(error));
      }
    }
  };

  return (
    <div className="p-10 xl:p-12 max-w-5xl mx-auto font-sans">
      <PageHeader
        title={modo === 'alta' ? 'Nuevo rol' : 'Editar rol'}
        subtitle={
          modo === 'alta'
            ? 'Crea un perfil de acceso para el personal'
            : `Editando el rol ${rol?.nombre ?? ''}`
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        <Card title="Datos del rol">
          <div className="space-y-4">
            <Field label="Nombre del rol" error={errores.nombre}>
              <Input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej. Enfermería"
                maxLength={50}
                disabled={guardando}
                aria-invalid={errores.nombre ? true : undefined}
              />
            </Field>
            <Field
              label="Descripción"
              hint="Qué puede hacer esta cuenta en el sistema."
              error={errores.descripcion}
            >
              <Textarea
                rows={3}
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Ej. Captura signos vitales y apoya la atención..."
                maxLength={255}
                disabled={guardando}
              />
            </Field>
          </div>
        </Card>

        {errorGeneral && (
          <p className="text-sm text-red-600 font-medium" role="alert">
            {errorGeneral}
          </p>
        )}

        <div className="flex justify-end gap-4 pb-10">
          <Button variant="secondary" icon={X} onClick={onCancelar} disabled={guardando}>
            Cancelar
          </Button>
          <Button type="submit" icon={Save} loading={guardando}>
            {modo === 'alta' ? 'Crear rol' : 'Guardar cambios'}
          </Button>
        </div>
      </form>
    </div>
  );
}
