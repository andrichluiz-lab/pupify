const BASE_URL = process.env.EVOLUTION_API_URL ?? ''
const API_KEY = process.env.EVOLUTION_API_KEY ?? ''

async function req<T>(method: string, path: string, body?: unknown, customApiKey?: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      apikey: customApiKey || API_KEY,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`Evolution API ${method} ${path} → ${res.status}: ${text}`)
  }
  return res.json() as Promise<T>
}

export interface EvolutionContact {
  id: string
  name?: string
  pushName?: string
  profilePictureUrl?: string
}

export interface EvolutionMessage {
  key: { id: string; remoteJid: string; fromMe: boolean }
  message?: { conversation?: string; extendedTextMessage?: { text: string } }
  messageType: string
  messageTimestamp: number
  pushName?: string
}

interface EvolutionContactRaw {
  Jid?: string
  jid?: string
  PushName?: string
  pushName?: string
  FullName?: string
  fullName?: string
}

interface EvolutionContactsResponse {
  data?: EvolutionContactRaw[]
}

type QRCodeResponse = { base64: string; code: string } | { connected: true } | null

export async function createInstance(instanceName: string, _webhookUrl: string): Promise<{ instanceId: string, instanceToken: string }> {
  const instanceId = crypto.randomUUID()
  const instanceToken = crypto.randomUUID()
  await req('POST', '/instance/create', {
    instanceId,
    name: instanceName,
    token: instanceToken,
  })
  return { instanceId, instanceToken }
}

export async function getQRCode(
  instanceToken: string,
  _instanceName: string,
  webhookUrl: string
): Promise<QRCodeResponse> {
  try {
    // Connect the instance with webhook and subscribe to essential events
    await req('POST', '/instance/connect', { 
      webhookUrl,
      webhookBase64: true,
      subscribe: ["CONNECTION", "MESSAGE", "QRCODE", "CONTACT", "HISTORY_SYNC"],
    }, instanceToken)
    
    // Get QR code
    const qrResponse = await req<{ data?: { Qrcode?: string; Code?: string } }>(
      'GET',
      '/instance/qr',
      undefined,
      instanceToken
    )
    if (qrResponse.data?.Qrcode && qrResponse.data?.Code) {
      return { base64: qrResponse.data.Qrcode, code: qrResponse.data.Code }
    }
    return null
  } catch (error) {
    console.error('[WhatsApp QR] Error:', error)
    if (error instanceof Error && error.message.includes('session already logged in')) {
      return { connected: true }
    }
    return null
  }
}

export async function fetchContacts(instanceToken: string): Promise<EvolutionContact[]> {
  try {
    const data = await req<EvolutionContactsResponse>('GET', '/user/contacts', undefined, instanceToken)
    // API returns { data: [...] }
    const rawContacts = data?.data ?? []
    
    return rawContacts.map((c: EvolutionContactRaw) => ({
      id: c.Jid || c.jid || '',
      pushName: c.PushName || c.pushName || c.FullName || c.fullName || undefined,
    }))
  } catch {
    return []
  }
}

export async function getConnectionState(
  instanceToken: string,
  instanceName: string
): Promise<'open' | 'connecting' | 'close'> {
  try {
    const data = await req<{ instance?: { state?: string } }>(
      'GET',
      `/instance/status?instanceId=${instanceName}`,
      undefined,
      instanceToken
    )
    const state = data?.instance?.state
    if (state === 'open') return 'open'
    if (state === 'connecting') return 'connecting'
    return 'close'
  } catch {
    return 'close'
  }
}

export async function sendTextMessage(
  instanceToken: string,
  lid: string,
  text: string
): Promise<{ key: { id: string } }> {
  return req('POST', `/send/text`, {
    number: lid,
    text,
    delay: 1200,
  }, instanceToken)
}

export async function sendMediaMessage(
  instanceToken: string,
  to: string,
  mediatype: 'image' | 'document' | 'video' | 'audio',
  mimetype: string,
  media: string,
  caption?: string,
  fileName?: string,
): Promise<{ key: { id: string } }> {
  return req('POST', '/send/media', {
    number: to,
    mediatype,
    mimetype,
    media,
    caption: caption || undefined,
    fileName: fileName || undefined,
    delay: 1200,
  }, instanceToken)
}

export async function disconnectInstance(instanceName: string): Promise<void> {
  await req('DELETE', '/instance/logout', { instanceId: instanceName })
}

export async function deleteInstance(instanceName: string): Promise<void> {
  await req('DELETE', `/instance/delete/${instanceName}`)
}

// Not available in Evolution API v2 (go) - messages are received via webhook
export async function fetchMessages(
  _instanceName: string,
  _remoteJid: string,
  _limit = 50
): Promise<EvolutionMessage[]> {
  return []
}

export async function requestHistorySync(
  instanceToken: string,
  count = 100
): Promise<void> {
  await req('POST', '/chat/history-sync-request', {
    count,
  }, instanceToken)
}
