'use client'

import { useEffect, useRef } from 'react'

interface DogIllustrationProps {
  shouldCloseEyes?: boolean
}

export function DogIllustration({ shouldCloseEyes = false }: DogIllustrationProps) {
  const dogRef = useRef<SVGGElement>(null)
  const pupilLRef = useRef<SVGGElement>(null)
  const pupilRRef = useRef<SVGGElement>(null)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const windowWidth = window.innerWidth
      const windowHeight = window.innerHeight

      const xPercent = (e.clientX / windowWidth - 0.5) * 2
      const yPercent = (e.clientY / windowHeight - 0.5) * 2

      const maxEyeMoveX = 14
      const maxEyeMoveY = 16
      const maxDogMoveX = 40

      if (pupilLRef.current) {
        pupilLRef.current.style.transform = `translate(${xPercent * maxEyeMoveX}px, ${yPercent * maxEyeMoveY}px)`
      }
      if (pupilRRef.current) {
        pupilRRef.current.style.transform = `translate(${xPercent * maxEyeMoveX}px, ${yPercent * maxEyeMoveY}px)`
      }
      if (dogRef.current) {
        dogRef.current.style.transform = `translateX(${xPercent * maxDogMoveX}px)`
      }
    }

    document.addEventListener('mousemove', handleMouseMove)
    return () => document.removeEventListener('mousemove', handleMouseMove)
  }, [])

  return (
    <div className="flex items-end justify-center w-full h-64">
      <svg 
        viewBox="0 0 400 300" 
        xmlns="http://www.w3.org/2000/svg" 
        className="w-auto h-full max-w-[500px] select-none"
      >
        <g id="dog" ref={dogRef} style={{ transition: 'transform 0.05s linear' }}>
          <path d="M 80,200 C 30,220 30,280 70,300 C 100,280 110,240 100,200 Z" fill="#006a46" />
          <path d="M 320,200 C 370,220 370,280 330,300 C 300,280 290,240 300,200 Z" fill="#006a46" />
          <path d="M 50 300 A 150 150 0 0 1 350 300 Z" fill="#008b5c"/>
          <circle cx="105" cy="250" r="32" fill="#007a51" opacity="0.8"/>
          <circle cx="295" cy="250" r="32" fill="#007a51" opacity="0.8"/>
          
          {/* Olhos brancos */}
          <ellipse cx="150" cy="180" rx="35" ry="42" fill="white" style={{ transition: 'opacity 0.2s', opacity: shouldCloseEyes ? 0 : 1 }} />
          <ellipse cx="250" cy="180" rx="35" ry="42" fill="white" style={{ transition: 'opacity 0.2s', opacity: shouldCloseEyes ? 0 : 1 }} />
          
          {/* Olhos fechados */}
          <path d="M 115,180 Q 150,165 185,180" fill="none" stroke="#1a1a1a" strokeWidth="4" strokeLinecap="round" style={{ transition: 'opacity 0.2s', opacity: shouldCloseEyes ? 1 : 0 }} />
          <path d="M 215,180 Q 250,165 285,180" fill="none" stroke="#1a1a1a" strokeWidth="4" strokeLinecap="round" style={{ transition: 'opacity 0.2s', opacity: shouldCloseEyes ? 1 : 0 }} />
          
          {/* Pupilas */}
          <g id="pupil_l" ref={pupilLRef} style={{ transition: 'transform 0.05s linear, opacity 0.2s', opacity: shouldCloseEyes ? 0 : 1 }}>
            <circle cx="150" cy="180" r="22" fill="#1a1a1a" />
            <circle cx="158" cy="170" r="6" fill="white" opacity="0.8" />
          </g>
          <g id="pupil_r" ref={pupilRRef} style={{ transition: 'transform 0.05s linear, opacity 0.2s', opacity: shouldCloseEyes ? 0 : 1 }}>
            <circle cx="250" cy="180" r="22" fill="#1a1a1a" />
            <circle cx="258" cy="170" r="6" fill="white" opacity="0.8" />
          </g>
          
          <ellipse cx="200" cy="235" rx="18" ry="12" fill="#1a1a1a"/>
          <path d="M 175 255 Q 200 275 225 255" fill="none" stroke="#1a1a1a" strokeWidth="8" strokeLinecap="round"/>
        </g>
      </svg>
    </div>
  )
}
