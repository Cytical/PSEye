import { SkeletonBar, SkeletonHeader } from "@/components/PageSkeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-[1240px] px-4 py-8">
      <SkeletonBar className="h-3 w-32" />
      <div className="mt-2">
        <SkeletonHeader titleClassName="h-7 w-64" subtitleClassName="h-4 w-full max-w-lg" />
      </div>
      <div className="mt-8 flex flex-col gap-8">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i}>
            <SkeletonBar className="h-3 w-28" />
            <div className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, j) => (
                <SkeletonBar key={j} className="h-4 w-full" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
