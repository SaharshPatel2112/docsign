import { SignedIn, SignedOut, SignIn, UserButton } from "@clerk/clerk-react";

function App() {
  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
      <SignedOut>
        <SignIn />
      </SignedOut>
      <SignedIn>
        <div className="flex flex-col items-center gap-4">
          <UserButton />
          <p className="text-lg">You are signed in</p>
        </div>
      </SignedIn>
    </div>
  );
}

export default App;
