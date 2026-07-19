import { SkeletonHeader, SkeletonCardList } from "@/components/PageSkeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-[1240px] px-4 py-8">
      <SkeletonHeader titleClassName="h-6 w-40" subtitleClassName="h-4 w-full max-w-lg" />
      <div className="mt-8">
        <SkeletonCardList count={4} />
      </div>
    </div>
  );
}
