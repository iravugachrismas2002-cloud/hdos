// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
import Image from "next/image";
import Link from "next/link";

export function BrandLogo({ href = "/", className = "" }: { href?: string; className?: string }) {
  return (
    <Link href={href} aria-label="HDOS Rwanda home" className={`inline-flex ${className}`}>
      <Image
        src="/hdos-rwanda-logo.png"
        alt="HDOS Rwanda — Higher Education & Career Opportunities System"
        width={768}
        height={768}
        priority
        className="h-auto w-full object-contain"
      />
    </Link>
  );
}
