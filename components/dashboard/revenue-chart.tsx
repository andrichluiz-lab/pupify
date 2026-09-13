"use client"

import { Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts"
import type { RevenuePoint } from "@/lib/types"

type Props = {
  data: RevenuePoint[]
}

function formatBRL(n: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(n)
}

function formatDay(d: string) {
  const date = new Date(d + "T12:00:00")
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
}

export function RevenueChart({ data }: Props) {
  return (
    <div className="h-[260px] w-full">
      <AreaChart width={1029} height={260} data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          <defs>
            <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.2} />
              <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tickFormatter={formatDay}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
            minTickGap={24}
          />
          <YAxis
            tickFormatter={(v) => `R$ ${Math.round(v / 100) / 10}k`}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
            width={48}
          />
          <Tooltip
            cursor={{ stroke: "var(--color-border)", strokeWidth: 1 }}
            contentStyle={{
              background: "var(--color-popover)",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              fontSize: 12,
              padding: "8px 10px",
            }}
            labelFormatter={(l) => formatDay(String(l))}
            formatter={(value: number, name: string) => {
              if (name === "revenue") return [formatBRL(value), "Receita"]
              return [value, "Atendimentos"]
            }}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="var(--color-primary)"
            strokeWidth={2}
            fill="url(#revFill)"
          />
        </AreaChart>
      </div>
    )
}
