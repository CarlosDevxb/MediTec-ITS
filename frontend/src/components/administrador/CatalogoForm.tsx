import React, { useState } from 'react';
import { Save, X } from 'lucide-react';
import PageHeader from '../ui/PageHeader';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { Field, Input } from '../ui/Input';
import { detallesDe, mensajeDeError } from '../../services/api';
import type { Catalogo, ValorCatalogo } from '../../services/administracion.service';

/* ============================================================
   FORMULARIO DE CATÁLOGO · alta y edición (subpágina)
   Los campos (etiqueta, placeholder y largo máximo) vienen de la
   API, así que un solo formulario sirve para las cinco tablas.

   Valida en el cliente lo básico y muestra los errores por campo
   que devuelve el servidor (duplicados, largos, etc.).
   ============================================================ */

export interface CatalogoFormProps {
  catalogo: Catalogo;
  modo: 'alta' | 'editar';
  valor?: ValorCatalogo;
  /** Valores actuales del catálogo, para detectar duplicados antes de enviar */
  existentes: ValorCatalogo[];
  guardando: boolean;
  onCancelar: () => void;
  onGuardar: (datos: Record<string, string>) => void | Promise<void>;
}

export default function CatalogoForm({
  catalogo,
  modo,
  valor,
  existentes,
  guardando,
  onCancelar,
  onGuardar,
}: CatalogoFormProps) {
  const [textos, setTextos] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      catalogo.campos.map((campo) => [
        campo.columna,
        campo.columna === 'nombre'
          ? (valor?.nombre ?? '')
          : campo.columna === 'abreviatura'
            ? (valor?.abreviatura ?? '')
            : '',
      ]),
    ),
  );
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [errorGeneral, setErrorGeneral] = useState('');

  const femenino = catalogo.articulo === 'la';
  const tituloVista =
    modo === 'alta'
      ? `Nuev${femenino ? 'a' : 'o'} ${catalogo.singular}`
      : `Editar ${catalogo.singular}`;

  /** Validación rápida en cliente (el servidor vuelve a validar) */
  const validar = (): boolean => {
    const nuevos: Record<string, string> = {};

    for (const campo of catalogo.campos) {
      const limpio = (textos[campo.columna] ?? '').trim();
      if (!limpio) {
        nuevos[campo.columna] = `Escribe ${campo.etiqueta.toLowerCase()}.`;
      } else if (limpio.length > campo.maximo) {
        nuevos[campo.columna] = `Máximo ${campo.maximo} caracteres.`;
      }
    }

    // Evita duplicados sin ida y vuelta al servidor
    const nombre = (textos['nombre'] ?? '').trim();
    if (!nuevos['nombre'] && nombre) {
      const repetido = existentes.some(
        (v) => v.id !== valor?.id && v.nombre.toLowerCase() === nombre.toLowerCase(),
      );
      if (repetido) {
        nuevos['nombre'] = `Ese valor ya está registrado en ${catalogo.titulo}.`;
      }
    }

    setErrores(nuevos);
    return Object.keys(nuevos).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorGeneral('');
    if (!validar()) return;

    try {
      await onGuardar(textos);
      setErrores({});
    } catch (error) {
      // Los errores por campo llegan del servidor (p. ej. nombre duplicado)
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
        title={tituloVista}
        subtitle={
          modo === 'alta'
            ? `Agrega un valor al catálogo de ${catalogo.titulo.toLowerCase()}`
            : `Editando "${valor?.nombre ?? ''}"`
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        <Card
          title={catalogo.titulo}
          description={catalogo.descripcion}
          action={
            modo === 'editar' && valor ? (
              <span className="text-sm text-gray-400">ID {valor.id}</span>
            ) : undefined
          }
        >
          <div className="space-y-4">
            {catalogo.campos.map((campo) => (
              <Field
                key={campo.columna}
                label={campo.etiqueta}
                hint={campo.hint}
                error={errores[campo.columna]}
              >
                <Input
                  value={textos[campo.columna] ?? ''}
                  onChange={(e) =>
                    setTextos((prev) => ({ ...prev, [campo.columna]: e.target.value }))
                  }
                  onBlur={() => setErrores((prev) => ({ ...prev, [campo.columna]: '' }))}
                  placeholder={campo.placeholder}
                  maxLength={campo.maximo}
                  disabled={guardando}
                  aria-invalid={errores[campo.columna] ? true : undefined}
                />
              </Field>
            ))}
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
            {modo === 'alta' ? `Guardar ${catalogo.singular}` : 'Guardar cambios'}
          </Button>
        </div>
      </form>
    </div>
  );
}
