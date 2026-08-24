"use client";

import { useState, type ComponentProps } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function PasswordInput({ className, ...props }: Omit<ComponentProps<typeof Input>, "type">) {
  const [show, setShow] = useState(false);

  return (
    <div className="flex gap-2">
      <Input
        type={show ? "text" : "password"}
        className={cn("font-mono", className)}
        {...props}
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={() => setShow((current) => !current)}
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? <EyeOff /> : <Eye />}
      </Button>
    </div>
  );
}
