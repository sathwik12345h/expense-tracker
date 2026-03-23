export function speak(text: string) {
  if (!("speechSynthesis" in window)) return

  // Cancel any ongoing speech
  window.speechSynthesis.cancel()

  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = "en-IN"
  utterance.rate = 1.1
  utterance.pitch = 1
  utterance.volume = 0.8

  // Pick a natural voice if available
  const voices = window.speechSynthesis.getVoices()
  const preferredVoice = voices.find((v) =>
    v.lang.includes("en") && (v.name.includes("Google") || v.name.includes("Natural"))
  )
  if (preferredVoice) utterance.voice = preferredVoice

  window.speechSynthesis.speak(utterance)
}