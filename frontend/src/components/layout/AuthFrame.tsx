import type { ReactNode } from "react";
import { Link } from "react-router";
import { BubiMascot } from "@/components/shared/BubiMascot";

function AuthArtwork() {
  return (
    <div className="auth-art-canvas">
      <div className="auth-art-panel">
        <div className="auth-art-wave-wrap">
          <div className="auth-art-wave-rotation">
            <img className="auth-art-wave" src="/assets/auth-wave.svg" alt="" />
          </div>
        </div>
        <img className="auth-art-orb-large" src="/assets/auth-orb-large.svg" alt="" />
        <img className="auth-art-orb-small" src="/assets/auth-orb-small.svg" alt="" />
        <img className="auth-art-orb-edge" src="/assets/auth-orb-edge.svg" alt="" />
        <img className="auth-art-orb-top" src="/assets/auth-orb-top.svg" alt="" />
        <Link className="auth-art-wordmark" to="/">Deep Notes</Link>
        <div className="auth-bubi-desktop"><BubiMascot animation="wave" animationKey="auth-desktop" decorative emotion="semangat" /></div>
      </div>
      <img className="auth-art-left-wave" src="/assets/auth-wave-left-edge.svg" alt="" />
      <img className="auth-art-right-wave" src="/assets/auth-wave-right-edge.svg" alt="" />
    </div>
  );
}

export function AuthFrame({ children, description, title }: {
  children: ReactNode;
  description: string;
  title: string;
}) {
  return (
    <main className="min-h-dvh bg-auth-surface text-navy">
      <div className="mx-auto grid min-h-dvh max-w-[1440px] grid-cols-1 items-center xl:grid-cols-[minmax(0,1fr)_526px] xl:pr-[75px]">
        <div className="relative hidden h-dvh xl:block">
          <AuthArtwork />
        </div>
        <section className="mx-auto flex w-full max-w-[526px] flex-col justify-center px-5 py-8 sm:px-8 xl:px-0 xl:py-0">
          <Link className="mb-3 text-xl font-extrabold tracking-[-0.06em] text-navy xl:hidden" to="/">
            Deep Notes
          </Link>
          <div aria-hidden="true" className="auth-bubi-mobile"><BubiMascot animation="wave" animationKey="auth-mobile" className="h-20 w-auto" decorative emotion="semangat" /></div>
          <header>
            <h1 className="text-[43px] font-bold leading-[1.15] tracking-[-0.035em] text-navy">{title}</h1>
            <p className="mt-2 text-[15px] leading-[26px] text-auth-subtle">{description}</p>
          </header>
          <div className="mt-8">{children}</div>
        </section>
      </div>
    </main>
  );
}

export function AuthDivider() {
  return (
    <div className="auth-or-divider" aria-label="or" role="separator">
      <img src="/assets/auth-or-divider.svg" alt="" />
      <span>or</span>
    </div>
  );
}
