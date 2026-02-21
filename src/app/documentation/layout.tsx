import { MotionDecor } from "@/components/midpoint/motion-decor";
import { TopNav } from "@/components/midpoint/top-nav";
import { DocsSidebar } from "@/components/midpoint/docs-sidebar";

export default function DocumentationLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className="midpoint-bg min-h-screen px-4 py-4 sm:px-6">
      <MotionDecor />
      <TopNav />
      <section className="mx-auto w-full max-w-6xl">
        <div className="mb-5 glass-panel interactive-lift reveal-up rounded-3xl p-6">
          <h1 className="font-montserrat text-2xl font-bold text-zinc-900 sm:text-4xl">Midpoint Documentation</h1>
          <p className="mt-2 max-w-3xl text-sm text-zinc-700 sm:text-base">
            Multi-page guide for using, deploying, and maintaining Midpoint on Polygon.
          </p>
        </div>
        <div className="grid gap-4 sm:gap-5 lg:grid-cols-[260px_1fr]">
          <DocsSidebar />
          <div className="space-y-4">{children}</div>
        </div>
      </section>
    </main>
  );
}
