import React, { useState } from 'react';
import { Pill, Save, X } from 'lucide-react';
import PageHeader from '../ui/PageHeader';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { Field, Input, Select, Textarea } from '../ui/Input';
import { OPCIONES_UNIDAD, type Medicamento } from './tipos';

/* ============================================================
   FORMULARIO DE MEDICAMENTO · alta y edición (subpágina)
   ============================================================ */

export interface MedicamentoFormProps {
  modo: 'alta' | 'editar';
  medicamento?: Medicamento;
  onCancelar: () => void;
  onGuardar: (datos: Medicamento) => void;
}

export default function MedicamentoForm({
  modo,
  medicamento,
  onCancelar,
  onGuardar,
}: MedicamentoFormProps) {
  const [nombre, setNombre] = useState(medicamento?.nombre ?? '');
  const [unidad, setUnidad] = useState(medicamento?.unidad ?? OPCIONES_UNIDAD[1]);
  const [stock, setStock] = useState(medicamento ? String(medicamento.stock) : '');
  const [descripcion, setDescripcion] = useState(medicamento?.descripcion ?? '');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const stockNum = Number(stock);
    if (!nombre.trim()) {
      setError('Escribe el nombre del medicamento.');
      return;
    }
    if (stock === '' || Number.isNaN(stockNum) || stockNum < 0) {
      setError('El stock debe ser un número igual o mayor a cero.');
      return;
    }
    setError('');
    onGuardar({
      id: medicamento?.id ?? Date.now(),
      nombre: nombre.trim(),
      unidad,
      stock: stockNum,
      descripcion: descripcion.trim(),
    });
  };

  return (
    <div className="p-10 xl:p-12 max-w-5xl mx-auto font-sans">
      <PageHeader
        title={modo === 'alta' ? 'Nuevo medicamento' : 'Editar medicamento'}
        subtitle={
          modo === 'alta'
            ? 'Agrega un producto al inventario de la clínica'
            : `Editando ${medicamento?.nombre ?? ''}`
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card title="Datos del medicamento" icon={Pill}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Nombre" className="md:col-span-2">
              <Input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej. Amoxicilina 500 mg"
              />
            </Field>
            <Field label="Unidad de medida">
              <Select value={unidad} onChange={(e) => setUnidad(e.target.value)}>
                {OPCIONES_UNIDAD.map((opcion) => (
                  <option key={opcion} value={opcion}>
                    {opcion}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Stock inicial" hint="Unidades disponibles en almacén.">
              <Input
                type="number"
                min={0}
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                placeholder="Ej. 120"
                className="tabular-nums"
              />
            </Field>
            <Field label="Descripción / uso" className="md:col-span-2">
              <Textarea
                rows={3}
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Ej. Antibiótico de amplio espectro..."
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
            {modo === 'alta' ? 'Agregar al inventario' : 'Guardar cambios'}
          </Button>
        </div>
      </form>
    </div>
  );
}
