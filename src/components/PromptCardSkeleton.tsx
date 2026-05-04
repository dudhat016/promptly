export default function PromptCardSkeleton() {
  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
      <div className="aspect-[16/10] skeleton rounded-none" />
      <div className="p-5 space-y-4">
        <div className="flex justify-between items-start">
          <div className="h-6 w-3/4 skeleton" />
          <div className="h-6 w-12 skeleton" />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-full skeleton" />
          <div className="h-4 w-5/6 skeleton" />
        </div>
        <div className="flex items-center justify-between pt-2">
          <div className="flex gap-2">
            <div className="h-6 w-16 skeleton rounded-full" />
            <div className="h-6 w-16 skeleton rounded-full" />
          </div>
          <div className="h-8 w-24 skeleton rounded-lg" />
        </div>
      </div>
    </div>
  );
}
