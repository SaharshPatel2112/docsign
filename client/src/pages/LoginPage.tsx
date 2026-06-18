import { SignIn, SignUp } from "@clerk/clerk-react";
import { useState } from "react";

export const LoginPage = () => {
  const [mode, setMode] = useState<null | "login" | "signup">(null);

  const features = [
    {
      icon: "📄",
      title: "Upload Documents",
      desc: "Upload any PDF and prepare it for signing in seconds.",
    },
    {
      icon: "✍",
      title: "Place Signatures",
      desc: "Drag and drop signature fields anywhere on your document.",
    },
    {
      icon: "📧",
      title: "Send for Signing",
      desc: "Share a secure link with signers via email instantly.",
    },
    {
      icon: "🔍",
      title: "Audit Trail",
      desc: "Track every action with full timestamps and signer details.",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-950 flex">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-gradient-to-br from-gray-900 via-blue-950 to-gray-950 px-16 py-12 border-r border-gray-800">
        <div className="flex items-center gap-3">
          <img src="/docsign.svg" alt="DocSign" className="w-9 h-9" />
          <span className="text-2xl font-bold text-white tracking-tight">
            DocSign
          </span>
        </div>

        <div className="flex flex-col gap-10">
          <div>
            <h2 className="text-4xl font-bold text-white leading-tight mb-4">
              Sign documents
              <br />
              <span className="text-blue-400">digitally & securely.</span>
            </h2>
            <p className="text-gray-400 text-base leading-relaxed max-w-sm">
              A professional document signing platform built for individuals and
              teams. No physical paperwork. No delays.
            </p>
          </div>

          <div className="flex flex-col gap-5">
            {features.map((f) => (
              <div key={f.title} className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-blue-600 bg-opacity-20 border border-blue-500 border-opacity-30 flex items-center justify-center text-lg flex-shrink-0">
                  {f.icon}
                </div>
                <div>
                  <p className="text-white font-medium text-sm">{f.title}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-gray-700 text-xs">
          © 2026 DocSign. All rights reserved.
        </p>
      </div>

      {/* Right panel */}
      <div className="flex flex-col items-center justify-center flex-1 px-6 py-12 bg-gray-950 relative">
        {/* Mobile logo */}
        <div className="flex lg:hidden items-center gap-2 mb-8">
          <img src="/docsign.svg" alt="DocSign" className="w-8 h-8" />
          <span className="text-xl font-bold text-blue-400">DocSign</span>
        </div>

        {/* Landing buttons */}
        <div
          className={`w-full max-w-sm flex flex-col gap-4 transition-all duration-300 ${mode !== null ? "opacity-0 pointer-events-none absolute" : "opacity-100"}`}
        >
          <div className="mb-4">
            <h3 className="text-2xl font-bold text-white">Get started</h3>
            <p className="text-gray-500 text-sm mt-1">
              Sign in or create a free account to continue
            </p>
          </div>

          <button
            onClick={() => setMode("login")}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition text-sm"
          >
            Login
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-800" />
            <span className="text-gray-600 text-xs">or</span>
            <div className="flex-1 h-px bg-gray-800" />
          </div>

          <button
            onClick={() => setMode("signup")}
            className="w-full py-3 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-xl border border-gray-700 transition text-sm"
          >
            Create Account
          </button>

          <p className="text-center text-gray-600 text-xs mt-4">
            Free to use. No credit card required.
          </p>
        </div>

        {/* Clerk form panel */}
        <div
          className={`w-full max-w-sm transition-all duration-300 ${mode !== null ? "opacity-100" : "opacity-0 pointer-events-none absolute"}`}
        >
          {/* Close button */}
          <button
            onClick={() => setMode(null)}
            className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center rounded-full bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition text-lg"
          >
            ✕
          </button>

          <div className="mb-6">
            <h3 className="text-2xl font-bold text-white">
              {mode === "login" ? "Welcome back" : "Create account"}
            </h3>
            <p className="text-gray-500 text-sm mt-1">
              {mode === "login"
                ? "Sign in to your account to continue"
                : "Get started with DocSign for free"}
            </p>
          </div>

          {mode === "login" && (
            <SignIn
              afterSignInUrl="/dashboard"
              signUpUrl="/login"
              appearance={{
                elements: {
                  footerAction: "hidden",
                  footer: "hidden",
                },
              }}
            />
          )}

          {mode === "signup" && (
            <SignUp
              afterSignUpUrl="/dashboard"
              signInUrl="/login"
              appearance={{
                elements: {
                  footerAction: "hidden",
                  footer: "hidden",
                },
              }}
            />
          )}

          {/* Manual switch link */}
          <p className="text-center text-gray-600 text-xs mt-4">
            {mode === "login" ? (
              <>
                Don't have an account?{" "}
                <button
                  onClick={() => setMode("signup")}
                  className="text-blue-400 hover:text-blue-300 transition"
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  onClick={() => setMode("login")}
                  className="text-blue-400 hover:text-blue-300 transition"
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};
