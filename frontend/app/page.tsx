import { redirect } from "next/navigation";

// Normally handled by proxy.ts; kept as a fallback.
export default function Home() {
  redirect("/dashboard");
}
