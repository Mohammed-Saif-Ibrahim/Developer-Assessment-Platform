import Header from "@/components/Header";
import ColdStartLoader from "@/components/ColdStartLoader";

// Next.js picks this up automatically for the "/" route: it wraps
// page.tsx in a Suspense boundary and streams this in right away,
// then swaps in the real page once the awaited api.getSubjects()
// call resolves.
export default function Loading() {
  return (
    <div className="min-h-screen">
      <Header />
      <ColdStartLoader />
    </div>
  );
}
