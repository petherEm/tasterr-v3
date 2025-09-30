import { SignUp } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-black flex items-center justify-center">
      {/* Animated background effects matching hero section */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-white/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-[#94B2F9]/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/3 rounded-full blur-3xl" />
      </div>

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 z-0 bg-[linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] bg-[size:24px_24px] opacity-5"
      />

      {/* Sign Up Component */}
      <div className="relative z-10 w-full max-w-md px-4">
        <SignUp
          appearance={{
            elements: {
              rootBox: 'w-full',
              card: 'w-full',
            }
          }}
        />
      </div>
    </div>
  );
}
