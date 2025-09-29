"use client";

import { useState } from "react";
import type { UserSurvey } from "@/lib/types";
import SurveyForm from "./initial-info-form";
import SurveyResults from "./survey-results";

interface StarterWrapperProps {
  initialSurvey?: UserSurvey;
}

export default function StarterWrapper({ initialSurvey }: StarterWrapperProps) {
  const [currentSurvey, setCurrentSurvey] = useState<UserSurvey | undefined>(
    initialSurvey
  );
  const [showResults, setShowResults] = useState(!!initialSurvey);

  const handleSurveyComplete = (survey: UserSurvey) => {
    setCurrentSurvey(survey);
    setShowResults(true);
  };

  const handleSurveyUpdate = (survey: UserSurvey) => {
    setCurrentSurvey(survey);
  };

  if (showResults && currentSurvey) {
    return (
      <SurveyResults survey={currentSurvey} onUpdate={handleSurveyUpdate} />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent mb-6">
            Witamy w Tasterr!
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Pomóż nam spersonalizować Twoje doświadczenia, dzieląc się kilkoma szczegółami o
            sobie.
          </p>
        </div>
        <SurveyForm onComplete={handleSurveyComplete} />
      </div>
    </div>
  );
}
