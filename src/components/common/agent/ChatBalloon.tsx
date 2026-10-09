import chatBalloon from "@/assets/images/chat-balloon.png"
import { cn } from "@/lib/utils"

export function ChatBalloon({ className }: { className?: string }) {
  return (
    <img
      src={chatBalloon}
      alt=""
      aria-hidden
      draggable={false}
      className={cn("h-auto w-28 select-none", className)}
    />
  )
}
