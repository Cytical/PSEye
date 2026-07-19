import { SkeletonHeader, SkeletonRect } from "@/components/PageSkeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <SkeletonHeader titleClassName="h-6 w-44" subtitleClassName="h-4 w-full max-w-xl" />
      <div className="mt-6">
        <SkeletonRect className="h-80 w-full" />
      </div>
    </div>
  );
}
