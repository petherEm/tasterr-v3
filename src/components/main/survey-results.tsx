"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Edit2, CheckCircle, User, MapPin, ShoppingBag, Briefcase, Calendar, Heart } from "lucide-react";
import { UserSurvey } from "@/lib/types";
import SurveyForm from "./initial-info-form";

interface SurveyResultsProps {
  survey: UserSurvey;
  onUpdate?: (updatedSurvey: UserSurvey) => void;
}

export default function SurveyResults({ survey, onUpdate }: SurveyResultsProps) {
  const [isEditing, setIsEditing] = useState(false);

  const handleEditComplete = (updatedSurvey: UserSurvey) => {
    setIsEditing(false);
    onUpdate?.(updatedSurvey);
  };

  if (isEditing) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Zaktualizuj Swój Profil
            </h1>
            <p className="text-lg text-gray-600">
              Wprowadź zmiany w swoich informacjach poniżej.
            </p>
          </div>
          <SurveyForm 
            existingSurvey={survey}
            onComplete={handleEditComplete}
            onCancel={() => setIsEditing(false)}
          />
        </div>
      </div>
    );
  }

  const formatDisplayValue = (value: string | null | undefined, fallback = "Nie podano") => {
    if (!value) return fallback;
    
    // Convert snake_case to readable format
    return value
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getIcon = (field: string) => {
    switch (field) {
      case 'age': return <Calendar className="w-5 h-5 text-blue-500" />;
      case 'gender': return <User className="w-5 h-5 text-purple-500" />;
      case 'city_size': return <MapPin className="w-5 h-5 text-green-500" />;
      case 'shopping_frequency': return <ShoppingBag className="w-5 h-5 text-orange-500" />;
      case 'preferred_brand': return <Heart className="w-5 h-5 text-red-500" />;
      case 'profession': return <Briefcase className="w-5 h-5 text-indigo-500" />;
      default: return null;
    }
  };

  const surveyFields = [
    { key: 'age', label: 'Wiek', value: survey.age },
    { key: 'gender', label: 'Płeć', value: survey.gender },
    { key: 'city_size', label: 'Wielkość Miasta', value: survey.city_size },
    { key: 'shopping_frequency', label: 'Częstotliwość Zakupów', value: survey.shopping_frequency },
    { key: 'preferred_brand', label: 'Preferowana Marka', value: survey.preferred_brand },
    { key: 'profession', label: 'Zawód', value: survey.profession }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-screen bg-gray-50 py-12"
    >
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
          >
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          </motion.div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Podsumowanie Twojego Profilu
          </h1>
          <p className="text-lg text-gray-600 mb-6">
            Oto co o Tobie wiemy. Możesz zaktualizować te informacje w każdej chwili.
          </p>
          <Button
            onClick={() => setIsEditing(true)}
            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
          >
            <Edit2 className="w-4 h-4 mr-2" />
            Edytuj Profil
          </Button>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {surveyFields.map((field, index) => (
            <motion.div
              key={field.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="hover:shadow-lg transition-shadow duration-200">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-3 text-lg">
                    {getIcon(field.key)}
                    {field.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {field.value ? (
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-sm font-medium">
                        {formatDisplayValue(field.value)}
                      </Badge>
                    </div>
                  ) : (
                    <p className="text-gray-400 italic text-sm">Nie podano</p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center mt-12"
        >
          <Card className="max-w-md mx-auto bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Co dalej?
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                Twój profil pomaga nam zapewnić lepsze rekomendacje i doświadczenia dostosowane specjalnie dla Ciebie.
              </p>
              <Button variant="outline" size="sm">
                Odkryj Tasterr
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}