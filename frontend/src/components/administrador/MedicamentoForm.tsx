import React, { useMemo, useState } from 'react';
import { Pill, Save, X, CircleAlert } from 'lucide-react';
import PageHeader from '../ui/PageHeader';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { Field, Input, Select, Textarea } from '../ui/Input';
import { detallesDe, mensajeDeError } from '../../services/api';
import { useOpcionUnica } from '../../hooks/useOpcionUnica';
import type { ValorCatalogo } from '../../services/administracion.service';
import {
  type Medicamento,
  type DatosMedicamento,
  CATEGORIAS_MEDICAMENTO,
} from '../../services/operacion.service';

/* ============================================================
   FORMULARIO DE MEDICAMENTO · alta y edición (subpágina)

   La validación es en tiempo real: los formatos se revisan mientras
   se escribe y los nombres repetidos se detectan contra el inventario
   ya cargado, sin esperar al envío. El servidor vuelve a validar todo.
   ============================================================ */

export interface MedicamentoFormProps {
  modo: 'alta' | 'editar';
  medicamento?: Medicamento;
  /** Inventario completo: para avisar de nombres repetidos mientras se escribe */
  existentes: Medicamento[];
  /** Unidades de medida del catálogo (se administran en la sección Catálogos) */
  unidades: ValorCatalogo[];
  guardando?: boolean;
  onCancelar: () => void;
  onGuardar: (datos: DatosMedicamento) => Promise<void>;
}

/** DECIMAL(10,2) del esquema */
const STOCK_MAXIMO = 99999999.99;

/** Calcula el error de un campo (cadena vacía si está bien) */
function errorDeCampo(
  campo: 'nombre' | 'unidadId' | 'stock' | 'descripcion',
  valores: { nombre: string; unidadId: string; stock: string; descripcion: string },
  duplicado: boolean,
): string {
  switch (campo) {
    case 'nombre':
      if (!valores.nombre.trim()) return 'Escribe el nombre del medicamento.';
      if (valores.nombre.trim().length > 100) return 'El nombre no puede exceder 100 caracteres.';
      if (duplicado) return 'Ya existe un medicamento con ese nombre.';
      return '';
    case 'unidadId':
      return valores.unidadId ? '' : 'Selecciona una unidad de medida.';
    case 'stock': {
      if (valores.stock === '') return 'Indica el stock (puede ser 0).';
      const numero = Number(valores.stock);
      if (Number.isNaN(numero)) return 'El stock debe ser un número.';
      if (numero < 0) return 'El stock no puede ser negativo.';
      if (numero > STOCK_MAXIMO) return 'El stock no puede exceder 99,999,999.99.';
      const decimales = valores.stock.split('.')[1];
      if (decimales && decimales.length > 2) return 'El stock admite máximo dos decimales.';
      return '';
    }
    case 'descripcion':
      return valores.descripcion.trim().length > 1000
        ? 'La descripción no puede exceder 1000 caracteres.'
        : '';
  }
}

export default function MedicamentoForm({
  modo,
  medicamento,
  existentes,
  unidades,
  guardando = false,
  onCancelar,
  onGuardar,
}: MedicamentoFormProps) {
  const [nombre, setNombre] = useState(medicamento?.nombre ?? '');
  const [categoria, setCategoria] = useState<string>(
    medicamento?.categoria ?? 'Medicamento común',
  );
  const [unidadId, setUnidadId] = useState(medicamento ? String(medicamento.unidadId) : '');
  const [stock, setStock] = useState(medicamento ? String(medicamento.stock) : '');
  const [descripcion, setDescripcion] = useState(medicamento?.descripcion ?? '');
  /** Campos que ya se tocaron: evita señalar el formulario vacío desde el inicio */
  const [tocado, setTocado] = useState<Record<string, boolean>>({});
  const [erroresServidor, setErroresServidor] = useState<Record<string, string>>({});
  const [errorGeneral, setErrorGeneral] = useState('');

  const valores = { nombre, unidadId, stock, descripcion };

  // Con una sola unidad de medida el selector la elige solo (ver hooks/):
  // evita el campo que "se ve seleccionado" pero no lo está.
  useOpcionUnica(unidades, unidadId, (id) => setUnidadId(String(id)));

  /* ---------- Duplicados en tiempo real ---------- */
  const nombreDuplicado = useMemo(
    () =>
      nombre.trim().length > 0 &&
      existentes.some(
        (m) =>
          m.id !== medicamento?.id &&
          m.nombre.trim().toLowerCase() === nombre.trim().toLowerCase(),
      ),
    [nombre, existentes, medicamento],
  );

  const duplicadoTexto = nombreDuplicado
    ? `Ya existe "${nombre.trim()}" en el inventario. Usa otro nombre o edita ese medicamento.`
    : '';

  /** Errores vivos: se recalculan en cada tecla */
  const errores = useMemo(() => {
    const calculados: Record<string, string> = {};
    for (const campo of ['nombre', 'unidadId', 'stock', 'descripcion'] as const) {
      calculados[campo] = errorDeCampo(campo, valores, nombreDuplicado);
    }
    return calculados;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nombre, unidadId, stock, descripcion, nombreDuplicado]);

  /** El error de un campo se muestra al editarlo, y el de duplicado de inmediato */
  const errorVisible = (campo: string): string | undefined => {
    const propio = errores[campo];
    if (!propio) return erroresServidor[campo] || undefined;
    if (campo === 'nombre' && nombreDuplicado) return duplicadoTexto;
    return tocado[campo] ? propio : erroresServidor[campo] || undefined;
  };

  const hayErrores = Object.values(errores).some(Boolean);

  const marcarTocado = (campo: string) => setTocado((prev) => ({ ...prev, [campo]: true }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTocado({ nombre: true, unidadId: true, stock: true, descripcion: true });
    setErroresServidor({});
    setErrorGeneral('');
    if (hayErrores) return;

    try {
      await onGuardar({
        nombre: nombre.trim(),
        categoria: categoria as DatosMedicamento['categoria'],
        unidadId: Number(unidadId),
        stock: Number(stock),
        descripcion: descripcion.trim() || undefined,
      });
    } catch (error) {
      // Errores del servidor pintados en su campo (400) o como resumen (409 / red)
      const porCampo = detallesDe(error);
      if (Object.keys(porCampo).length > 0) setErroresServidor(porCampo);
      else setErrorGeneral(mensajeDeError(error));
    }
  };

  return (
    <div className="entrada p-10 xl:p-12 max-w-5xl mx-auto font-sans">
      <PageHeader
        title={modo === 'alta' ? 'Nuevo medicamento' : 'Editar medicamento'}
        subtitle={
          modo === 'alta'
            ? 'Agrega un producto al inventario de la clínica'
            : `Editando ${medicamento?.nombre ?? ''}`
        }
      />

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6" noValidate>
        <Card title="Datos del medicamento" icon={Pill}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field
              label="Nombre"
              className="md:col-span-2"
              error={errorVisible('nombre')}
              hint="Nombre comercial o genérico con concentración. Debe ser único."
            >
              <Input
                value={nombre}
                onChange={(e) => {
                  setNombre(e.target.value);
                  marcarTocado('nombre');
                }}
                onBlur={() => marcarTocado('nombre')}
                placeholder="Ej. Amoxicilina 500 mg"
                aria-invalid={errorVisible('nombre') ? true : undefined}
                maxLength={100}
              />
            </Field>

            <Field
              label="Categoría"
              hint="Enfermería solo puede usar como insumo las categorías Insumo y Medicamento común."
            >
              <Select value={categoria} onChange={(e) => setCategoria(e.target.value)}>
                {CATEGORIAS_MEDICAMENTO.map((opcion) => (
                  <option key={opcion} value={opcion}>
                    {opcion}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Unidad de medida" error={errorVisible('unidadId')}>
              {unidades.length === 0 ? (
                <p className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
                  Todavía no hay unidades de medida. Regístralas en la sección
                  Catálogos → Unidades de medida y vuelve a intentarlo.
                </p>
              ) : (
                <Select
                  value={unidadId}
                  onChange={(e) => {
                    setUnidadId(e.target.value);
                    marcarTocado('unidadId');
                  }}
                  onBlur={() => marcarTocado('unidadId')}
                  aria-invalid={errorVisible('unidadId') ? true : undefined}
                >
                  <option value="">Selecciona una unidad…</option>
                  {unidades.map((unidad) => (
                    <option key={unidad.id} value={unidad.id}>
                      {unidad.nombre}
                      {unidad.abreviatura ? ` (${unidad.abreviatura})` : ''}
                    </option>
                  ))}
                </Select>
              )}
            </Field>

            <Field
              label="Stock"
              hint="Unidades disponibles. Con 0 el medicamento queda no disponible para consultas."
              error={errorVisible('stock')}
            >
              <Input
                type="number"
                min={0}
                step="0.01"
                inputMode="decimal"
                value={stock}
                onChange={(e) => {
                  setStock(e.target.value);
                  marcarTocado('stock');
                }}
                onBlur={() => marcarTocado('stock')}
                placeholder="Ej. 120"
                className="tabular-nums"
                aria-invalid={errorVisible('stock') ? true : undefined}
              />
            </Field>

            <Field
              label="Descripción / uso"
              className="md:col-span-2"
              error={errorVisible('descripcion')}
            >
              <Textarea
                rows={3}
                value={descripcion}
                onChange={(e) => {
                  setDescripcion(e.target.value);
                  marcarTocado('descripcion');
                }}
                onBlur={() => marcarTocado('descripcion')}
                placeholder="Ej. Antibiótico de amplio espectro…"
                aria-invalid={errorVisible('descripcion') ? true : undefined}
              />
            </Field>
          </div>
        </Card>

        {(hayErrores || errorGeneral) && (
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
            {modo === 'alta' ? 'Agregar al inventario' : 'Guardar cambios'}
          </Button>
        </div>
      </form>
    </div>
  );
}
