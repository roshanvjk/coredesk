import Link from "next/link";

export default function ForgotPasswordPage() {
  return (
    <main className="app-screen flex items-center justify-center">
      <div className="app-panel w-full max-w-xl p-8 text-center">
        <h1 className="app-heading">Forgot Password</h1>
        <p className="app-subtext mt-3">
          This is a sample forgot password page. Add reset flow here.
        </p>
        <Link href="/" className="mt-6 inline-block text-sm font-semibold text-primary">
          Back to Login
        </Link>
      </div>
    </main>
  );
}
