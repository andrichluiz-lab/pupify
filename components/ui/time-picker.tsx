"use client"

import { Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { useState } from "react"

interface TimePickerProps {
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function TimePicker({
  value,
  onChange,
  placeholder = "Selecione o horário",
  className,
  disabled = false,
}: TimePickerProps) {
  const [isOpen, setIsOpen] = useState(false)

  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"))
  const minutes = ["00", "15", "30", "45"]

  const [selectedHour, setSelectedHour] = useState(value?.split(":")[0] || "00")
  const [selectedMinute, setSelectedMinute] = useState(value?.split(":")[1] || "00")

  const handleConfirm = () => {
    onChange(`${selectedHour}:${selectedMinute}`)
    setIsOpen(false)
  }

  const handleClear = () => {
    onChange("")
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
          disabled={disabled}
        >
          <Clock className="mr-2 h-4 w-4" strokeWidth={1.75} />
          {value || placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-4" align="start">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Hora</label>
            <div className="grid grid-cols-6 gap-1">
              {hours.map((hour) => (
                <button
                  key={hour}
                  type="button"
                  onClick={() => setSelectedHour(hour)}
                  className={cn(
                    "h-9 rounded-md text-xs font-medium transition-colors",
                    selectedHour === hour
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/80"
                  )}
                >
                  {hour}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Minuto</label>
            <div className="grid grid-cols-4 gap-1">
              {minutes.map((minute) => (
                <button
                  key={minute}
                  type="button"
                  onClick={() => setSelectedMinute(minute)}
                  className={cn(
                    "h-9 rounded-md text-xs font-medium transition-colors",
                    selectedMinute === minute
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/80"
                  )}
                >
                  {minute}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="flex-1"
            >
              Limpar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirm}
              className="flex-1"
            >
              Confirmar
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
