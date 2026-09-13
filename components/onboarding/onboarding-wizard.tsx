'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, ChevronLeft, SkipForward, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StepClinicProfile } from './step-clinic-profile'
import { StepHours } from './step-hours'
import { StepVeterinarian } from './step-veterinarian'
import { StepServices } from './step-services'
import { StepPatient } from './step-patient'
import { StepComplete } from './step-complete'
import { getTenantOnboardingStatus, updateOnboardingProgress } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/api-client'

const steps = [
  { id: 1, title: 'Perfil da Clínica', description: 'Configure os dados da sua clínica' },
  { id: 2, title: 'Horários', description: 'Defina os horários de funcionamento' },
  { id: 3, title: 'Veterinário', description: 'Adicione o primeiro veterinário' },
  { id: 4, title: 'Serviços', description: 'Configure serviços e preços' },
  { id: 5, title: 'Primeiro Paciente', description: 'Cadastre um paciente para começar' },
]

export function OnboardingWizard() {
  const router = useRouter()
  const { toast } = useToast()
  const [currentStep, setCurrentStep] = useState(1)
  const [isCompleted, setIsCompleted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleNext = async () => {
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1)
      await updateOnboardingProgress({ step: currentStep + 1 })
    } else {
      await handleComplete()
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSkip = async () => {
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1)
      await updateOnboardingProgress({ step: currentStep + 1 })
    }
  }

  const handleComplete = async () => {
    setIsLoading(true)
    try {
      await updateOnboardingProgress({ completed: true })
      setIsCompleted(true)
      toast({
        title: 'Onboarding concluído!',
        description: 'Bem-vindo ao Pupify! Sua clínica está configurada.',
      })
      setTimeout(() => {
        router.push('/')
      }, 2000)
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao concluir onboarding',
        description: getErrorMessage(error),
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isCompleted) {
    return <StepComplete />
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="mx-auto max-w-4xl px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Configuração Inicial</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Passo {currentStep} de {steps.length}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {steps.map((step) => (
                <div
                  key={step.id}
                  className={`h-2 w-8 rounded-full transition-colors ${
                    step.id <= currentStep ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="mx-auto max-w-4xl px-4 py-6">
        <div className="grid grid-cols-5 gap-2">
          {steps.map((step) => (
            <div
              key={step.id}
              className={`flex flex-col items-center text-center ${
                step.id === currentStep ? 'opacity-100' : 'opacity-50'
              }`}
            >
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-medium transition-colors ${
                  step.id < currentStep
                    ? 'border-primary bg-primary text-primary-foreground'
                    : step.id === currentStep
                    ? 'border-primary text-primary'
                    : 'border-border text-muted-foreground'
                }`}
              >
                {step.id < currentStep ? (
                  <Check className="h-4 w-4" strokeWidth={1.75} />
                ) : (
                  step.id
                )}
              </div>
              <p className="mt-2 text-xs font-medium">{step.title}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="mx-auto max-w-4xl px-4 pb-24">
        <div className="rounded-lg border border-border bg-card p-6">
          {currentStep === 1 && <StepClinicProfile onNext={handleNext} onSkip={handleSkip} />}
          {currentStep === 2 && <StepHours onNext={handleNext} onSkip={handleSkip} />}
          {currentStep === 3 && <StepVeterinarian onNext={handleNext} onSkip={handleSkip} />}
          {currentStep === 4 && <StepServices onNext={handleNext} onSkip={handleSkip} />}
          {currentStep === 5 && <StepPatient onNext={handleComplete} onSkip={handleSkip} />}
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-background/95 backdrop-blur-md">
        <div className="mx-auto max-w-4xl px-4 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="default"
              onClick={handleBack}
              disabled={currentStep === 1}
              className="gap-2"
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
              Voltar
            </Button>
            <div className="flex items-center gap-2">
              {currentStep < 5 && (
                <Button
                  variant="ghost"
                  size="default"
                  onClick={handleSkip}
                  className="gap-2"
                >
                  <SkipForward className="h-4 w-4" strokeWidth={1.75} />
                  Pular
                </Button>
              )}
              <Button
                size="default"
                onClick={handleNext}
                disabled={isLoading}
                className="gap-2"
              >
                {currentStep === 5 ? 'Concluir' : 'Próximo'}
                <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
