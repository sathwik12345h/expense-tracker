"use client"

import AIStreamChat from "@/components/AIStreamChat"
import { Sheet, SheetHeader } from "@/components/ui/Sheet"

interface Props {
  onClose: () => void
  onPrefillExpense?: (data: { name?: string; amount?: number; category?: string }) => void
  initialQuery?: string
}

/**
 * The "Ask" drawer. Nothing is fetched on open — the model is only called
 * once a question is actually asked.
 */
export default function AIAssistant({ onClose, initialQuery }: Props) {
  return (
    <Sheet label="Ask Spendwise" width={620} onClose={onClose} className="h-[92dvh] sm:h-auto">
      {(close) => (
        <>
          <SheetHeader
            eyebrow="Ask your ledger"
            title={<>Ask <span className="italic">Spendwise</span></>}
            subtitle="Answers come from your own entries."
            onClose={close}
          />
          <div aria-hidden className="perforation mx-6 mb-4 sm:mx-7" />
          <div className="flex min-h-0 flex-1 flex-col">
            <AIStreamChat initialQuery={initialQuery} />
          </div>
        </>
      )}
    </Sheet>
  )
}
