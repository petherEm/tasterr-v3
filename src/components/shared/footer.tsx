"use client";

import { motion } from "framer-motion";
import { Mail, MapPin, Phone } from "lucide-react";
import Image from "next/image";

export default function Footer() {
  return (
    <footer className="relative bg-black text-white border-t border-white/10">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="col-span-1 md:col-span-2"
          >
            <div className="flex items-center space-x-2 mb-4">
              <Image
                src="/touch-logo.svg"
                alt="Touch"
                width={180}
                height={40}
                className="brightness-0 invert drop-shadow-lg"
              />
            </div>
            <p className="text-slate-300 mb-6 max-w-md leading-relaxed">
              Podziel się swoją opinią, zdobądź nagrody i pomóż kształtować
              przyszłość poprzez znaczące ankiety. Dołącz do tysięcy
              użytkowników, których opinie mają znaczenie.
            </p>
            <div className="flex space-x-4">
              <motion.div
                whileHover={{ scale: 1.1, y: -2 }}
                className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:from-blue-500/40 hover:to-indigo-500/40 transition-all duration-300 cursor-pointer border border-white/10 shadow-lg"
              >
                <Mail className="w-5 h-5 text-blue-300" />
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.1, y: -2 }}
                className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:from-blue-500/40 hover:to-indigo-500/40 transition-all duration-300 cursor-pointer border border-white/10 shadow-lg"
              >
                <Phone className="w-5 h-5 text-blue-300" />
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.1, y: -2 }}
                className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:from-blue-500/40 hover:to-indigo-500/40 transition-all duration-300 cursor-pointer border border-white/10 shadow-lg"
              >
                <MapPin className="w-5 h-5 text-blue-300" />
              </motion.div>
            </div>
          </motion.div>

          {/* Quick Links */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="backdrop-blur-sm bg-white/5 rounded-lg p-6 border border-white/10"
          >
            <h3 className="text-lg font-semibold mb-4 bg-gradient-to-r from-blue-300 to-indigo-300 bg-clip-text text-transparent">
              Szybkie Linki
            </h3>
            <ul className="space-y-3">
              {["Wypełnij Ankietę", "Panel Admina", "Nagrody", "Profil"].map(
                (item) => (
                  <li key={item}>
                    <motion.a
                      href="#"
                      whileHover={{ x: 4, scale: 1.02 }}
                      className="text-slate-300 hover:text-white transition-all duration-300 hover:bg-white/5 px-2 py-1 rounded block"
                    >
                      {item}
                    </motion.a>
                  </li>
                )
              )}
            </ul>
          </motion.div>

          {/* Support */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="backdrop-blur-sm bg-white/5 rounded-lg p-6 border border-white/10"
          >
            <h3 className="text-lg font-semibold mb-4 bg-gradient-to-r from-blue-300 to-indigo-300 bg-clip-text text-transparent">
              Wsparcie
            </h3>
            <ul className="space-y-3">
              {[
                "Centrum Pomocy",
                "Skontaktuj się z nami",
                "Polityka Prywatności",
                "Regulamin",
              ].map((item) => (
                <li key={item}>
                  <motion.a
                    href="#"
                    whileHover={{ x: 4, scale: 1.02 }}
                    className="text-slate-300 hover:text-white transition-all duration-300 hover:bg-white/5 px-2 py-1 rounded block"
                  >
                    {item}
                  </motion.a>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>

        {/* Bottom Section */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="border-t border-white/10 mt-8 pt-8 flex flex-col sm:flex-row justify-between items-center backdrop-blur-sm bg-white/5 rounded-lg px-6 py-4"
        >
          <p className="text-slate-300 text-sm">
            © 2025 Touch. Wszelkie prawa zastrzeżone.
          </p>
          <div className="flex items-center space-x-1 text-slate-300 text-sm mt-4 sm:mt-0">
            <span>Stworzone z</span>
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY }}
              className="text-red-400 font-bold drop-shadow-lg"
            >
              ❤️
            </motion.div>
            <span>dla lepszych ankiet</span>
          </div>
        </motion.div>
      </div>
    </footer>
  );
}
