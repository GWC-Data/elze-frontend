import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn, textOnly } from "@/lib/utils"
import { Slot } from "radix-ui"

const badgeVariants = cva(
  "group/badge inline-flex w-fit shrink-0 items-center gap-1 text-xs font-medium whitespace-nowrap focus-visible:underline [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "font-semibold text-primary",
        secondary: "text-muted-foreground",
        destructive: "font-semibold text-destructive",
        outline: "text-foreground",
        ghost: "text-muted-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), textOnly(className))}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
