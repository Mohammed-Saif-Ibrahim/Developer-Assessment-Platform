import Header from "@/components/Header";
import ColdStartLoader from "@/components/ColdStartLoader";

export default function Loading() {
  return (
    <div className="min-h-screen">
      <Header />
      <ColdStartLoader />
    </div>
  );
}
