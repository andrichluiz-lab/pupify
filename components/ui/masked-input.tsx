import * as React from 'react'
import { IMaskInput } from 'react-imask'

import { cn } from '@/lib/utils'

interface MaskedInputProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mask: any
  value?: string
  onChange?: (value: string) => void
  definitions?: Record<string, RegExp>
  lazy?: boolean
  placeholderChar?: string
  unmask?: boolean
  className?: string
  type?: React.HTMLInputTypeAttribute
  disabled?: boolean
  placeholder?: string
  id?: string
  name?: string
  required?: boolean
}

function MaskedInput({
  className,
  mask,
  value,
  onChange,
  definitions,
  lazy = true,
  placeholderChar = '',
  unmask = false,
  type = 'text',
  disabled,
  placeholder,
  id,
  name,
  required,
}: MaskedInputProps) {
  return (
    <IMaskInput
      mask={mask}
      value={value}
      onAccept={(value: string) => onChange?.(value)}
      definitions={definitions}
      lazy={lazy}
      placeholderChar={placeholderChar}
      unmask={unmask}
      className={cn(
        'file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
        'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
        'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
        className,
      )}
      type={type}
      disabled={disabled}
      placeholder={placeholder}
      id={id}
      name={name}
      required={required}
    />
  )
}

// Predefined masks for common Brazilian formats
export const masks = {
  cpf: '000.000.000-00',
  cnpj: '00.000.000/0000-00',
  phone: '(00) 00000-0000',
  phoneWithDDD: '(00) 0000-0000',
  cep: '00000-000',
  rg: '00.000.000-0',
  currency: Number,
  placa: 'AAA-0A00',
  placaMercosul: 'AAA0A00',
}

export { MaskedInput }
