import { getPublicSurveys } from "@/app/actions/surveys";
import PublicSurveysList from "./public-surveys-list";

export default async function PublicSurveysSection() {
  const result = await getPublicSurveys();

  // Extract surveys from the result, handling potential errors
  const surveys = result.success ? result.data : [];

  return (
    <section className="py-16 px-4 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 relative overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]" />

      <div className="max-w-7xl mx-auto relative">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-black mb-6 bg-gradient-to-r from-slate-900 via-blue-800 to-indigo-900 bg-clip-text text-transparent leading-tight">
            Dostępne Ankiety
          </h2>
          <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Weź udział w badaniach naukowych i podziel się swoimi spostrzeżeniami,
            aby pomóc kształtować przyszłość
          </p>
        </div>

        <PublicSurveysList surveys={surveys} />
      </div>
    </section>
  );
}
