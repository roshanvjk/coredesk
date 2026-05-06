"use client";

import { useEffect } from "react";

const CLERK_NOISY_MESSAGES = [
  "The <SignIn/> component cannot render when a user is already signed in",
  "Node cannot be found in the current page.",
  "Clerk has been loaded with development keys.",
];

function shouldSilence(args: unknown[]): boolean {
  return args.some((arg) => {
    if (typeof arg !== "string") return false;
    return CLERK_NOISY_MESSAGES.some((part) => arg.includes(part));
  });
}

export default function ClerkDevWarningFilter() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;

    const originalWarn = console.warn;
    const originalError = console.error;

    console.warn = (...args: unknown[]) => {
      if (shouldSilence(args)) return;
      originalWarn(...args);
    };

    console.error = (...args: unknown[]) => {
      if (shouldSilence(args)) return;
      originalError(...args);
    };

    return () => {
      console.warn = originalWarn;
      console.error = originalError;
    };
  }, []);

  return null;
}
