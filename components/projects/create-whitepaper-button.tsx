"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface CreateWhitepaperButtonProps {
  projectId: string;
}

export function CreateWhitepaperButton({ projectId }: CreateWhitepaperButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleClick() {
    setLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/whitepaper`, { method: "POST" });
      if (response.ok) {
        router.refresh();
      } else {
        console.error("Failed to create whitepaper", await response.text());
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button onClick={handleClick} disabled={loading} className="w-full">
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Whitepaper"}
    </Button>
  );
}
