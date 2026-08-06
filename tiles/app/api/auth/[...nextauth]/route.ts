import { handlers } from "@/auth";

/**
 * Auth.js catch-all route handler.
 * Handles all /api/auth/* requests (sign-in, sign-out, callbacks, etc.)
 */
export const { GET, POST } = handlers;
