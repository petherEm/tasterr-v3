import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getSurvey, getPublicSurveys } from "@/app/actions/surveys";
import { ConversationalSurvey } from "@/components/surveys/conversational-survey";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Lock } from "lucide-react";
import Link from "next/link";
import { SignInButton } from "@clerk/nextjs";

interface SurveyPageProps {
  params: Promise<{ surveyId: string }>;
}

export default async function SurveyPage({ params }: SurveyPageProps) {
  const { surveyId } = await params;
  const { userId } = await auth();

  // If user is not authenticated, check if survey exists and show sign-in prompt
  if (!userId) {
    const publicSurveysResult = await getPublicSurveys();

    if (!publicSurveysResult.success || !publicSurveysResult.data) {
      notFound();
    }

    const survey = publicSurveysResult.data.find((s) => s.id === surveyId);

    if (!survey) {
      notFound();
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-white to-blue-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-[#94B2F9] rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-black text-gray-900 mb-2">
              {survey.title}
            </h1>
            {survey.description && (
              <p className="text-gray-600 text-sm leading-relaxed">
                {survey.description}
              </p>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 mb-6">
            <div className="text-center">
              <h2 className="text-lg font-bold text-gray-900 mb-2">
                Wymagane Logowanie
              </h2>
              <p className="text-gray-600 text-sm mb-6 leading-relaxed">
                Dołącz do rozmowy! Zaloguj się, aby wziąć udział w tej ankiecie i
                podzielić się swoimi cennymi spostrzezeniami.
              </p>
              <SignInButton mode="modal">
                <Button
                  size="lg"
                  className="w-full bg-[#94B2F9] hover:bg-[#7A9EF8] text-white font-semibold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  Rozpocznij Ankietę
                </Button>
              </SignInButton>
            </div>
          </div>

          <Button
            variant="outline"
            asChild
            className="w-full border-gray-200 hover:bg-gray-50 rounded-xl bg-transparent"
          >
            <Link
              href="/"
              className="flex items-center justify-center space-x-2 py-3"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Powrót do Strony Głównej</span>
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  // User is authenticated, proceed with normal flow
  const result = await getSurvey(surveyId);

  if (!result.success) {
    if (
      result.error === "Survey not found or not available" ||
      result.error === "You have already completed this survey"
    ) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-white to-blue-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="h-8 w-8 text-gray-400" />
            </div>
            <h1 className="text-xl font-black text-gray-900 mb-2">
              Ankieta Niedostępna
            </h1>
            <p className="text-gray-600 mb-6 text-sm leading-relaxed">
              {result.error}
            </p>
            <Button
              asChild
              className="bg-[#94B2F9] hover:bg-[#7A9EF8] text-white rounded-xl"
            >
              <Link
                href="/research"
                className="flex items-center justify-center space-x-2 py-3"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Powrót do Badań</span>
              </Link>
            </Button>
          </div>
        </div>
      );
    }

    notFound();
  }

  return (
    <div className="h-screen bg-gradient-to-br from-white to-blue-50">
      <ConversationalSurvey survey={result.data} />
    </div>
  );
}
