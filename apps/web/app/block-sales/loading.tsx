import { SkeletonHeader, SkeletonTable } from "@/components/PageSkeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-[1240px] px-4 py-8">
      <SkeletonHeader titleClassName="h-7 w-36" subtitleClassName="h-4 w-full max-w-xl" />
      <div className="mt-8 rounded-lg bg-panel p-4 ring-1 ring-panel-border">
        <SkeletonTable rows={8} />
      </div>
    </div>
  );
}
