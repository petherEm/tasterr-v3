import { HeroSection } from "@/components/main/hero";
import PublicSurveysSection from "@/components/surveys/public-surveys-section";

export const revalidate = 60 // Revalidate every 60 seconds

export default function Home() {
  return (
    <>
      <HeroSection />
      <div id="surveys" className="container mx-auto px-4 py-16">
        <PublicSurveysSection />
      </div>
    </>
  );
}
