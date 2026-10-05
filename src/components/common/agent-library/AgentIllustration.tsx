import { cn } from "@/lib/utils"

// The Agent Library's own artwork (the Data analyst keeps its chat balloon): an agent
// at the centre, the published contexts it answers from stacked beside it, and a
// conversation leaving it. Inline SVG drawn from theme tokens, so it follows light/dark.
export function AgentIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 240 180"
      role="img"
      aria-hidden
      className={cn("h-auto w-48", className)}
      fill="none"
    >
      {/* backdrop */}
      <circle cx="120" cy="92" r="72" fill="var(--muted)" />
      <circle cx="120" cy="92" r="72" stroke="var(--border)" strokeDasharray="3 6" />
      <circle cx="120" cy="92" r="52" stroke="var(--border)" />

      {/* context layers (left) */}
      <g transform="translate(22 70)">
        <path d="M0 24 L28 12 L56 24 L28 36 Z" fill="var(--card)" stroke="var(--link)" strokeWidth="1.5" />
        <path d="M0 16 L28 4 L56 16 L28 28 Z" fill="var(--card)" stroke="var(--link)" strokeWidth="1.5" opacity="0.8" />
        <path d="M0 8 L28 -4 L56 8 L28 20 Z" fill="var(--link)" opacity="0.18" stroke="var(--link)" strokeWidth="1.5" />
      </g>
      <path d="M80 96 C 88 96, 90 92, 96 92" stroke="var(--link)" strokeWidth="1.5" strokeDasharray="2 3" />

      {/* agent */}
      <g transform="translate(96 58)">
        <line x1="24" y1="0" x2="24" y2="-10" stroke="var(--foreground)" strokeWidth="2" strokeLinecap="round" />
        <circle cx="24" cy="-13" r="4" fill="var(--link)" />
        <rect x="0" y="0" width="48" height="42" rx="12" fill="var(--card)" stroke="var(--foreground)" strokeWidth="2" />
        <rect x="8" y="10" width="32" height="16" rx="8" fill="var(--foreground)" />
        <circle cx="17" cy="18" r="3" fill="var(--card)">
          <animate attributeName="r" values="3;1;3" dur="4s" begin="2s" repeatCount="indefinite" />
        </circle>
        <circle cx="31" cy="18" r="3" fill="var(--card)">
          <animate attributeName="r" values="3;1;3" dur="4s" begin="2s" repeatCount="indefinite" />
        </circle>
        <path d="M18 33 Q24 37 30 33" stroke="var(--foreground)" strokeWidth="2" strokeLinecap="round" />
        <rect x="8" y="46" width="32" height="20" rx="6" fill="var(--card)" stroke="var(--foreground)" strokeWidth="2" />
        <circle cx="24" cy="56" r="3" fill="var(--link)" />
      </g>

      {/* conversation (right) */}
      <g transform="translate(160 44)">
        <rect x="0" y="0" width="58" height="26" rx="8" fill="var(--foreground)" />
        <path d="M8 26 L4 34 L16 26 Z" fill="var(--foreground)" />
        <rect x="9" y="8" width="30" height="3" rx="1.5" fill="var(--card)" />
        <rect x="9" y="15" width="40" height="3" rx="1.5" fill="var(--card)" opacity="0.7" />
      </g>
      <g transform="translate(166 90)">
        <rect x="0" y="0" width="52" height="30" rx="8" fill="var(--card)" stroke="var(--border)" />
        <rect x="8" y="18" width="6" height="6" rx="1" fill="var(--link)" opacity="0.5" />
        <rect x="17" y="12" width="6" height="12" rx="1" fill="var(--link)" opacity="0.75" />
        <rect x="26" y="7" width="6" height="17" rx="1" fill="var(--link)" />
        <rect x="35" y="14" width="6" height="10" rx="1" fill="var(--link)" opacity="0.6" />
      </g>

      {/* sparkles */}
      <path d="M58 42 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2 z" fill="var(--link)" opacity="0.7" />
      <path d="M190 146 l1.5 4 4 1.5 -4 1.5 -1.5 4 -1.5 -4 -4 -1.5 4 -1.5 z" fill="var(--foreground)" opacity="0.5" />
    </svg>
  )
}
