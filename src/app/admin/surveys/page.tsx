import { Suspense } from "react";
import { getCustomSurveys } from "@/app/actions/admin";
import { SurveyManagement } from "@/components/admin/survey-management";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Plus, Sparkles } from "lucide-react";
import Link from "next/link";

export default async function SurveysPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]"></div>

      <div className="relative max-w-7xl mx-auto p-6">
        <div className="flex justify-between items-center mb-8">
          <div className="space-y-2">
            <h1 className="text-4xl font-black bg-gradient-to-r from-slate-900 via-blue-800 to-indigo-900 bg-clip-text text-transparent">
              Zarządzanie Ankietami
            </h1>
            <p className="text-slate-600 text-lg font-medium">
              Twórz, zarządzaj i monitoruj niestandardowe ankiety
            </p>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Sparkles className="h-4 w-4 text-blue-500" />
              <span>Buduj angaujące ankiety konwersacyjne</span>
            </div>
          </div>

          <Button
            asChild
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
          >
            <Link
              href="/admin/surveys/create"
              className="flex items-center space-x-2 px-6 py-3"
            >
              <Plus className="h-5 w-5" />
              <span className="font-semibold">Utwórz Ankietę</span>
            </Link>
          </Button>
        </div>

        <Suspense fallback={<SurveyManagementSkeleton />}>
          <SurveyManagementSection />
        </Suspense>
      </div>
    </div>
  );
}

async function SurveyManagementSection() {
  const result = await getCustomSurveys();

  if (!result.success) {
    return (
      <Card className="border-red-200 bg-gradient-to-r from-red-50 to-pink-50 shadow-lg">
        <CardContent className="p-8">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse"></div>
            <div className="text-red-700 font-medium text-lg">
              Nie udało się załadować ankiet: {result.error}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return <SurveyManagement surveys={result.data || []} />;
}

function SurveyManagementSkeleton() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card
          key={i}
          className="border-slate-200 bg-white/70 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300"
        >
          <CardHeader className="pb-4">
            <div className="flex justify-between items-start">
              <div className="space-y-3 flex-1">
                <div className="h-6 bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 rounded-lg animate-pulse w-1/3"></div>
                <div className="h-4 bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 rounded animate-pulse w-2/3"></div>
              </div>
              <div className="h-8 w-24 bg-gradient-to-r from-blue-200 via-blue-300 to-blue-200 rounded-lg animate-pulse"></div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div className="h-4 bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 rounded animate-pulse w-1/4"></div>
              <div className="flex space-x-3">
                <div className="h-9 w-20 bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 rounded-lg animate-pulse"></div>
                <div className="h-9 w-20 bg-gradient-to-r from-red-200 via-red-300 to-red-200 rounded-lg animate-pulse"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
