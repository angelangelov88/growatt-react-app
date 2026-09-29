import type { RefObject } from "react";
import type { ActivityEntry } from "./Api";

// An activity log entry in words, for the activity page.
type ActivityDescription = {
  title: string;
  // More about it, e.g. the charge times; omitted when there's nothing to add.
  detail?: string;
  // Something didn't work: shown in red.
  failed: boolean;
};

// The entries of one day, in UK time. label: "Today", "Mon 28 Sep"…
type ActivityDay = { label: string; entries: ActivityEntry[] };

type ActivityItemProps = { entry: ActivityEntry };

// Calls onLoad when the element in ref comes near the screen, while enabled.
type LoadMoreOnScrollOptions = {
  ref: RefObject<HTMLElement | null>;
  enabled: boolean;
  onLoad: () => void;
};

export type {
  ActivityDescription,
  ActivityDay,
  ActivityItemProps,
  LoadMoreOnScrollOptions,
};
