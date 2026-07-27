"use client";

import { useRouter } from "next/navigation";
import { CalendarDatePicker } from "./CalendarDatePicker";

function formatTriggerDate(iso: string): string {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Jumps straight to any recorded recap date, alongside the prev/next arrows already on the page. */
export function DailyRecapDateNav({ date, availableDates }: { date: string; availableDates: string[] }) {
  const router = useRouter();

  return (
    <CalendarDatePicker
      value={date}
      availableDates={availableDates}
      onSelect={(iso) => router.push(`/daily/${iso}`)}
      triggerLabel={formatTriggerDate(date)}
    />
  );
}
