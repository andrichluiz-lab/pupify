import { prisma } from './prisma.js'

export async function recalcFichaTotal(fichaId: string): Promise<void> {
  const { _sum } = await prisma.fichaItem.aggregate({
    where: { fichaId },
    _sum: { total: true },
  })
  await prisma.ficha.update({
    where: { id: fichaId },
    data: { totalAmount: _sum.total ?? 0 },
  })
}
