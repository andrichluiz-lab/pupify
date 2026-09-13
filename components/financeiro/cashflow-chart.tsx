"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

interface CashflowChartProps {
  data: Array<{ month: string; entrada: number; saida: number }>
}

const config = {
  entrada: { label: "Entradas", color: "var(--primary)" },
  saida: { label: "Saídas", color: "var(--muted-foreground)" },
} as const

function brlShort(v: number) {
  if (v >= 1000) return `${(v / 1000).toFixed(0)}k`
  return v.toString()
}

export function CashflowChart({ data }: CashflowChartProps) {
  return (
    <ChartContainer config={config} className="h-[260px] w-full">
      <BarChart width={1029} height={260} data={data} barCategoryGap="25%">
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="month"
            tickLine={false}
            axisLine={false}
            stroke="var(--muted-foreground)"
            fontSize={11}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            stroke="var(--muted-foreground)"
            fontSize={11}
            tickFormatter={(v) => brlShort(Number(v))}
            width={36}
          />
          <ChartTooltip
            cursor={{ fill: "var(--muted)", opacity: 0.3 }}
            content={
              <ChartTooltipContent
                formatter={(value) =>
                  Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                }
              />
            }
          />
          <Bar dataKey="entrada" fill="var(--color-entrada)" radius={[4, 4, 0, 0]} />
          <Bar dataKey="saida" fill="var(--color-saida)" radius={[4, 4, 0, 0]} opacity={0.5} />
        </BarChart>
    </ChartContainer>
  )
}
