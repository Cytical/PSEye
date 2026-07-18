import { SkeletonHeader, SkeletonTable } from "@/components/PageSkeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <SkeletonHeader titleClassName="h-6 w-36" subtitleClassName="h-4 w-full max-w-xl" />
      <div className="mt-6">
        <SkeletonTable rows={8} />
      </div>
    </div>
  );
}
