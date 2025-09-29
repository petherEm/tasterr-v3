"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileText, TrendingUp, Calendar } from "lucide-react";

interface StatsData {
  totalUserSurveys: number;
  totalCustomSurveys: number;
  customSurveyResponses: number;
  recentSurveys: number;
}

interface StatsCardsProps {
  stats: StatsData;
}

export function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      title: "Całkowita Liczba Użytkowników",
      value: stats.totalUserSurveys,
      icon: Users,
      description: "Ukończone ankiety demograficzne",
      gradient: "from-blue-500 to-indigo-600",
      lightGradient: "from-blue-50 to-indigo-50",
      border: "border-blue-200",
      textColor: "text-blue-600",
    },
    {
      title: "Ankiety Niestandardowe",
      value: stats.totalCustomSurveys,
      icon: FileText,
      description: "Utworzone ankiety niestandardowe",
      gradient: "from-green-500 to-emerald-600",
      lightGradient: "from-green-50 to-emerald-50",
      border: "border-green-200",
      textColor: "text-green-600",
    },
    {
      title: "W Tym Tygodniu",
      value: stats.recentSurveys,
      icon: TrendingUp,
      description: "Nowe ukończone ankiety",
      gradient: "from-purple-500 to-indigo-600",
      lightGradient: "from-purple-50 to-indigo-50",
      border: "border-purple-200",
      textColor: "text-purple-600",
    },
    {
      title: "Odpowiedzi Niestandardowe",
      value: stats.customSurveyResponses,
      icon: Calendar,
      description: "Odpowiedzi na ankiety niestandardowe",
      gradient: "from-orange-500 to-amber-600",
      lightGradient: "from-orange-50 to-amber-50",
      border: "border-orange-200",
      textColor: "text-orange-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card
            key={card.title}
            className={`relative overflow-hidden bg-gradient-to-br ${card.lightGradient} ${card.border} shadow-lg hover:shadow-xl transition-all duration-300 group`}
          >
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-24 h-24 -mr-12 -mt-12 opacity-10 group-hover:opacity-20 transition-opacity duration-300">
              <div
                className={`w-full h-full bg-gradient-to-br ${card.gradient} rounded-full`}
              />
            </div>

            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold text-gray-700">
                {card.title}
              </CardTitle>
              <div
                className={`p-2 bg-gradient-to-br ${card.gradient} rounded-lg shadow-lg group-hover:scale-110 transition-transform duration-200`}
              >
                <Icon className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-800 mb-1">
                {card.value}
              </div>
              <p className="text-sm text-gray-600 font-medium">
                {card.description}
              </p>
            </CardContent>

            {/* Subtle hover effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </Card>
        );
      })}
    </div>
  );
}
