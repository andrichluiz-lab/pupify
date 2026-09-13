'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { Check } from 'lucide-react'
import { getErrorMessage } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DogIllustration } from '@/components/dog-illustration'

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export default function RegisterPage() {
  const { register } = useAuth()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  } as {
    name: string
    email: string
    password: string
    confirmPassword: string
  })
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isPasswordFocused, setIsPasswordFocused] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const passwordRequirements = [
    { id: 'length', label: 'Mínimo 8 caracteres', check: (pwd: string) => pwd.length >= 8 },
    { id: 'uppercase', label: 'Uma letra maiúscula', check: (pwd: string) => /[A-Z]/.test(pwd) },
    { id: 'lowercase', label: 'Uma letra minúscula', check: (pwd: string) => /[a-z]/.test(pwd) },
    { id: 'number', label: 'Um número', check: (pwd: string) => /[0-9]/.test(pwd) },
    { id: 'special', label: 'Um caractere especial', check: (pwd: string) => /[!@#$%^&*(),.?":{}|<>]/.test(pwd) },
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      if (formData.password !== formData.confirmPassword) {
        setError('As senhas não coincidem')
        setIsLoading(false)
        return
      }

      const tenantSlug = generateSlug(formData.name)
      await register({ 
        name: formData.name,
        email: formData.email,
        password: formData.password,
        clinicName: formData.name,
        tenantSlug 
      })
      // Force a full page reload to ensure middleware processes the cookie
      window.location.href = '/'
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-background relative">
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center p-4 md:p-6 lg:p-8">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="mb-6">
            <Image src="/logo_pupify.png" alt="Pupify" width={120} height={32} />
          </div>

          {/* Title */}
          <div className="mb-6">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">Complete seu cadastro</h2>
          </div>

          {/* Social Login Buttons */}
          <div className="flex flex-col gap-3 mb-6">
            <Button variant="outline" type="button" className="h-10 gap-2">
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continuar com Google
            </Button>
            <Button variant="outline" type="button" className="h-10 gap-2">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
              </svg>
              Continuar com Apple
            </Button>
          </div>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">ou</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Seu nome completo</Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="Seu nome completo"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                placeholder="seu@email.com"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  onFocus={() => setIsPasswordFocused(true)}
                  onBlur={() => setIsPasswordFocused(false)}
                  required
                  minLength={8}
                  placeholder="Senha"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" strokeWidth={1.75} />
                  ) : (
                    <Eye className="h-4 w-4" strokeWidth={1.75} />
                  )}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="confirmPassword">Confirmação de senha</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  onFocus={() => setIsPasswordFocused(true)}
                  onBlur={() => setIsPasswordFocused(false)}
                  required
                  placeholder="Confirmação de senha"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" strokeWidth={1.75} />
                  ) : (
                    <Eye className="h-4 w-4" strokeWidth={1.75} />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-2 rounded-lg text-sm">
                {error}
              </div>
            )}

            <Button type="submit" disabled={isLoading} className="w-full h-10">
              {isLoading ? 'Criando conta...' : 'Criar conta'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Já tem uma conta?{' '}
            <Link href="/login" className="text-primary hover:text-primary/90 font-medium">
              Conecte-se
            </Link>
          </p>
        </div>
      </div>

      {/* Right side - Marketing */}
      <div className="hidden lg:flex flex-1 flex-col justify-center bg-muted/30 p-8 lg:p-12">
        <div className="max-w-lg">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground mb-4">
            Gestão para Clínicas Veterinárias
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            Gerencie sua clínica veterinária de forma simples e eficiente.
          </p>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Agendamento de consultas
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Gestão de pacientes
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Controle financeiro
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Gestão de estoque
            </li>
          </ul>
        </div>
      </div>

      {/* Fixed Dog Illustration at bottom */}
      <div className="hidden md:fixed bottom-0 right-0 z-50 pointer-events-none md:flex">
        <DogIllustration shouldCloseEyes={isPasswordFocused} />
      </div>
    </div>
  )
}
