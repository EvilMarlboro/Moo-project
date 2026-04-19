import { RouterProvider } from "react-router";
import { router } from "./routes";
import { Toaster } from "sonner";
import { AuthProvider } from "./context/AuthContext";
import { MatchProvider } from "./context/MatchContext";

export default function App() {
  return (
    <AuthProvider>
      <MatchProvider>
        <RouterProvider router={router} />
        <Toaster theme="dark" position="top-right" richColors />
      </MatchProvider>
    </AuthProvider>
  );
}