import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isAuthPage = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)"]);
const isProtectedPage = createRouteMatcher([
  "/dashboard(.*)",
  "/wallet(.*)",
  "/stats(.*)",
  "/todo(.*)",
  "/notes(.*)",
  "/links(.*)",
]);

export default clerkMiddleware(
  async (auth, req) => {
    const { userId } = await auth();

    if (!userId && isProtectedPage(req)) {
      const url = new URL("/sign-in", req.url);
      return NextResponse.redirect(url);
    }

    if (userId && isAuthPage(req)) {
      const url = new URL("/dashboard", req.url);
      return NextResponse.redirect(url);
    }
  },
);

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
