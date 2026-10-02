/** Плашка-заглушка с бегущим красноватым бликом. Размер и форму задаёт className. */
export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`relative block overflow-hidden bg-white/[0.06] before:absolute before:inset-0 before:-translate-x-full before:animate-shimmer before:bg-gradient-to-r before:from-transparent before:via-rx-red/[0.14] before:to-transparent ${className}`}
    />
  );
}

function Frame({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative border border-white/10 p-6 ${className}`}>
      <span className="absolute -left-px -top-px h-2.5 w-2.5 border-l-2 border-t-2 border-rx-red/50" />
      <span className="absolute -bottom-px -right-px h-2.5 w-2.5 border-b-2 border-r-2 border-rx-red/50" />
      {children}
    </div>
  );
}

export function AccountSkeleton({ label }: { label: string }) {
  return (
    <div role="status" aria-label={label} className="mx-auto max-w-4xl px-5 py-14">
      <Frame className="flex flex-col gap-6 bg-rx-panel sm:flex-row sm:items-center">
        <Skeleton className="h-[104px] w-[104px] shrink-0 rounded-full" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-9 w-56" />
          <Skeleton className="h-4 w-40" />
          <div className="flex gap-4 pt-1">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
      </Frame>

      <Frame className="mt-6">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-3 h-8 w-72 max-w-full" />
        <Skeleton className="mt-5 h-1.5 w-full" />
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="flex flex-col items-center border border-white/10 p-4">
              <Skeleton className="h-14 w-14 [clip-path:polygon(50%_0,100%_25%,100%_75%,50%_100%,0_75%,0_25%)]" />
              <Skeleton className="mt-3 h-3.5 w-16" />
              <Skeleton className="mt-2 h-3 w-12" />
            </div>
          ))}
        </div>
      </Frame>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {[0, 1].map((i) => (
          <Frame key={i} className={i === 0 ? "bg-rx-panel" : ""}>
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-3 h-8 w-40" />
            <Skeleton className="mt-3 h-4 w-32" />
            <div className="mt-6 flex gap-3">
              <Skeleton className="h-9 w-36" />
              <Skeleton className="h-9 w-24" />
            </div>
          </Frame>
        ))}
      </div>

      <Frame className="mt-6">
        <Skeleton className="h-3 w-24" />
        <div className="mt-4 space-y-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      </Frame>
      <span className="sr-only">{label}</span>
    </div>
  );
}

export function ChatSkeleton({ label }: { label: string }) {
  return (
    <div role="status" aria-label={label} className="mt-4 space-y-4">
      <Frame className="bg-rx-panel">
        <Skeleton className="h-3 w-44" />
        <Skeleton className="mt-3 h-7 w-3/4" />
        <Skeleton className="mt-3 h-5 w-24" />
        <div className="mt-5 grid grid-cols-3 gap-2">
          <Skeleton className="h-1" />
          <Skeleton className="h-1" />
          <Skeleton className="h-1" />
        </div>
      </Frame>
      {[["ml-auto", "w-2/3"], ["", "w-3/4"], ["ml-auto", "w-1/2"]].map(([side, width], i) => (
        <div key={i} className={`flex gap-3 ${side ? "flex-row-reverse" : ""}`}>
          <Skeleton className="h-[34px] w-[34px] shrink-0 rounded-full" />
          <Skeleton className={`h-16 ${width}`} />
        </div>
      ))}
      <span className="sr-only">{label}</span>
    </div>
  );
}
