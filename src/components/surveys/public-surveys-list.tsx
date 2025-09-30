"use client";

import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import type { PublicSurvey } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, ArrowRight, Search } from "lucide-react";
import Image from "next/image";
import { motion } from "framer-motion";

interface PublicSurveysListProps {
  surveys: PublicSurvey[];
}

export default function PublicSurveysList({ surveys }: PublicSurveysListProps) {
  const { isSignedIn } = useUser();

  if (!surveys || surveys.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="bg-gradient-to-br from-white/80 to-blue-50/80 backdrop-blur-sm rounded-2xl p-12 border border-white/20 shadow-xl">
          <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
            <Search className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-2xl font-bold text-slate-800 mb-3">
            Brak dostępnych ankiet
          </h3>
          <p className="text-slate-600">
            Sprawdź ponownie później w poszukiwaniu nowych możliwości
            badawczych.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {surveys.map((survey) => (
        <motion.div
          key={survey.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="group bg-gradient-to-br from-white/90 to-blue-50/50 backdrop-blur-sm rounded-2xl border border-white/20 shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden hover:-translate-y-1"
        >
          <div className="relative h-48 overflow-hidden">
            <Image
              src={
                survey.intro_image_url ||
                "/placeholder.svg?height=200&width=400"
              }
              alt={survey.title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
            <div className="absolute top-4 right-4">
              <Badge className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-0 shadow-lg">
                <Users className="w-3 h-3 mr-1" />
                {survey.response_count || 0} wypełnionych
              </Badge>
            </div>
          </div>

          <div className="p-6">
            <h3 className="text-xl font-bold mb-3 bg-gradient-to-r from-slate-800 to-blue-800 bg-clip-text text-transparent line-clamp-2">
              {survey.title}
            </h3>

            <p className="text-slate-600 mb-4 line-clamp-3 leading-relaxed">
              {survey.description}
            </p>

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center text-sm text-slate-500">
                <Clock className="w-4 h-4 mr-1" />
                <span>~{survey.estimated_time || 5} min</span>
              </div>

              <Badge
                variant={
                  survey.status === "published" ? "default" : "secondary"
                }
                className={
                  survey.status === "published"
                    ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0"
                    : "bg-gradient-to-r from-slate-400 to-slate-500 text-white border-0"
                }
              >
                {survey.status === "published"
                  ? "popularna"
                  : survey.status === "draft"
                  ? "szkic"
                  : survey.status}
              </Badge>
            </div>

            <Button
              asChild
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <Link href={`/surveys/${survey.id}`}>
                Rozpocznij Ankietę
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
