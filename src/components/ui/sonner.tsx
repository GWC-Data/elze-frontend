import { Toaster as Sonner, type ToasterProps } from "sonner"
import {
  CircleCheckIcon,
  InfoIcon,
  TriangleAlertIcon,
  OctagonXIcon,
  Loader2Icon,
} from "lucide-react"

export const TOAST_DURATION_MS = 5000

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      position="bottom-right"
      duration={TOAST_DURATION_MS}
      closeButton
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--card)",
          "--normal-text": "var(--card-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast:
            "cn-toast !bg-card !text-card-foreground !border !border-border !border-l-4 !border-l-primary !shadow-lg font-sans",
          title: "!text-sm !font-semibold !text-foreground",
          description: "!text-[13px] !text-muted-foreground",
          icon: "!text-primary",
          success: "!border-l-primary [&_[data-icon]]:!text-primary",
          info: "!border-l-primary [&_[data-icon]]:!text-primary",
          loading: "!border-l-primary [&_[data-icon]]:!text-primary",
          warning: "!border-l-destructive/60 [&_[data-icon]]:!text-destructive",
          error: "!border-l-destructive [&_[data-icon]]:!text-destructive",
          actionButton: "!bg-primary !text-primary-foreground !font-medium",
          cancelButton: "!bg-muted !text-muted-foreground",
          closeButton: "!bg-card !text-muted-foreground !border-border hover:!text-foreground",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
