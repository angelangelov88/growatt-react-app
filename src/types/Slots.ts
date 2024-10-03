type Slot = {
  start: Date;
  end: Date;
  delta: number; // Energy in kWh (import has a negative value).
  meta: {
    source: string; //Present for planned dispatches, otherwise null. Value can be smart-charge, test-charge or bump-charge.
    location: string; // Present for completed dispatches, otherwise null. The only relevant value is AT_HOME if present.
  };
}

export type { Slot };