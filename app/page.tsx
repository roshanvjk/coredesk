import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import HomeAuthForm from "./home-auth-form";

export default async function Home() {
  const { userId } = await auth();
  if (userId) {
    redirect("/dashboard");
  }

  return (
    <div className="app-screen flex items-center p-3 md:p-4">
      <main className="app-panel mx-auto flex w-full max-w-5xl overflow-x-hidden">
        <section className="relative hidden w-1/2 lg:block">
          <div className="app-auth-hero absolute inset-0" />
          <div className="relative flex h-full items-center justify-center">
            <div className="app-auth-hero-symbol" />
          </div>
        </section>

        <section className="flex w-full items-center justify-center px-6 py-8 lg:w-1/2 lg:px-10 lg:py-10">
          <div className="w-full max-w-sm">
            <h1 className="app-heading">Log In</h1>
            <p className="app-subtext mt-3">
              Continue securely with Clerk authentication.
            </p>
            <HomeAuthForm />

            <div className="mt-4">
              <Link
                href="/sign-in?strategy=oauth_google"
                className="app-btn-outline"
              >
                Continue with Google
              </Link>
              <Link
                href="/sign-up"
                className="app-btn-primary mt-3"
              >
                Sign Up
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
