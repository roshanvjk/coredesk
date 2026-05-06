import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const authorizedParties = (
  process.env.CLERK_AUTHORIZED_PARTIES ?? process.env.NEXT_PUBLIC_APP_URL ?? ""
)
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const isAuthPage = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)"]);

export default clerkMiddleware(
  async (auth, req) => {
    const { userId } = await auth();
    if (userId && isAuthPage(req)) {
      const url = new URL("/dashboard", req.url);
      return NextResponse.redirect(url);
    }
  },
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
