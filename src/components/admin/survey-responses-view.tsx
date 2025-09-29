"use client";

import type React from "react";

import { useState } from "react";
import type {
  SurveyWithResponses,
  SurveyWithResponsesAndProfiles,
} from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Users,
  Calendar,
  BarChart3,
  UserCheck,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { DemographicAnalytics } from "./demographic-analytics";
import { ResponseExport } from "./response-export";
import { createClient } from "@supabase/supabase-js";

interface SurveyResponsesViewProps {
  survey: SurveyWithResponses | SurveyWithResponsesAndProfiles;
}

// Helper function to convert storage path to public URL (client-safe)
function getPublicImageUrl(path: string): string {
  if (!path) return "";

  // If it's already a full URL, return as is
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  // Convert storage path to public URL using client-side Supabase client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const { data } = supabase.storage.from("survey-images").getPublicUrl(path);
  return data.publicUrl;
}

// Helper function to convert video storage path to public URL (client-safe)
function getPublicVideoUrl(path: string): string {
  if (!path) return "";

  // If it's already a full URL, return as is
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  // Convert storage path to public URL using client-side Supabase client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const { data } = supabase.storage.from("survey-images").getPublicUrl(path);
  return data.publicUrl;
}

export function SurveyResponsesView({ survey }: SurveyResponsesViewProps) {
  const [viewMode, setViewMode] = useState<
    "individual" | "summary" | "analytics"
  >("individual");

  if (survey.response_count === 0) {
    return (
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="text-center">
            <div className="h-16 w-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center mx-auto mb-6 shadow-sm">
              <Users className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              No responses yet
            </h3>
            <p className="text-gray-600 max-w-md">
              Responses will appear here once users start completing the survey.
              Share your survey link to start collecting responses.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {/* Survey Overview */}
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 shadow-lg">
        <CardHeader className="pb-6">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <CardTitle className="text-2xl mb-3 text-blue-900">
                {survey.title}
              </CardTitle>
              {survey.description && (
                <p className="text-blue-700 mb-4 text-lg">
                  {survey.description}
                </p>
              )}

              <div className="flex items-center space-x-6 text-sm text-blue-600">
                <div className="flex items-center space-x-2 bg-white/50 px-3 py-1.5 rounded-full">
                  <Users className="h-4 w-4" />
                  <span className="font-medium">
                    {survey.response_count} responses
                  </span>
                </div>
                <div className="flex items-center space-x-2 bg-white/50 px-3 py-1.5 rounded-full">
                  <Calendar className="h-4 w-4" />
                  <span>
                    Created{" "}
                    {formatDistanceToNow(new Date(survey.created_at!), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
                <Badge
                  variant="secondary"
                  className="capitalize bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 border-blue-200"
                >
                  {survey.status}
                </Badge>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <ResponseExport
                surveyId={survey.id!}
                surveyTitle={survey.title}
                responseCount={survey.response_count}
              />

              <div className="flex bg-white/70 backdrop-blur-sm border border-blue-200 rounded-lg shadow-sm">
                <Button
                  variant={viewMode === "individual" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("individual")}
                  className={`rounded-r-none border-r-0 ${
                    viewMode === "individual"
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm"
                      : "text-blue-700 hover:bg-blue-50"
                  }`}
                >
                  <Users className="h-4 w-4 mr-1" />
                  Individual
                </Button>
                <Button
                  variant={viewMode === "summary" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("summary")}
                  className={`rounded-none border-r-0 ${
                    viewMode === "summary"
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm"
                      : "text-blue-700 hover:bg-blue-50"
                  }`}
                >
                  <BarChart3 className="h-4 w-4 mr-1" />
                  Summary
                </Button>
                <Button
                  variant={viewMode === "analytics" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("analytics")}
                  className={`rounded-l-none ${
                    viewMode === "analytics"
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm"
                      : "text-blue-700 hover:bg-blue-50"
                  }`}
                >
                  <UserCheck className="h-4 w-4 mr-1" />
                  Analytics
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-gradient-to-r from-blue-100 to-indigo-100 p-6 rounded-xl border border-blue-200">
            <p className="text-blue-900 leading-relaxed">
              {survey.introduction}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Responses View */}
      {viewMode === "individual" ? (
        <IndividualResponsesView survey={survey} />
      ) : viewMode === "summary" ? (
        <SummaryResponsesView survey={survey} />
      ) : (
        <DemographicAnalytics surveyId={survey.id!} />
      )}
    </div>
  );
}

function IndividualResponsesView({
  survey,
}: {
  survey: SurveyWithResponses | SurveyWithResponsesAndProfiles;
}) {
  const [expandedResponses, setExpandedResponses] = useState<Set<string>>(
    new Set()
  );

  const toggleResponse = (responseId: string) => {
    const newExpanded = new Set(expandedResponses);
    if (newExpanded.has(responseId)) {
      newExpanded.delete(responseId);
    } else {
      newExpanded.add(responseId);
    }
    setExpandedResponses(newExpanded);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-gray-900">
          Individual Responses
        </h3>
        <Badge
          variant="outline"
          className="bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border-blue-200"
        >
          {survey.responses.length} total responses
        </Badge>
      </div>

      {survey.responses.map((response, responseIndex) => {
        // Check if this response has profile data
        const responseWithProfile =
          "user_profile" in response ? response : null;
        const isExpanded = expandedResponses.has(response.id!);

        return (
          <Card
            key={response.id}
            className="overflow-hidden shadow-md hover:shadow-lg transition-all duration-200"
          >
            <CardHeader
              className="bg-gradient-to-r from-gray-50 to-blue-50 py-4 cursor-pointer hover:from-blue-50 hover:to-indigo-50 transition-all duration-200 border-b border-blue-100"
              onClick={() => toggleResponse(response.id!)}
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    {isExpanded ? (
                      <ChevronDown className="h-5 w-5 text-blue-600" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-blue-600" />
                    )}
                    <Badge
                      variant="outline"
                      className="px-3 py-1.5 bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 border-blue-200 font-medium"
                    >
                      Response #{responseIndex + 1}
                    </Badge>
                  </div>
                  <span className="text-sm text-blue-700 font-semibold">
                    User {response.user_id.slice(-8)}
                  </span>
                  {/* Display basic user demographics inline */}
                  {responseWithProfile?.user_profile && (
                    <div className="flex items-center space-x-2">
                      {responseWithProfile.user_profile.gender && (
                        <Badge
                          variant="outline"
                          className="text-xs bg-gradient-to-r from-pink-50 to-rose-50 text-pink-700 border-pink-200"
                        >
                          {responseWithProfile.user_profile.gender}
                        </Badge>
                      )}
                      {responseWithProfile.user_profile.age && (
                        <Badge
                          variant="outline"
                          className="text-xs bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border-green-200"
                        >
                          {responseWithProfile.user_profile.age}
                        </Badge>
                      )}
                      {responseWithProfile.user_profile.city_size && (
                        <Badge
                          variant="outline"
                          className="text-xs bg-gradient-to-r from-purple-50 to-violet-50 text-purple-700 border-purple-200"
                        >
                          {responseWithProfile.user_profile.city_size}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
                <span className="text-sm text-gray-600 bg-white/70 px-3 py-1 rounded-full">
                  {formatDistanceToNow(new Date(response.completed_at!), {
                    addSuffix: true,
                  })}
                </span>
              </div>
            </CardHeader>

            {isExpanded && (
              <>
                {/* Additional User Profile Details Section */}
                {responseWithProfile?.user_profile &&
                  (responseWithProfile.user_profile.shopping_frequency ||
                    responseWithProfile.user_profile.preferred_brand ||
                    responseWithProfile.user_profile.profession) && (
                    <CardContent className="pt-6 pb-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
                      <h5 className="text-sm font-semibold text-blue-900 mb-4">
                        Additional Profile Details
                      </h5>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        {responseWithProfile.user_profile.profession && (
                          <div className="bg-white/70 p-3 rounded-lg border border-blue-200">
                            <span className="text-blue-600 font-medium">
                              Profession:
                            </span>
                            <p className="font-semibold text-blue-900 mt-1">
                              {responseWithProfile.user_profile.profession}
                            </p>
                          </div>
                        )}
                        {responseWithProfile.user_profile
                          .shopping_frequency && (
                          <div className="bg-white/70 p-3 rounded-lg border border-blue-200">
                            <span className="text-blue-600 font-medium">
                              Shopping Frequency:
                            </span>
                            <p className="font-semibold text-blue-900 mt-1">
                              {
                                responseWithProfile.user_profile
                                  .shopping_frequency
                              }
                            </p>
                          </div>
                        )}
                        {responseWithProfile.user_profile.preferred_brand && (
                          <div className="bg-white/70 p-3 rounded-lg border border-blue-200">
                            <span className="text-blue-600 font-medium">
                              Preferred Brand:
                            </span>
                            <p className="font-semibold text-blue-900 mt-1">
                              {responseWithProfile.user_profile.preferred_brand}
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  )}

                <CardContent className="pt-8">
                  <div className="space-y-8">
                    {survey.questions.map((question, questionIndex) => {
                      const questionKey = `question_${question.id}`;
                      const answer = response.response_data[questionKey];

                      return (
                        <div
                          key={question.id}
                          className="border-l-4 border-l-gradient-to-b border-l-blue-300 pl-8 relative"
                        >
                          <div className="absolute left-0 top-0 w-1 h-full bg-gradient-to-b from-blue-400 to-indigo-400 rounded-full"></div>
                          <div className="flex justify-between items-start mb-4">
                            <h4 className="font-semibold text-gray-900 text-lg leading-relaxed">
                              Q{questionIndex + 1}: {question.question_text}
                            </h4>
                            <Badge
                              variant="outline"
                              className="text-xs capitalize bg-gradient-to-r from-gray-50 to-blue-50 text-blue-700 border-blue-200 ml-4"
                            >
                              {question.question_type.replace("_", " ")}
                            </Badge>
                          </div>

                          {question.question_subtitle && (
                            <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                              {question.question_subtitle}
                            </p>
                          )}

                          <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-6 rounded-xl border border-blue-100">
                            {answer ? (
                              <div className="text-gray-900 whitespace-pre-wrap">
                                {renderAnswer(question, answer)}
                              </div>
                            ) : (
                              <p className="text-gray-500 italic">
                                No answer provided
                              </p>
                            )}
                          </div>

                          {questionIndex < survey.questions.length - 1 && (
                            <Separator className="mt-8 bg-gradient-to-r from-transparent via-blue-200 to-transparent" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </>
            )}
          </Card>
        );
      })}
    </div>
  );
}

function SummaryResponsesView({ survey }: { survey: SurveyWithResponses }) {
  const generateSummary = (question: {
    id: string;
    question_type: string;
    options?: Array<{ value: string; label: string }>;
  }):
    | Array<{ label: string; count: number; percentage: number }>
    | Array<{ text: string }> => {
    const questionKey = `question_${question.id}`;
    const answers = survey.responses
      .map((r) => r.response_data[questionKey])
      .filter((answer) => {
        if (!answer) return false;
        if (typeof answer === "string") return answer.trim() !== "";
        if (Array.isArray(answer)) return answer.length > 0;
        if (typeof answer === "object") return Object.keys(answer).length > 0;
        return true; // for numbers, booleans, etc.
      });

    if (
      question.question_type === "radio" ||
      question.question_type === "select"
    ) {
      // Count occurrences of each option
      const counts = answers.reduce((acc, answer) => {
        acc[answer] = (acc[answer] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Safely parse options
      let parsedOptions: any[] = [];
      try {
        parsedOptions =
          typeof question.options === "string"
            ? JSON.parse(question.options)
            : Array.isArray(question.options)
            ? question.options
            : [];
      } catch (error) {
        console.error("Failed to parse question options:", error);
        parsedOptions = [];
      }

      return Object.entries(counts)
        .map(([value, count]) => ({
          label:
            parsedOptions.find((opt: any) => opt.value === value)?.label ||
            value,
          count,
          percentage: Math.round((count / answers.length) * 100),
        }))
        .sort((a, b) => b.count - a.count);
    } else if (
      question.question_type === "image_select" ||
      question.question_type === "image_sort"
    ) {
      // Special handling for image questions - return image data for proper rendering
      return answers.slice(0, 10).map((answer) => ({
        type: "image_selection",
        data: answer,
        question_type: question.question_type,
      }));
    } else if (question.question_type === "image_comment") {
      // Special handling for image comment questions
      return answers.slice(0, 10).map((answer) => ({
        type: "image_comment",
        data: answer,
        question_type: question.question_type,
        question_options: question.options,
      }));
    } else if (question.question_type === "image_upload_comment") {
      // Special handling for user image uploads
      return answers.slice(0, 10).map((answer) => ({
        type: "image_upload",
        data: answer,
        question_type: question.question_type,
      }));
    } else if (
      question.question_type === "video_upload" ||
      question.question_type === "video_question"
    ) {
      // Special handling for video questions
      return answers.slice(0, 10).map((answer) => ({
        type: "video",
        data: answer,
        question_type: question.question_type,
        question_options: question.options,
      }));
    } else {
      // For text/number questions, just show sample answers
      return answers.slice(0, 10).map((answer) => ({
        text: typeof answer === "string" ? answer : JSON.stringify(answer),
      }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-gray-900">
          Response Summary
        </h3>
        <Badge
          variant="outline"
          className="bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border-blue-200"
        >
          Aggregated insights
        </Badge>
      </div>

      {survey.questions.map((question, questionIndex) => {
        const summary = generateSummary(question);

        return (
          <Card
            key={question.id}
            className="shadow-md hover:shadow-lg transition-shadow duration-200"
          >
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg text-blue-900">
                    Q{questionIndex + 1}: {question.question_text}
                  </CardTitle>
                  {question.question_subtitle && (
                    <p className="text-blue-700 mt-2">
                      {question.question_subtitle}
                    </p>
                  )}
                </div>
                <Badge
                  variant="outline"
                  className="capitalize bg-gradient-to-r from-white to-blue-50 text-blue-700 border-blue-200"
                >
                  {question.question_type.replace("_", " ")}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="pt-6">
              {question.question_type === "radio" ||
              question.question_type === "select" ? (
                <div className="space-y-4">
                  {(
                    summary as Array<{
                      label: string;
                      count: number;
                      percentage: number;
                    }>
                  ).map((item, index) => (
                    <div
                      key={index}
                      className="bg-gradient-to-r from-gray-50 to-blue-50 p-4 rounded-lg border border-blue-100"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-gray-900">
                          {item.label}
                        </span>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-bold text-blue-700">
                            {item.count}
                          </span>
                          <span className="text-sm text-blue-600">
                            ({item.percentage}%)
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-blue-100 rounded-full h-3">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-indigo-500 h-3 rounded-full transition-all duration-300"
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-blue-700 font-medium mb-4">
                    Sample responses:
                  </p>
                  {(summary as Array<any>).map((item, index) => (
                    <div
                      key={index}
                      className="bg-gradient-to-r from-gray-50 to-blue-50 p-4 rounded-lg border border-blue-100"
                    >
                      {item.type ? (
                        // Render media content using the same renderAnswer function
                        <div className="text-gray-900">
                          {renderAnswer(
                            {
                              question_type: item.question_type,
                              options: item.question_options,
                            },
                            item.data
                          )}
                        </div>
                      ) : (
                        // Render text content
                        <p className="text-gray-900">{item.text}</p>
                      )}
                    </div>
                  ))}
                  {survey.responses.length > 10 && (
                    <p className="text-sm text-blue-600 italic bg-blue-50 p-3 rounded-lg border border-blue-200">
                      ...and {survey.responses.length - 10} more responses
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// Helper function to safely render different answer types
function renderAnswer(
  question: { question_type: string; options?: any },
  answer: unknown
): React.ReactNode {
  // Handle null/undefined
  if (answer === null || answer === undefined) {
    return "No answer provided";
  }

  // Handle select/radio questions
  if (
    question.question_type === "radio" ||
    question.question_type === "select"
  ) {
    // Safely parse options
    let parsedOptions: any[] = [];
    try {
      parsedOptions =
        typeof question.options === "string"
          ? JSON.parse(question.options)
          : Array.isArray(question.options)
          ? question.options
          : [];
    } catch (error) {
      console.error("Failed to parse question options:", error);
      parsedOptions = [];
    }

    const optionLabel =
      parsedOptions.find((opt: any) => opt.value === answer)?.label || answer;
    return typeof optionLabel === "string" ? optionLabel : String(optionLabel);
  }

  // Handle image upload responses - check for both string and object formats
  if (question.question_type === "image_upload_comment") {
    // If it's already parsed as an array of objects
    if (Array.isArray(answer)) {
      return (
        <div className="space-y-3">
          <p className="font-medium text-gray-700 mb-3">
            {answer.length} image{answer.length !== 1 ? "s" : ""} uploaded:
          </p>
          {answer.map((image: any, index: number) => (
            <div
              key={index}
              className="border border-gray-200 rounded p-3 bg-white"
            >
              <div className="flex justify-between items-start mb-3">
                <span className="text-sm font-medium text-gray-600">
                  Image {index + 1}
                </span>
                <span className="text-xs text-gray-500">
                  {image.fileName || "Unknown file"}
                </span>
              </div>

              {/* Image Display */}
              {image.url && (
                <div className="mb-3">
                  <img
                    src={getPublicImageUrl(image.url) || "/placeholder.svg"}
                    alt={`User uploaded image ${index + 1}`}
                    className="max-w-full h-auto max-h-64 rounded border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() =>
                      window.open(getPublicImageUrl(image.url), "_blank")
                    }
                  />
                </div>
              )}

              {image.comment && (
                <div className="bg-gray-50 p-2 rounded text-sm">
                  <strong>Comment:</strong> {image.comment}
                </div>
              )}
            </div>
          ))}
        </div>
      );
    }

    // If it's a string, try to parse it
    if (typeof answer === "string") {
      try {
        const imageData = JSON.parse(answer);
        if (Array.isArray(imageData)) {
          return (
            <div className="space-y-3">
              <p className="font-medium text-gray-700 mb-3">
                {imageData.length} image{imageData.length !== 1 ? "s" : ""}{" "}
                uploaded:
              </p>
              {imageData.map((image: any, index: number) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded p-3 bg-white"
                >
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-sm font-medium text-gray-600">
                      Image {index + 1}
                    </span>
                    <span className="text-xs text-gray-500">
                      {image.fileName || "Unknown file"}
                    </span>
                  </div>

                  {/* Image Display */}
                  {image.url && (
                    <div className="mb-3">
                      <img
                        src={getPublicImageUrl(image.url) || "/placeholder.svg"}
                        alt={`User uploaded image ${index + 1}`}
                        className="max-w-full h-auto max-h-64 rounded border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() =>
                          window.open(getPublicImageUrl(image.url), "_blank")
                        }
                      />
                    </div>
                  )}

                  {image.comment && (
                    <div className="bg-gray-50 p-2 rounded text-sm">
                      <strong>Comment:</strong> {image.comment}
                    </div>
                  )}
                </div>
              ))}
            </div>
          );
        }
      } catch (error) {
        // Fall back to showing the raw string if parsing fails
        return `Image response (parsing failed): ${answer.substring(
          0,
          100
        )}...`;
      }
    }

    // If it's an object (single image), handle it
    if (typeof answer === "object" && answer !== null) {
      return (
        <div className="space-y-3">
          <p className="font-medium text-gray-700 mb-3">1 image uploaded:</p>
          <div className="border border-gray-200 rounded p-3 bg-white">
            <div className="flex justify-between items-start mb-3">
              <span className="text-sm font-medium text-gray-600">Image 1</span>
              <span className="text-xs text-gray-500">
                {answer.fileName || "Unknown file"}
              </span>
            </div>

            {/* Image Display */}
            {answer.url && (
              <div className="mb-3">
                <img
                  src={answer.url || "/placeholder.svg"}
                  alt="User uploaded image"
                  className="max-w-full h-auto max-h-64 rounded border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => window.open(answer.url, "_blank")}
                />
              </div>
            )}

            {answer.comment && (
              <div className="bg-gray-50 p-2 rounded text-sm">
                <strong>Comment:</strong> {answer.comment}
              </div>
            )}
          </div>
        </div>
      );
    }

    return "Image response (invalid format)";
  }

  // Handle image selection questions
  if (question.question_type === "image_select") {
    if (Array.isArray(answer) && answer.length > 0) {
      return (
        <div className="space-y-3">
          <p className="font-medium text-gray-700 mb-3">
            Selected {answer.length} image{answer.length !== 1 ? "s" : ""}:
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {answer.map((imagePath: string, index: number) => {
              const imageUrl = getPublicImageUrl(imagePath);
              return (
                <div
                  key={index}
                  className="border border-gray-200 rounded p-2 bg-white"
                >
                  <img
                    src={imageUrl || "/placeholder.svg"}
                    alt={`Selected image ${index + 1}`}
                    className="w-full h-24 object-cover rounded cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => window.open(imageUrl, "_blank")}
                  />
                  <p className="text-xs text-gray-500 mt-1 text-center">
                    Image {index + 1}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    return "No images selected";
  }

  // Handle image comment questions
  if (question.question_type === "image_comment") {
    // Parse question options to get the original images
    let questionOptions: any = {};
    try {
      questionOptions =
        typeof question.options === "string"
          ? JSON.parse(question.options)
          : question.options || {};
    } catch (error) {
      console.error(
        "Failed to parse question options for image_comment:",
        error,
        "Raw options:",
        question.options
      );
    }

    const images = questionOptions?.images || [];

    // Debug logging
    console.log("Image comment question debug:", {
      question_type: question.question_type,
      raw_options: question.options,
      parsed_options: questionOptions,
      images: images,
      images_count: images.length,
    });

    if (typeof answer === "object" && answer !== null) {
      const comments = Object.entries(answer).filter(
        ([id, comment]) => comment && String(comment).trim()
      );
      if (comments.length > 0) {
        return (
          <div className="space-y-3">
            <p className="font-medium text-gray-700 mb-3">
              Comments on {comments.length} image
              {comments.length !== 1 ? "s" : ""}:
            </p>
            {comments.map(([imageId, comment], index) => {
              // Find the corresponding image from question options
              const originalImage = images.find(
                (img: any) => img.id === imageId
              );

              return (
                <div
                  key={imageId}
                  className="border border-gray-200 rounded p-3 bg-white"
                >
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-sm font-medium text-gray-600">
                      {originalImage?.title || `Image ${index + 1}`}
                    </span>
                    <span className="text-xs text-gray-500">ID: {imageId}</span>
                  </div>

                  {/* Display the actual image */}
                  {originalImage?.url ? (
                    <div className="mb-3">
                      <img
                        src={
                          getPublicImageUrl(originalImage.url) ||
                          "/placeholder.svg"
                        }
                        alt={originalImage.alt || `Image ${index + 1}`}
                        className="max-w-full h-auto max-h-48 rounded border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() =>
                          window.open(
                            getPublicImageUrl(originalImage.url),
                            "_blank"
                          )
                        }
                      />
                    </div>
                  ) : (
                    <div className="mb-3 p-3 bg-gray-100 rounded border border-gray-200 text-center">
                      <p className="text-sm text-gray-500">
                        Image not found (ID: {imageId})
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Available images: {images.length}
                      </p>
                    </div>
                  )}

                  <div className="bg-gray-50 p-2 rounded text-sm">
                    <strong>Comment:</strong> {String(comment)}
                  </div>
                </div>
              );
            })}
          </div>
        );
      }
    } else if (typeof answer === "string" && answer.trim()) {
      return (
        <div className="border border-gray-200 rounded p-3 bg-white">
          <div className="bg-gray-50 p-2 rounded text-sm">
            <strong>Comment:</strong> {answer.trim()}
          </div>
        </div>
      );
    }
    return "No comments provided";
  }

  // Handle image sorting questions
  if (question.question_type === "image_sort") {
    if (Array.isArray(answer) && answer.length > 0) {
      return (
        <div className="space-y-3">
          <p className="font-medium text-gray-700 mb-3">
            Image ranking (from most to least preferred):
          </p>
          <div className="space-y-2">
            {answer.map((imagePath: string, index: number) => {
              const imageUrl = getPublicImageUrl(imagePath);
              return (
                <div
                  key={index}
                  className="flex items-center space-x-3 border border-gray-200 rounded p-3 bg-white"
                >
                  <div className="flex-shrink-0">
                    <span className="bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-0.5 rounded">
                      #{index + 1}
                    </span>
                  </div>
                  <img
                    src={imageUrl || "/placeholder.svg"}
                    alt={`Ranked image ${index + 1}`}
                    className="w-16 h-16 object-cover rounded cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => window.open(imageUrl, "_blank")}
                  />
                  <span className="text-sm text-gray-600">
                    Preference rank: {index + 1}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    return "No ranking provided";
  }

  // Handle video question types
  if (question.question_type === "video_question") {
    // Parse question options to get the original video
    let questionOptions: any = {};
    try {
      questionOptions =
        typeof question.options === "string"
          ? JSON.parse(question.options)
          : question.options || {};
    } catch (error) {
      console.error("Failed to parse question options:", error);
    }

    return (
      <div className="space-y-4">
        {/* Display the question video if available */}
        {questionOptions?.videoUrl && (
          <div className="border border-gray-200 rounded p-3 bg-white">
            <p className="text-sm font-medium text-gray-600 mb-3">
              Question Video:
            </p>
            <video
              controls
              className="w-full max-h-64 rounded border border-gray-200"
              preload="metadata"
            >
              <source
                src={getPublicVideoUrl(questionOptions.videoUrl)}
                type="video/mp4"
              />
              <source
                src={getPublicVideoUrl(questionOptions.videoUrl)}
                type="video/webm"
              />
              Your browser does not support the video tag.
            </video>
          </div>
        )}

        {/* Display user's response */}
        <div className="border border-gray-200 rounded p-3 bg-white">
          <p className="text-sm font-medium text-gray-600 mb-3">
            User Response:
          </p>
          {answer ? (
            typeof answer === "object" &&
            answer !== null &&
            "videoUrl" in answer ? (
              // User uploaded a video response
              <div>
                <video
                  controls
                  className="w-full max-h-64 rounded border border-gray-200 mb-2"
                  preload="metadata"
                >
                  <source
                    src={getPublicVideoUrl((answer as any).videoUrl)}
                    type="video/mp4"
                  />
                  <source
                    src={getPublicVideoUrl((answer as any).videoUrl)}
                    type="video/webm"
                  />
                  Your browser does not support the video tag.
                </video>
                {(answer as any).comment && (
                  <div className="bg-gray-50 p-2 rounded text-sm">
                    <strong>Comment:</strong> {(answer as any).comment}
                  </div>
                )}
              </div>
            ) : (
              // Text response
              <div className="bg-gray-50 p-2 rounded text-sm">
                {String(answer)}
              </div>
            )
          ) : (
            <p className="text-gray-500 italic">No response provided</p>
          )}
        </div>
      </div>
    );
  }

  // Handle video upload questions
  if (question.question_type === "video_upload") {
    if (typeof answer === "object" && answer !== null && "videoUrl" in answer) {
      return (
        <div className="space-y-3">
          <p className="font-medium text-gray-700 mb-3">Video uploaded:</p>
          <div className="border border-gray-200 rounded p-3 bg-white">
            <video
              controls
              className="w-full max-h-64 rounded border border-gray-200 mb-2"
              preload="metadata"
            >
              <source
                src={getPublicVideoUrl((answer as any).videoUrl)}
                type="video/mp4"
              />
              <source
                src={getPublicVideoUrl((answer as any).videoUrl)}
                type="video/webm"
              />
              Your browser does not support the video tag.
            </video>

            {(answer as any).fileName && (
              <p className="text-xs text-gray-500 mb-2">
                File: {(answer as any).fileName}
              </p>
            )}

            {(answer as any).comment && (
              <div className="bg-gray-50 p-2 rounded text-sm">
                <strong>Comment:</strong> {(answer as any).comment}
              </div>
            )}
          </div>
        </div>
      );
    }
    return "No video uploaded";
  }

  // Handle range/slider questions
  if (question.question_type === "range") {
    return `${String(answer)} (range value)`;
  }

  // Handle arrays (like multi-select)
  if (Array.isArray(answer)) {
    return answer.map((item) => String(item)).join(", ");
  }

  // Handle objects - convert to readable format
  if (typeof answer === "object" && answer !== null) {
    try {
      return (
        <pre className="text-sm bg-gray-100 p-2 rounded overflow-auto">
          {JSON.stringify(answer, null, 2)}
        </pre>
      );
    } catch (error) {
      return "Complex object (cannot display)";
    }
  }

  // Handle all other types (string, number, boolean)
  return String(answer);
}
