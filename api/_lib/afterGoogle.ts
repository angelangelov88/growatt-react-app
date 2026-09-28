// The pages a Google login may come back to, by the name /api/auth/google
// accepts in ?next=. Anything else lands on home.
const AFTER_GOOGLE_PAGES = new Map([["settings", "/settings"]]);

// Holds the name between /api/auth/google and /api/auth/callback.
const AFTER_GOOGLE_COOKIE = "after_google";

export { AFTER_GOOGLE_COOKIE, AFTER_GOOGLE_PAGES };
