"use client";

import Link from "next/link";
import type { UserSurvey } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { Eye, User, MapPin, Briefcase } from "lucide-react";

interface RecentSurveysProps {
  surveys: UserSurvey[];
}

export function RecentSurveys({ surveys }: RecentSurveysProps) {
  if (surveys.length === 0) {
    return (
      <div className="text-center py-12 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
        <div className="p-4 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
          <FileText className="h-8 w-8 text-blue-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          Brak Ankiet
        </h3>
        <p className="text-gray-600">Nie ukończono jeszcze żadnych ankiet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {surveys.map((survey, index) => (
        <div
          key={survey.id}
          className="group relative overflow-hidden bg-gradient-to-r from-white to-blue-50/30 border border-blue-200 rounded-xl p-6 hover:shadow-lg hover:border-blue-300 transition-all duration-300 backdrop-blur-sm"
        >
          {/* Background gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-blue-50/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          <div className="relative flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="h-12 w-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                  <User className="h-6 w-6 text-white" />
                </div>
                {/* Pulse animation for recent surveys */}
                {index < 3 && (
                  <div className="absolute -top-1 -right-1 h-4 w-4 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full animate-pulse shadow-sm" />
                )}
              </div>

              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h4 className="font-semibold text-gray-800 text-lg">
                    Użytkownik {survey.user_id.slice(-8)}
                  </h4>
                  <Badge className="text-xs bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-sm">
                    Profil
                  </Badge>
                </div>

                <div className="flex items-center space-x-6 text-sm text-gray-600">
                  <div className="flex items-center space-x-2 bg-gradient-to-r from-green-50 to-emerald-50 px-3 py-1 rounded-full border border-green-200">
                    <MapPin className="h-3 w-3 text-green-600" />
                    <span className="font-medium text-green-700">
                      {survey.city_size.replace("-", " ")}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 bg-gradient-to-r from-orange-50 to-amber-50 px-3 py-1 rounded-full border border-orange-200">
                    <Briefcase className="h-3 w-3 text-orange-600" />
                    <span className="font-medium text-orange-700">
                      {survey.profession}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 bg-gradient-to-r from-gray-50 to-slate-50 px-3 py-1 rounded-full border border-gray-200">
                    <span className="font-medium text-gray-700">
                      {survey.created_at
                        ? formatDistanceToNow(new Date(survey.created_at), {
                            addSuffix: true,
                          })
                        : "Ostatnio"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                size="sm"
                asChild
                className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200 hover:from-indigo-100 hover:to-purple-100 hover:border-indigo-300 transition-all duration-200 shadow-sm"
              >
                <Link href={`/admin/users/${survey.user_id}`}>
                  <Eye className="h-4 w-4 mr-2 text-indigo-600" />
                  <span className="text-indigo-700 font-medium">Zobacz</span>
                </Link>
              </Button>
            </div>
          </div>
        </div>
      ))}

      {surveys.length >= 10 && (
        <div className="text-center pt-6">
          <Button
            variant="outline"
            asChild
            className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 hover:from-blue-100 hover:to-indigo-100 hover:border-blue-300 transition-all duration-200 shadow-sm"
          >
            <Link href="/admin/surveys">
              <span className="text-blue-700 font-medium">
                Zobacz Wszystkie Ankiety
              </span>
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}

function FileText({ className }: { className: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}
