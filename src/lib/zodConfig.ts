import { z } from "zod";

// Zod checks once whether it may compile its checks with new Function. The CSP
// (vercel.json) blocks that and reports it as a violation, so skip the check.
// Schemas read this when they're created, so main.tsx imports this file first.
z.config({ jitless: true });
