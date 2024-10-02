type slot = {
  start: Date;
  end: Date;
  delta: number;
  meta: {
    source: string;
    location: string;
  };
}

export type { slot };