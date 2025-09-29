"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  FileText,
  Database,
  Settings,
  Check,
  AlertCircle,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ResponseExportProps {
  surveyId: string;
  surveyTitle: string;
  responseCount: number;
}

export function ResponseExport({
  surveyId,
  surveyTitle,
  responseCount,
}: ResponseExportProps) {
  const [exportOptions, setExportOptions] = useState({
    includeProfiles: true,
    includeMetadata: true,
    includeRawData: true,
  });
  const [exporting, setExporting] = useState<{ csv: boolean; json: boolean }>({
    csv: false,
    json: false,
  });
  const [exportStatus, setExportStatus] = useState<{
    type: "csv" | "json" | null;
    status: "success" | "error" | null;
    message?: string;
  }>({ type: null, status: null });

  const handleExport = async (format: "csv" | "json") => {
    try {
      setExporting((prev) => ({ ...prev, [format]: true }));
      setExportStatus({ type: null, status: null });

      if (format === "json") {
        const params = new URLSearchParams({
          surveyId,
          includeProfiles: exportOptions.includeProfiles.toString(),
          includeMetadata: exportOptions.includeMetadata.toString(),
        });

        const response = await fetch(`/api/admin/export-survey-json?${params}`);

        if (!response.ok) {
          throw new Error("Export failed");
        }

        // Get the blob and create download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `survey-${surveyTitle.replace(/[^a-zA-Z0-9]/g, "-")}-${
          new Date().toISOString().split("T")[0]
        }.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        setExportStatus({
          type: "json",
          status: "success",
          message: "JSON export completed successfully",
        });
      } else {
        // CSV export logic (placeholder for future implementation)
        setExportStatus({
          type: "csv",
          status: "error",
          message: "CSV export not implemented yet",
        });
      }
    } catch (error) {
      console.error(`${format.toUpperCase()} export error:`, error);
      setExportStatus({
        type: format,
        status: "error",
        message: `Failed to export ${format.toUpperCase()} file`,
      });
    } finally {
      setExporting((prev) => ({ ...prev, [format]: false }));
      // Clear status after 5 seconds
      setTimeout(() => {
        setExportStatus({ type: null, status: null });
      }, 5000);
    }
  };

  const toggleOption = (option: keyof typeof exportOptions) => {
    setExportOptions((prev) => ({
      ...prev,
      [option]: !prev[option],
    }));
  };

  return (
    <div className="flex items-center space-x-2">
      {/* Quick JSON Export Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleExport("json")}
        disabled={exporting.json || responseCount === 0}
        className="flex items-center space-x-2 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 hover:from-blue-100 hover:to-indigo-100 hover:border-blue-300 transition-all duration-200"
      >
        {exporting.json ? (
          <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
        ) : (
          <Database className="h-4 w-4 text-blue-600" />
        )}
        <span className="text-blue-700 font-medium">Export JSON</span>
      </Button>

      {/* Advanced Export Dialog */}
      <Dialog>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={responseCount === 0}
            className="bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200 hover:from-purple-100 hover:to-indigo-100 hover:border-purple-300 transition-all duration-200"
          >
            <Settings className="h-4 w-4 mr-2 text-purple-600" />
            <span className="text-purple-700 font-medium">Export Options</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md bg-gradient-to-br from-white to-blue-50/30 backdrop-blur-sm border-blue-200">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2 text-gray-800">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                <Download className="h-5 w-5 text-white" />
              </div>
              <span>Export Survey Data</span>
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              Export survey responses with customizable options
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Survey Info */}
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 shadow-sm">
              <CardContent className="pt-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Survey:</span>
                    <span className="text-sm font-medium text-gray-800">
                      {surveyTitle}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Responses:</span>
                    <Badge className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-sm">
                      {responseCount}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Export Options */}
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-800">Export Options</h4>

              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="includeProfiles"
                      checked={exportOptions.includeProfiles}
                      onCheckedChange={() => toggleOption("includeProfiles")}
                      className="border-green-300 data-[state=checked]:bg-green-600"
                    />
                    <Label
                      htmlFor="includeProfiles"
                      className="text-sm font-medium text-gray-800"
                    >
                      Include user demographic profiles
                    </Label>
                  </div>
                  <p className="text-xs text-gray-600 ml-7 mt-1">
                    Age, gender, city size, shopping frequency, profession
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="includeMetadata"
                      checked={exportOptions.includeMetadata}
                      onCheckedChange={() => toggleOption("includeMetadata")}
                      className="border-purple-300 data-[state=checked]:bg-purple-600"
                    />
                    <Label
                      htmlFor="includeMetadata"
                      className="text-sm font-medium text-gray-800"
                    >
                      Include export metadata
                    </Label>
                  </div>
                  <p className="text-xs text-gray-600 ml-7 mt-1">
                    Export timestamp, settings, response counts
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="includeRawData"
                      checked={exportOptions.includeRawData}
                      onCheckedChange={() => toggleOption("includeRawData")}
                      className="border-orange-300 data-[state=checked]:bg-orange-600"
                    />
                    <Label
                      htmlFor="includeRawData"
                      className="text-sm font-medium text-gray-800"
                    >
                      Include raw response data
                    </Label>
                  </div>
                  <p className="text-xs text-gray-600 ml-7 mt-1">
                    Complete response data with question mappings
                  </p>
                </div>
              </div>
            </div>

            <Separator className="bg-gradient-to-r from-transparent via-gray-300 to-transparent" />

            {/* Export Buttons */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={() => handleExport("json")}
                  disabled={exporting.json || responseCount === 0}
                  className="flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  {exporting.json ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Database className="h-4 w-4" />
                  )}
                  <span>JSON</span>
                </Button>

                <Button
                  variant="outline"
                  onClick={() => handleExport("csv")}
                  disabled={exporting.csv || responseCount === 0}
                  className="flex items-center justify-center space-x-2 bg-gradient-to-r from-gray-50 to-slate-50 border-gray-300 hover:from-gray-100 hover:to-slate-100 hover:border-gray-400 transition-all duration-200"
                >
                  {exporting.csv ? (
                    <Loader2 className="h-4 w-4 animate-spin text-gray-600" />
                  ) : (
                    <FileText className="h-4 w-4 text-gray-600" />
                  )}
                  <span className="text-gray-700">CSV</span>
                </Button>
              </div>

              {/* Export Status */}
              {exportStatus.status && (
                <div
                  className={`flex items-center space-x-2 p-3 rounded-lg shadow-sm ${
                    exportStatus.status === "success"
                      ? "bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200"
                      : "bg-gradient-to-r from-red-50 to-rose-50 border border-red-200"
                  }`}
                >
                  {exportStatus.status === "success" ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-600" />
                  )}
                  <span
                    className={`text-sm font-medium ${
                      exportStatus.status === "success"
                        ? "text-green-800"
                        : "text-red-800"
                    }`}
                  >
                    {exportStatus.message}
                  </span>
                </div>
              )}

              {responseCount === 0 && (
                <div className="flex items-center space-x-2 p-3 rounded-lg bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 shadow-sm">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm font-medium text-yellow-800">
                    No responses available to export
                  </span>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
