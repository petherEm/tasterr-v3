"use client";

import type { UserSurvey } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  User,
  MapPin,
  ShoppingBag,
  Briefcase,
  Calendar,
  Heart,
  Users,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface UserProfileCardProps {
  userProfile: UserSurvey | null;
  userId: string;
  compact?: boolean;
}

export function UserProfileCard({
  userProfile,
  userId,
  compact = false,
}: UserProfileCardProps) {
  if (!userProfile) {
    return (
      <Card className={`${compact ? "p-3" : "p-4"} bg-gray-50 border-gray-200`}>
        <CardContent className="p-0">
          <div className="flex items-center space-x-2 text-gray-500">
            <User className="h-4 w-4" />
            <span className="text-sm">
              User {userId.slice(-8)} (Profile not available)
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <Card className="p-3 bg-blue-50 border-blue-200">
        <CardContent className="p-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-blue-900">
                User {userId.slice(-8)}
              </span>
            </div>
            <div className="flex items-center space-x-2 text-xs text-blue-700">
              {userProfile.age && (
                <Badge
                  variant="outline"
                  className="text-xs border-blue-300 text-blue-700"
                >
                  {userProfile.age}
                </Badge>
              )}
              {userProfile.gender && (
                <Badge
                  variant="outline"
                  className="text-xs border-blue-300 text-blue-700"
                >
                  {userProfile.gender}
                </Badge>
              )}
              <Badge
                variant="outline"
                className="text-xs border-blue-300 text-blue-700"
              >
                {userProfile.city_size}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center space-x-2 text-blue-900">
          <User className="h-5 w-5" />
          <span>User Profile</span>
          <Badge
            variant="outline"
            className="ml-auto text-xs border-blue-300 text-blue-700"
          >
            ID: {userId.slice(-8)}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Demographics */}
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-900 text-sm uppercase tracking-wide">
              Demographics
            </h4>

            {userProfile.age && (
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-700">Age:</span>
                <Badge variant="secondary">{userProfile.age}</Badge>
              </div>
            )}

            {userProfile.gender && (
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-700">Gender:</span>
                <Badge variant="secondary">{userProfile.gender}</Badge>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <MapPin className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-700">City Size:</span>
              <Badge variant="secondary">{userProfile.city_size}</Badge>
            </div>

            <div className="flex items-center space-x-2">
              <Briefcase className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-700">Profession:</span>
              <Badge variant="secondary">{userProfile.profession}</Badge>
            </div>
          </div>

          {/* Behavior */}
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-900 text-sm uppercase tracking-wide">
              Shopping Behavior
            </h4>

            <div className="flex items-center space-x-2">
              <ShoppingBag className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-700">Shopping Frequency:</span>
              <Badge variant="secondary">
                {userProfile.shopping_frequency}
              </Badge>
            </div>

            {userProfile.preferred_brand && (
              <div className="flex items-center space-x-2">
                <Heart className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-700">Preferred Brand:</span>
                <Badge variant="secondary">{userProfile.preferred_brand}</Badge>
              </div>
            )}

            {/* Profile metadata */}
            <div className="pt-2 border-t border-blue-200">
              <p className="text-xs text-gray-500">
                Profile created{" "}
                {formatDistanceToNow(new Date(userProfile.created_at!), {
                  addSuffix: true,
                })}
              </p>
              {userProfile.updated_at &&
                userProfile.updated_at !== userProfile.created_at && (
                  <p className="text-xs text-gray-500">
                    Last updated{" "}
                    {formatDistanceToNow(new Date(userProfile.updated_at), {
                      addSuffix: true,
                    })}
                  </p>
                )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
