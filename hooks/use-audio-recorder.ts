import { useState, useRef, useCallback } from 'react'

export interface TranscriptSegment {
  speaker: 'veterinario' | 'tutor'
  text: string
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [transcript, setTranscript] = useState<TranscriptSegment[]>([])

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const lastSentIndexRef = useRef(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []
      lastSentIndexRef.current = 0

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.start(1000)
      setIsRecording(true)
      setIsPaused(false)
      setElapsedSeconds(0)

      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1)
      }, 1000)
    } catch (error: unknown) {
      console.error('Error starting recording:', error)
      throw error
    }
  }, [])

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.pause()
      setIsPaused(true)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isRecording])

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && isPaused) {
      mediaRecorderRef.current.resume()
      setIsPaused(false)
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1)
      }, 1000)
    }
  }, [isPaused])

  const stopRecording = useCallback(async () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      setIsPaused(false)
      if (timerRef.current) clearInterval(timerRef.current)
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }

      return new Promise<Blob>((resolve) => {
        mediaRecorderRef.current!.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
          resolve(audioBlob)
        }
      })
    }
    return Promise.resolve(new Blob())
  }, [])

  const resetRecording = useCallback(() => {
    setIsRecording(false)
    setIsPaused(false)
    setElapsedSeconds(0)
    setTranscript([])
    audioChunksRef.current = []
    lastSentIndexRef.current = 0
    if (timerRef.current) clearInterval(timerRef.current)
  }, [])

  const addTranscriptSegment = useCallback((segment: TranscriptSegment) => {
    setTranscript((prev) => [...prev, segment])
  }, [])

  const addTranscriptSegments = useCallback((segments: TranscriptSegment[]) => {
    setTranscript((prev) => [...prev, ...segments])
  }, [])

  // Get new audio chunks since last call as base64
  const getNewChunksBase64 = useCallback(async (): Promise<string | null> => {
    const chunks = audioChunksRef.current
    const fromIndex = lastSentIndexRef.current
    if (fromIndex >= chunks.length) return null

    const newChunks = chunks.slice(fromIndex)
    lastSentIndexRef.current = chunks.length

    const blob = new Blob(newChunks, { type: 'audio/webm' })
    if (blob.size < 500) return null // Skip tiny chunks (silence)

    return blobToBase64(blob)
  }, [])

  // Get all audio as base64
  const getFullAudioBase64 = useCallback(async (): Promise<string> => {
    const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
    return blobToBase64(blob)
  }, [])

  // Get all audio as Blob
  const getAudioBlob = useCallback((): Blob => {
    return new Blob(audioChunksRef.current, { type: 'audio/webm' })
  }, [])

  return {
    isRecording,
    isPaused,
    elapsedSeconds,
    transcript,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    resetRecording,
    addTranscriptSegment,
    addTranscriptSegments,
    getNewChunksBase64,
    getFullAudioBase64,
    getAudioBlob,
  }
}
