import BottomNav from "@/components/bottom-nav";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import User from "@/lib/models/User";
import { ThemeInitializer } from "@/components/theme-initializer";
import InstallPrompt from "@/components/install-prompt";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  let userTheme: "light" | "dark" = "light";
  let userAccent = "emerald";
  try {
    const session = await auth();
    if (session?.user?.id) {
      await connectDB();
      const user = await User.findById(session.user.id).select("theme accentColor").lean() as any;
      if (user?.theme) userTheme = user.theme;
      if (user?.accentColor) userAccent = user.accentColor;
    }
  } catch {}

  return (
    <>
      <ThemeInitializer theme={userTheme} accent={userAccent} />
      <div className="flex flex-col min-h-screen bg-background">
        <main className="flex-1 overflow-y-auto pb-[calc(5rem+env(safe-area-inset-bottom))]">
          {children}
        </main>
        <BottomNav />
        <InstallPrompt />
      </div>
    </>
  );
}
