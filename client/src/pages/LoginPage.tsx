import { SignIn } from "@clerk/clerk-react";

export const LoginPage = () => {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <SignIn afterSignInUrl="/dashboard" afterSignUpUrl="/dashboard" />
    </div>
  );
};
