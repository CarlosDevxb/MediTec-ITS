import React, { useState } from 'react';
import { ShieldCheck, Save, X } from 'lucide-react';
import PageHeader from '../ui/PageHeader';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { Field, Input, Textarea } from '../ui/Input';
import { type Rol } from './tipos';

/* ============================================================
   FORMULARIO DE ROL · alta y edición (subpágina)
   ============================================================ */

export interface RolFormProps {
  modo: 'alta' | 'editar';
  rol?: Rol;
  onCancelar: () => void;
  onGuardar: (datos: Rol) => void;
}

export default function RolForm({ modo, rol, onCancelar, onGuardar }: RolFormProps) {
  const [nombre, setNombre] = useState(rol?.nombre ?? '');
  const [descripcion, setDescripcion] = useState(rol?.descripcion ?? '');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      setError('Escribe un nombre para el rol.');
      return;
    }
    setError('');
    onGuardar({
      id: rol?.id ?? Date.now(),
      nombre: nombre.trim(),
      descripcion: descripcion.trim(),
      usuarios: rol?.usuarios ?? 0,
    });
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

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card title="Datos del rol" icon={ShieldCheck}>
          <div className="space-y-4">
            <Field label="Nombre del rol">
              <Input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej. Enfermería"
              />
            </Field>
            <Field label="Descripción" hint="Qué puede hacer esta cuenta en el sistema.">
              <Textarea
                rows={3}
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Ej. Captura signos vitales y apoya la atención..."
              />
            </Field>
          </div>
        </Card>

        {error && (
          <p className="text-sm text-red-600 font-medium" role="alert">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-4 pb-10">
          <Button variant="secondary" icon={X} onClick={onCancelar}>
            Cancelar
          </Button>
          <Button type="submit" icon={Save}>
            {modo === 'alta' ? 'Crear rol' : 'Guardar cambios'}
          </Button>
        </div>
      </form>
    </div>
  );
}
