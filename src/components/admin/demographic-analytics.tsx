"use client";

import type React from "react";

import { useState, useEffect } from "react";
import type { SurveyAnalytics, DemographicBreakdown } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  BarChart3,
  Users,
  TrendingUp,
  Calendar,
  MapPin,
  ShoppingBag,
  Briefcase,
  Eye,
  EyeOff,
} from "lucide-react";
import { getSurveyAnalytics } from "@/app/actions/admin";

interface DemographicAnalyticsProps {
  surveyId: string;
}

export function DemographicAnalytics({ surveyId }: DemographicAnalyticsProps) {
  const [analytics, setAnalytics] = useState<SurveyAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<{
    [key: string]: boolean;
  }>({
    age_groups: true,
    gender: true,
    city_size: false,
    shopping_frequency: false,
    profession: false,
  });

  useEffect(() => {
    async function loadAnalytics() {
      try {
        setLoading(true);
        const result = await getSurveyAnalytics(surveyId);
        if (result.success && result.data) {
          setAnalytics(result.data);
        } else {
          setError(result.error || "Failed to load analytics");
        }
      } catch (error) {
        setError("Failed to load analytics");
        console.error("Analytics error:", error);
      } finally {
        setLoading(false);
      }
    }

    loadAnalytics();
  }, [surveyId]);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-white to-blue-50/30 border-blue-200 shadow-lg">
        <CardContent className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="relative mb-4">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500/20 to-indigo-500/20 animate-pulse"></div>
            </div>
            <span className="text-gray-700 font-medium">
              Loading demographics...
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-gradient-to-br from-red-50 to-rose-50 border-red-200 shadow-lg">
        <CardContent className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="p-4 bg-gradient-to-br from-red-100 to-rose-100 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
              <BarChart3 className="h-8 w-8 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-red-800 mb-2">
              Analytics Error
            </h3>
            <p className="text-red-600">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!analytics || analytics.total_responses === 0) {
    return (
      <Card className="bg-gradient-to-br from-gray-50 to-slate-50 border-gray-200 shadow-lg">
        <CardContent className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="p-4 bg-gradient-to-br from-gray-100 to-slate-100 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
              <BarChart3 className="h-8 w-8 text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              No Analytics Data
            </h3>
            <p className="text-gray-600">
              No user profiles found for survey responses
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardContent className="flex items-center p-6">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
              <Users className="h-8 w-8 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-blue-700">
                Total Responses
              </p>
              <p className="text-3xl font-bold text-blue-900">
                {analytics.total_responses}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardContent className="flex items-center p-6">
            <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg">
              <TrendingUp className="h-8 w-8 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-green-700">
                Completion Rate
              </p>
              <p className="text-3xl font-bold text-green-900">
                {analytics.response_quality.completion_rate}%
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardContent className="flex items-center p-6">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl shadow-lg">
              <BarChart3 className="h-8 w-8 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-purple-700">
                Demographics
              </p>
              <p className="text-3xl font-bold text-purple-900">
                {
                  Object.keys(analytics.demographics).filter(
                    (key) =>
                      Object.keys(
                        analytics.demographics[
                          key as keyof typeof analytics.demographics
                        ]
                      ).length > 0
                  ).length
                }
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Demographic Breakdowns */}
      <div className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg">
            <BarChart3 className="h-5 w-5 text-white" />
          </div>
          <h3 className="text-xl font-bold text-gray-800">
            Demographic Breakdown
          </h3>
        </div>

        {/* Age Groups */}
        <DemographicSection
          title="Age Groups"
          icon={Calendar}
          data={analytics.demographics.age_groups}
          total={analytics.total_responses}
          expanded={expandedSections.age_groups}
          onToggle={() => toggleSection("age_groups")}
          color="blue"
        />

        {/* Gender */}
        <DemographicSection
          title="Gender"
          icon={Users}
          data={analytics.demographics.gender}
          total={analytics.total_responses}
          expanded={expandedSections.gender}
          onToggle={() => toggleSection("gender")}
          color="purple"
        />

        {/* City Size */}
        <DemographicSection
          title="City Size"
          icon={MapPin}
          data={analytics.demographics.city_size}
          total={analytics.total_responses}
          expanded={expandedSections.city_size}
          onToggle={() => toggleSection("city_size")}
          color="green"
        />

        {/* Shopping Frequency */}
        <DemographicSection
          title="Shopping Frequency"
          icon={ShoppingBag}
          data={analytics.demographics.shopping_frequency}
          total={analytics.total_responses}
          expanded={expandedSections.shopping_frequency}
          onToggle={() => toggleSection("shopping_frequency")}
          color="orange"
        />

        {/* Profession */}
        <DemographicSection
          title="Profession"
          icon={Briefcase}
          data={analytics.demographics.profession}
          total={analytics.total_responses}
          expanded={expandedSections.profession}
          onToggle={() => toggleSection("profession")}
          color="indigo"
        />
      </div>
    </div>
  );
}

interface DemographicSectionProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  data: DemographicBreakdown;
  total: number;
  expanded: boolean;
  onToggle: () => void;
  color: "blue" | "purple" | "green" | "orange" | "indigo";
}

function DemographicSection({
  title,
  icon: Icon,
  data,
  total,
  expanded,
  onToggle,
  color,
}: DemographicSectionProps) {
  const hasData = Object.keys(data).length > 0;
  const colorClasses = {
    blue: {
      bg: "from-blue-500 to-indigo-600",
      text: "text-blue-600",
      light: "from-blue-50 to-indigo-50",
      border: "border-blue-200",
      bar: "from-blue-400 to-blue-600",
    },
    purple: {
      bg: "from-purple-500 to-indigo-600",
      text: "text-purple-600",
      light: "from-purple-50 to-indigo-50",
      border: "border-purple-200",
      bar: "from-purple-400 to-purple-600",
    },
    green: {
      bg: "from-green-500 to-emerald-600",
      text: "text-green-600",
      light: "from-green-50 to-emerald-50",
      border: "border-green-200",
      bar: "from-green-400 to-green-600",
    },
    orange: {
      bg: "from-orange-500 to-amber-600",
      text: "text-orange-600",
      light: "from-orange-50 to-amber-50",
      border: "border-orange-200",
      bar: "from-orange-400 to-orange-600",
    },
    indigo: {
      bg: "from-indigo-500 to-purple-600",
      text: "text-indigo-600",
      light: "from-indigo-50 to-purple-50",
      border: "border-indigo-200",
      bar: "from-indigo-400 to-indigo-600",
    },
  };

  if (!hasData) {
    return (
      <Card
        className={`opacity-60 bg-gradient-to-br ${colorClasses[color].light} ${colorClasses[color].border} shadow-sm`}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div
                className={`p-2 bg-gradient-to-br ${colorClasses[color].bg} rounded-lg shadow-sm`}
              >
                <Icon className="h-5 w-5 text-white" />
              </div>
              <CardTitle className="text-base text-gray-700">{title}</CardTitle>
            </div>
            <Badge variant="outline" className="text-xs bg-white/50">
              No data
            </Badge>
          </div>
        </CardHeader>
      </Card>
    );
  }

  const sortedData = Object.entries(data).sort(([, a], [, b]) => b - a);

  return (
    <Card
      className={`bg-gradient-to-br ${colorClasses[color].light} ${colorClasses[color].border} shadow-lg hover:shadow-xl transition-all duration-300`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div
              className={`p-2 bg-gradient-to-br ${colorClasses[color].bg} rounded-lg shadow-lg`}
            >
              <Icon className="h-5 w-5 text-white" />
            </div>
            <CardTitle className="text-base text-gray-800">{title}</CardTitle>
            <Badge
              className={`text-xs bg-gradient-to-r ${colorClasses[color].bg} text-white shadow-sm`}
            >
              {sortedData.length} categories
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="h-8 w-8 p-0 hover:bg-white/50 transition-colors duration-200"
          >
            {expanded ? (
              <EyeOff className="h-4 w-4 text-gray-600" />
            ) : (
              <Eye className="h-4 w-4 text-gray-600" />
            )}
          </Button>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0">
          <div className="space-y-4">
            {sortedData.map(([category, count], index) => {
              const percentage = Math.round((count / total) * 100);
              return (
                <div key={category} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-gray-800">
                      {category}
                    </span>
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-700 font-medium">{count}</span>
                      <Badge
                        className={`text-xs bg-gradient-to-r ${colorClasses[color].bg} text-white shadow-sm`}
                      >
                        {percentage}%
                      </Badge>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 shadow-inner">
                    <div
                      className={`bg-gradient-to-r ${colorClasses[color].bar} h-3 rounded-full transition-all duration-500 shadow-sm`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  {index < sortedData.length - 1 && (
                    <Separator className="mt-4 bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
