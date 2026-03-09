import { RouterProvider } from "@tanstack/react-router";
import { Toaster } from "react-hot-toast";
import { router } from "./routes/router";
import {
  QueryClient as TanStackQueryClient,
  QueryClientProvider as TanStackQueryClientProvider,
} from "@tanstack/react-query"; 
import "./lib/debug";
import "./index.css";

// Create a client
const queryClient = new TanStackQueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
});

export default function App() {
  return (
    <TanStackQueryClientProvider client={queryClient}>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: "#fff",
            color: "#1e293b",
            boxShadow: "0 10px 40px rgba(0,0,0,0.1)",
            borderRadius: "12px",
            padding: "16px",
          },
        }}
      />
      <RouterProvider router={router} />
    </TanStackQueryClientProvider>
  );
}
