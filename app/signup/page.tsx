import Link from "next/link";

export default function SignUpPage() {
  return (
    <main className="app-screen flex items-center justify-center">
      <div className="app-panel w-full max-w-xl p-8 text-center">
        <h1 className="app-heading">Sign Up</h1>
        <p className="app-subtext mt-3">
          This is a sample sign up page. You can build the real form here.
        </p>
        <Link href="/" className="mt-6 inline-block text-sm font-semibold text-primary">
          Back to Login
        </Link>
      </div>
    </main>
  );
}
