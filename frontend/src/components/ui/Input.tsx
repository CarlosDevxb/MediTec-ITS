import React, { useState } from 'react';
import { Eye, EyeOff, type LucideIcon } from 'lucide-react';

/* ============================================================
   FORMULARIO · Primitivas: Field (label), Input, Textarea, Select
   Patrón:  <Field label="Peso (kg)"><Input placeholder="70.5" /></Field>
   ============================================================ */

interface FieldProps {
  label: string;
  /** Variante compacta: label más pequeño para rejillas densas */
  variant?: 'default' | 'compact';
  hint?: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}

export function Field({
  label,
  variant = 'default',
  hint,
  error,
  className = '',
  children,
}: FieldProps) {
  const labelClasses =
    variant === 'compact'
      ? 'block text-sm font-medium text-gray-500 mb-1'
      : 'block text-base font-semibold text-gray-700 mb-1.5';

  return (
    <div className={className}>
      <label className={labelClasses}>{label}</label>
      {children}
      {error ? (
        <p className="text-xs text-red-600 mt-1 font-medium">{error}</p>
      ) : (
        hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>
      )}
    </div>
  );
}

const CONTROL_BASE =
  'w-full border border-gray-300 rounded-lg px-4 py-3.5 text-base text-gray-800 ' +
  'placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-600/40 ' +
  'focus:border-transparent transition-colors';

interface ControlProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Icono lucide posicionado a la izquierda (buscadores) */
  icon?: LucideIcon;
}

export function Input({ icon: Icon, className = '', ...props }: ControlProps) {
  if (Icon) {
    return (
      <div className="relative">
        <Icon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input className={`${CONTROL_BASE} pl-10 ${className}`} {...props} />
      </div>
    );
  }
  return <input className={`${CONTROL_BASE} ${className}`} {...props} />;
}

export function Textarea({
  className = '',
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${CONTROL_BASE} resize-none ${className}`} {...props} />;
}

export function Select({
  className = '',
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={`${CONTROL_BASE} ${className}`} {...props}>
      {children}
    </select>
  );
}

/* ============================================================
   PASSWORD INPUT · Campo de contraseña con botón de ojo
   para mostrar u ocultar (integrado al design system)
   ============================================================ */

export function PasswordInput({
  className = '',
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        type={visible ? 'text' : 'password'}
        className={`${CONTROL_BASE} pr-12 ${className}`}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible(!visible)}
        aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        aria-pressed={visible}
        title={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-brand-800 hover:bg-brand-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/40"
      >
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}
