import { encryptUserIdForStorage } from "@/lib/field-crypto";

/** Value written to `user_id` columns on INSERT/UPDATE of ownership. */
export function storedDbUserId(clerkUserId: string): string {
  return encryptUserIdForStorage(clerkUserId);
}

/**
 * Match rows keyed by legacy plaintext Clerk id or by encrypted-at-rest id.
 * Use: WHERE (user_id = ${enc} OR user_id = ${plain})
 */
export function userIdWherePair(clerkUserId: string): {
  enc: string;
  plain: string;
} {
  return { enc: encryptUserIdForStorage(clerkUserId), plain: clerkUserId };
}
