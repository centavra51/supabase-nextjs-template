import Link from "next/link";
import { ArrowLeft, SearchCheck, Sparkles, WandSparkles } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const productName = process.env.NEXT_PUBLIC_PRODUCTNAME || "AuditFlow";

  const workflow = [
    {
      icon: SearchCheck,
      title: "Audit the listing",
      text: "See SEO, conversion, compliance, and readability issues in one report.",
    },
    {
      icon: Sparkles,
      title: "Compare competitors",
      text: "Spot keyword gaps, messaging differences, and missed positioning angles.",
    },
    {
      icon: WandSparkles,
      title: "Generate rewrite",
      text: "Turn the audit into stronger title and bullet options without leaving the workflow.",
    },
  ];

  return (
    <div className="flex min-h-screen bg-[linear-gradient(180deg,#fffaf0_0%,#f8fafc_100%)]">
      <div className="relative flex w-full flex-col justify-center px-4 py-12 sm:px-6 lg:w-1/2 lg:px-8">
        <Link
          href="/auth/login"
          className="absolute left-8 top-8 flex items-center text-sm text-slate-600 transition-colors hover:text-slate-950"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to sign in
        </Link>

        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="text-center">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">Amazon listing workflow</div>
            <h2 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">{productName}</h2>
            <p className="mt-4 text-sm leading-6 text-slate-600">
              Sign in to open the audit workspace directly. No template dashboard, no generic SaaS landing, just the
              product flow.
            </p>
          </div>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">{children}</div>
      </div>

      <div className="hidden lg:flex lg:w-1/2 bg-[radial-gradient(circle_at_top_right,#fde68a,transparent_25%),linear-gradient(135deg,#0f172a_0%,#1e293b_58%,#334155_100%)]">
        <div className="flex w-full items-center justify-center p-12">
          <div className="max-w-lg space-y-6">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-300">What happens after login</div>
              <h3 className="mt-4 text-3xl font-semibold tracking-tight text-white">
                Enter the product immediately, not a template homepage.
              </h3>
              <p className="mt-4 text-sm leading-7 text-slate-200">
                The app now opens into the audit workflow. Start with a listing draft, review the weak spots, then move
                directly into competitor context and AI rewrite.
              </p>
            </div>

            <div className="space-y-4">
              {workflow.map((item, index) => (
                <div key={item.title} className="rounded-[24px] border border-white/10 bg-white/10 p-5 backdrop-blur-sm">
                  <div className="flex items-start gap-4">
                    <div className="rounded-2xl bg-amber-300/20 p-3 text-amber-300">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Step 0{index + 1}</div>
                      <div className="mt-1 text-lg font-semibold text-white">{item.title}</div>
                      <div className="mt-2 text-sm leading-6 text-slate-200">{item.text}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
