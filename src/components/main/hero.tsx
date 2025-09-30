"use client";

import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Users,
  Award,
  TrendingUp,
  MessageSquare,
} from "lucide-react";
import { useState, useEffect } from "react";

export function HeroSection() {
  const [displayedText, setDisplayedText] = useState("");
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const texts = ["Twórz z nami rzeczywistość", "Rozwijaj FMCG"];

  useEffect(() => {
    let charIndex = 0;
    let isDeleting = false;
    let timeout: NodeJS.Timeout;

    const type = () => {
      const currentText = texts[currentTextIndex];

      if (!isDeleting) {
        // Typing
        if (charIndex <= currentText.length) {
          setDisplayedText(currentText.slice(0, charIndex));
          charIndex++;
          timeout = setTimeout(type, 80);
        } else {
          // Finished typing, wait then start deleting
          timeout = setTimeout(() => {
            isDeleting = true;
            type();
          }, 2000); // Pause at end of text
        }
      } else {
        // Deleting
        if (charIndex > 0) {
          charIndex--;
          setDisplayedText(currentText.slice(0, charIndex));
          timeout = setTimeout(type, 40); // Faster delete speed
        } else {
          // Finished deleting, move to next text
          isDeleting = false;
          setCurrentTextIndex((prev) => (prev + 1) % texts.length);
          timeout = setTimeout(type, 500); // Pause before typing next text
        }
      }
    };

    timeout = setTimeout(type, 500); // Initial delay

    return () => clearTimeout(timeout);
  }, [currentTextIndex]);
  return (
    <section className="relative h-[70vh] w-full overflow-hidden bg-black">
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-white/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/3 rounded-full blur-3xl" />
      </div>

      <div
        className="absolute inset-0 z-0 bg-[linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] bg-[size:24px_24px] opacity-10 animate-pulse"
        style={{
          animation: "wave 8s ease-in-out infinite",
        }}
      />

      <div className="relative z-10 container mx-auto px-4 py-12 lg:py-16 h-full">
        <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-16 h-full">
          <div className="flex-1 text-center lg:text-left space-y-6">
            <div className="space-y-3">
              <h1
                className="text-5xl md:text-5xl lg:text-7xl xl:text-6xl leading-tight font-black"
                style={{
                  textShadow:
                    "0 0 20px rgba(255,255,255,0.3), 0 0 40px rgba(255,255,255,0.2)",
                  letterSpacing: "-0.02em",
                  fontWeight: "900",
                  minHeight: "1.2em",
                }}
              >
                <span className="text-white drop-shadow-lg font-black">
                  {displayedText}
                  <span className="animate-pulse">|</span>
                </span>
              </h1>

              <p className="text-base md:text-lg lg:text-xl text-gray-300 max-w-2xl text-pretty leading-relaxed">
                Masz wpływ na to, co znajdziesz jutro w sklepie. Twoje opinie
                kształtują przyszłość produktów i usług, a każda odpowiedź
                przyczynia się do realnych zmian.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button
                asChild
                size="lg"
                className="group text-lg px-8 py-6 rounded-xl bg-gradient-to-r from-white to-gray-100 hover:from-gray-100 hover:to-white text-black shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <a href="#surveys">
                  Wypełnij Ankietę
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </a>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="text-lg px-8 py-6 rounded-xl border-2 border-white text-white hover:bg-white/10 hover:border-white/80 transition-all duration-300 bg-transparent"
              >
                <a href="#how-it-works">Dowiedz się więcej</a>
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-6 pt-6 border-t border-white/30">
              <div className="text-center lg:text-left">
                <div className="text-2xl lg:text-3xl font-bold text-white">
                  5,000+
                </div>
                <div className="text-sm text-gray-300">Aktywni Uczestnicy</div>
              </div>
              <div className="text-center lg:text-left">
                <div className="text-2xl lg:text-3xl font-bold text-white">
                  1,200+
                </div>
                <div className="text-sm text-gray-300">Ukończone Ankiety</div>
              </div>
            </div>
          </div>

          <div className="flex-1 relative hidden lg:block">
            <div className="relative max-w-lg mx-auto">
              <div className="relative bg-gray-900/90 backdrop-blur-sm border border-white/20 rounded-2xl p-6 shadow-2xl">
                <div className="absolute -top-4 -right-4 w-8 h-8 bg-white rounded-full flex items-center justify-center">
                  <Award className="w-4 h-4 text-black" />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">
                        Postęp Ankiet
                      </h3>
                      <p className="text-sm text-gray-300">Śledź swój udział</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">
                        Ankieta Opinii o Produkcie
                      </span>
                      <span className="text-white font-medium">Ukończona</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div className="bg-gradient-to-r from-white to-gray-200 h-2 rounded-full w-full" />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">Badanie Rynkowe</span>
                      <span className="text-white font-medium">W trakcie</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div className="bg-gradient-to-r from-white to-gray-200 h-2 rounded-full w-[60%]" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="absolute -top-6 -left-6 bg-gray-900 border border-white/20 rounded-xl p-4 shadow-lg backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-white" />
                  <div>
                    <div className="text-sm font-medium text-white">
                      Ankiety na Żywo
                    </div>
                    <div className="text-xs text-gray-300">
                      Dołącz do 12,5K uczestników
                    </div>
                  </div>
                </div>
              </div>

              <div className="absolute -bottom-6 -right-6 bg-gray-900 border border-white/20 rounded-xl p-4 shadow-lg backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-5 h-5 text-white" />
                  <div>
                    <div className="text-sm font-medium text-white">
                      Nowa Ankieta
                    </div>
                    <div className="text-xs text-gray-300">
                      Preferencje Konsumentów
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes wave {
          0%,
          100% {
            transform: translateX(0) translateY(0);
          }
          25% {
            transform: translateX(2px) translateY(-1px);
          }
          50% {
            transform: translateX(-1px) translateY(2px);
          }
          75% {
            transform: translateX(1px) translateY(1px);
          }
        }
      `}</style>
    </section>
  );
}
