// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
import type { ReactNode } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from "@/components/ui/card";

export function AuthCard({ title, description, children, footer }: { title: string; description: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-secondary/40 px-4 py-8">
      <BrandLogo className="mb-6 w-52" />
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold leading-none tracking-tight">{title}</h1>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">{children}</CardContent>
        {footer && <CardFooter className="flex flex-col gap-2 text-sm text-muted-foreground">{footer}</CardFooter>}
      </Card>
    </div>
  );
}
