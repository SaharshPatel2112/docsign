import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { ClerkProvider } from "@clerk/clerk-react";
import { AuthSync } from "./components/AuthSync";

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ClerkProvider publishableKey={publishableKey}>
      <AuthSync>
        <App />
      </AuthSync>
    </ClerkProvider>
  </React.StrictMode>,
);
