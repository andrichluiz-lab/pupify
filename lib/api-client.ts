// HTTP client with error handling and interceptors
// This provides a centralized way to make API calls with consistent error handling

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001'

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public response?: unknown
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// Error message translations
const errorMessages: Record<number, string> = {
  400: 'Dados inválidos. Verifique as informações e tente novamente.',
  401: 'Não autorizado. Faça login novamente.',
  403: 'Você não tem permissão para realizar esta ação.',
  404: 'Registro não encontrado.',
  409: 'Conflito de dados. Este registro já existe.',
  429: 'Muitas solicitações. Aguarde alguns segundos e tente novamente.',
  500: 'Erro interno do servidor. Tente novamente mais tarde.',
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status && errorMessages[error.status]) {
      return errorMessages[error.status]
    }
    if (typeof error.response === 'object' && error.response !== null) {
      const response = error.response as Record<string, unknown>
      if (typeof response.message === 'string') {
        return response.message
      }
      if (typeof response.error === 'string') {
        return response.error
      }
    }
    return error.message || 'Ocorreu um erro inesperado.'
  }
  if (error instanceof Error) {
    return error.message || 'Ocorreu um erro inesperado.'
  }
  return 'Ocorreu um erro inesperado.'
}

interface RequestOptions extends RequestInit {
  timeout?: number
  skipAuth?: boolean
}

async function getAuthToken(): Promise<string | null> {
  // Check if running on server
  if (typeof window === 'undefined') {
    // Server-side: read cookies using Next.js cookies()
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    return cookieStore.get('auth_token')?.value || null
  }

  // Client-side: token is in HttpOnly cookie, fetch will include it automatically
  // We just need to check if cookie exists
  const cookieToken = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth_token='))
    ?.split('=')[1]
  return cookieToken || null
}

async function handleResponse(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type')

  if (!response.ok) {
    let errorData: unknown
    try {
      if (contentType?.includes('application/json')) {
        errorData = await response.json()
      } else {
        errorData = await response.text()
      }
    } catch {
      errorData = null
    }

    throw new ApiError(
      `API request failed: ${response.statusText}`,
      response.status,
      errorData
    )
  }

  if (contentType?.includes('application/json')) {
    return response.json()
  }

  return response.text()
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout = 30000
): Promise<Response> {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    })
    clearTimeout(id)
    return response
  } catch (error) {
    clearTimeout(id)
    throw error
  }
}

async function fetchWithAuth(
  url: string,
  options: RequestOptions = {},
  isRetry = false
): Promise<Response> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  }

  // Only add Content-Type for requests with a body
  if (options.body || options.method === 'POST' || options.method === 'PUT') {
    headers['Content-Type'] = 'application/json'
  }

  // Server-side: read cookies and pass them in Cookie header
  if (typeof window === 'undefined') {
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    const authToken = cookieStore.get('auth_token')?.value
    const refreshToken = cookieStore.get('refresh_token')?.value
    
    if (authToken || refreshToken) {
      const cookieParts: string[] = []
      if (authToken) cookieParts.push(`auth_token=${authToken}`)
      if (refreshToken) cookieParts.push(`refresh_token=${refreshToken}`)
      headers['Cookie'] = cookieParts.join('; ')
    }
  }

  const response = await fetchWithTimeout(url, {
    ...options,
    headers,
    credentials: typeof window === 'undefined' ? undefined : 'include',
  })

  // Handle 401 Unauthorized - try to refresh token.
  // Only on the client: in a server component the Set-Cookie from /auth/refresh
  // can't be propagated back to the browser, so refreshing there is pointless
  // (the retry would reuse the stale cookie). Let the 401 propagate and the
  // client AuthProvider will refresh / redirect on the next render.
  if (
    response.status === 401 &&
    !isRetry &&
    !options.skipAuth &&
    typeof window !== 'undefined'
  ) {
    try {
      const refreshResponse = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      })

      if (refreshResponse.ok) {
        return fetchWithAuth(url, options, true)
      }
    } catch (error) {
      console.error('Token refresh failed:', error)
    }
  }

  return response
}

export async function get<T = unknown>(
  endpoint: string,
  options?: RequestOptions
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`
  const response = await fetchWithAuth(url, {
    ...options,
    method: 'GET',
  })
  return handleResponse(response) as Promise<T>
}

export async function post<T = unknown>(
  endpoint: string,
  data?: unknown,
  options?: RequestOptions
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`
  const response = await fetchWithAuth(url, {
    ...options,
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  })
  return handleResponse(response) as Promise<T>
}

export async function put<T = unknown>(
  endpoint: string,
  data?: unknown,
  options?: RequestOptions
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`
  const response = await fetchWithAuth(url, {
    ...options,
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  })
  return handleResponse(response) as Promise<T>
}

export async function patch<T = unknown>(
  endpoint: string,
  data?: unknown,
  options?: RequestOptions
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`
  const response = await fetchWithAuth(url, {
    ...options,
    method: 'PATCH',
    body: data ? JSON.stringify(data) : undefined,
  })
  return handleResponse(response) as Promise<T>
}

export async function del<T = unknown>(
  endpoint: string,
  options?: RequestOptions
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`
  const response = await fetchWithAuth(url, {
    ...options,
    method: 'DELETE',
  })
  return handleResponse(response) as Promise<T>
}
