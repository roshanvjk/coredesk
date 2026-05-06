import { clerkMiddleware } from "@clerk/nextjs/server";

const authorizedParties = (
  process.env.CLERK_AUTHORIZED_PARTIES ?? process.env.NEXT_PUBLIC_APP_URL ?? ""
)
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

export default clerkMiddleware(
  () => {},
  {
    authorizedParties: authorizedParties.length > 0 ? authorizedParties : undefined,
  },
);

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
