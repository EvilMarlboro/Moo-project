
  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import "./styles/index.css";
  import { AuthProvider } from "./app/context/AuthContext.tsx";
  import { MatchProvider } from "./app/context/MatchContext.tsx";

  createRoot(document.getElementById("root")!).render(
    <AuthProvider>
      <MatchProvider>
        <App />
      </MatchProvider>
    </AuthProvider>
  );
