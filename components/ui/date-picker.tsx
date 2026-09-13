"use client"

import { useState } from "react"
import { Calendar as CalendarIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"
import { ptBR as ptBRDayPicker } from "react-day-picker/locale"

interface DatePickerProps {
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Selecione a data",
  className,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false)

  const selectedDate = value ? parseISO(value) : undefined

  const handleSelect = (date: Date | undefined) => {
    if (date) {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      onChange(`${year}-${month}-${day}`)
    } else {
      onChange("")
    }
    setIsOpen(false)
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" strokeWidth={1.75} />
          {value ? format(selectedDate!, "dd/MM/yyyy", { locale: ptBR }) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleSelect}
          initialFocus
          locale={ptBRDayPicker}
        />
      </PopoverContent>
    </Popover>
  )
}
