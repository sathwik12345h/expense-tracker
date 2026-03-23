"use client"

import { useState, useCallback, useRef } from "react"

interface VoiceResult {
  transcript: string
  intent: string
  data: Record<string, string | number | null>
}

function parseNumberWords(text: string): string {
  const ones: Record<string, number> = {
    zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5,
    six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
    eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
    sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
    twenty: 20, thirty: 30, forty: 40, fifty: 50,
    sixty: 60, seventy: 70, eighty: 80, ninety: 90,
  }
  const multipliers: Record<string, number> = {
    hundred: 100, thousand: 1000, lakh: 100000, million: 1000000,
  }

  let result = text.toLowerCase()

  // Replace "and" between numbers
  result = result.replace(/\band\b/g, " ")

  const words = result.split(/\s+/)
  let total = 0
  let current = 0
  let hasNumber = false

  words.forEach((word) => {
    if (ones[word] !== undefined) {
      current += ones[word]
      hasNumber = true
    } else if (multipliers[word]) {
      if (current === 0) current = 1
      if (multipliers[word] === 100) {
        current *= 100
      } else {
        total += current * multipliers[word]
        current = 0
      }
      hasNumber = true
    }
  })

  total += current

  if (hasNumber && total > 0) {
    // Replace the number words with the actual number in the text
    result = result.replace(
      /\b(zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|lakh|and)(\s+(zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|lakh|and))*\b/gi,
      String(total)
    )
  }

  return result
}

export function useVoiceInput() {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState("")
  const recognitionRef = useRef<any>(null)

  const startListening = useCallback((onResult: (result: VoiceResult) => void) => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      setError("Voice input not supported in this browser. Use Chrome or Edge.")
      return
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognitionRef.current = recognition

    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = "en-IN"

    recognition.onstart = () => {
      setIsListening(true)
      setError("")
      setTranscript("")
    }

    recognition.onresult = async (event: any) => {
      const rawText = event.results[0][0].transcript
      const text = parseNumberWords(rawText)
      setTranscript(text)
      setIsListening(false)
      setProcessing(true)

      try {
        const res = await fetch("/api/ai/voice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transcript: text }),
        })
        const data = await res.json()
        if (data.success) {
          onResult(data.result)
        } else {
          setError("Could not understand. Please try again.")
        }
      } catch {
        setError("Something went wrong. Please try again.")
      } finally {
        setProcessing(false)
      }
    }

    recognition.onerror = (event: any) => {
      setIsListening(false)
      setProcessing(false)
      if (event.error === "not-allowed") {
        setError("Microphone permission denied. Please allow microphone access.")
      } else if (event.error === "no-speech") {
        setError("No speech detected. Please try again.")
      } else {
        setError("Voice recognition failed. Please try again.")
      }
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognition.start()
  }, [])

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
    setIsListening(false)
  }, [])

  return { isListening, transcript, processing, error, startListening, stopListening }
}