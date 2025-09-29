import { SurveyBuilder } from "@/components/admin/survey-builder";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Sparkles } from "lucide-react";
import Link from "next/link";

export default function CreateSurveyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50">
      <div className="max-w-6xl mx-auto p-6">
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-indigo-600/10 rounded-2xl blur-3xl" />
          <div className="relative bg-white/80 backdrop-blur-sm border border-white/20 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                asChild
                className="border-blue-200 hover:bg-blue-50 bg-transparent"
              >
                <Link
                  href="/admin/surveys"
                  className="flex items-center space-x-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Powrót do Ankiet</span>
                </Link>
              </Button>

              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                      Utwórz Nową Ankietę
                    </h1>
                    <p className="text-gray-600 mt-1">
                      Zbuduj niestandardową ankietę z inteligentnymi pytaniami i
                      opublikuj ją dla użytkowników
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Survey Builder */}
        <SurveyBuilder />
      </div>
    </div>
  );
}
