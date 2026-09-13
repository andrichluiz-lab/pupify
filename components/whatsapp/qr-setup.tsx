'use client'

import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import { Loader2, Wifi, WifiOff, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { connectWhatsApp, getWhatsAppInstance, getWhatsAppQR } from '@/lib/api'
import type { WhatsAppInstance } from '@/lib/types'

interface Props {
  onConnected: (instance: WhatsAppInstance) => void
}

export function QRSetup({ onConnected }: Props) {
  const [qrBase64, setQrBase64] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'connecting' | 'waiting_qr' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  const startConnection = useCallback(async () => {
    setStatus('connecting')
    setError(null)
    setQrBase64(null)
    try {
      await connectWhatsApp()
      setStatus('waiting_qr')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao iniciar conexão'
      setError(msg)
      setStatus('error')
    }
  }, [])

  const refreshQR = useCallback(async () => {
    try {
      const qr = await getWhatsAppQR()
      if (qr?.base64) setQrBase64(qr.base64)
    } catch (e) {
      console.error('Erro ao atualizar QR code:', e)
    }
  }, [])

  useEffect(() => {
    if (status !== 'waiting_qr') return

    const interval = setInterval(async () => {
      const instance = await getWhatsAppInstance()
      if (instance?.status === 'connected') {
        clearInterval(interval)
        onConnected(instance)
        return
      }
      const qr = await getWhatsAppQR()
      if (qr?.base64) setQrBase64(qr.base64)
    }, 3000)

    return () => clearInterval(interval)
  }, [status, onConnected])

  return (
    <div className="flex flex-col items-center justify-center gap-6 py-16">
      <div className="flex flex-col items-center gap-2 text-center">
        <WifiOff className="h-10 w-10 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Conectar WhatsApp</h2>
        <p className="max-w-xs text-sm text-muted-foreground">
          Escaneie o QR code com seu WhatsApp para conectar o número da clínica.
        </p>
      </div>

      {status === 'idle' && (
        <Button onClick={startConnection}>
          <Wifi className="mr-2 h-4 w-4" />
          Conectar
        </Button>
      )}

      {status === 'connecting' && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Iniciando conexão...
        </div>
      )}

      {status === 'waiting_qr' && (
        <div className="flex flex-col items-center gap-4">
          {qrBase64 ? (
            <div className="flex flex-col items-center gap-4">
              <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
                <Image
                  src={qrBase64.startsWith('data:') ? qrBase64 : `data:image/png;base64,${qrBase64}`}
                  alt="QR Code WhatsApp"
                  width={220}
                  height={220}
                  unoptimized
                />
              </div>
              <Button variant="outline" size="sm" onClick={refreshQR}>
                <RefreshCw className="mr-2 h-3.5 w-3.5" />
                Atualizar QR Code
              </Button>
              <div className="max-w-md rounded-lg border border-border bg-muted/50 p-4">
                <h3 className="mb-3 text-sm font-medium">Como conectar:</h3>
                <ol className="list-inside list-decimal space-y-1.5 text-xs text-muted-foreground">
                  <li>Abra o WhatsApp no seu celular</li>
                  <li>Toque em Menu ou Configurações</li>
                  <li>Toque em Dispositivos conectados</li>
                  <li>Toque em Conectar um dispositivo</li>
                  <li>Aponte seu celular para esta tela para capturar o código</li>
                </ol>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-[252px] w-[252px] items-center justify-center rounded-xl border border-border bg-muted">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground">
                Aguardando leitura do QR code…
              </p>
            </div>
          )}
        </div>
      )}

      {status === 'error' && (
        <div className="flex flex-col items-center gap-3">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" onClick={startConnection}>
            Tentar novamente
          </Button>
        </div>
      )}
    </div>
  )
}
