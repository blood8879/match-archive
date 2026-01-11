"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { requestJoinTeam } from "@/services/teams";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";

interface JoinTeamButtonProps {
  teamId: string;
}

export function JoinTeamButton({ teamId }: JoinTeamButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleJoin = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await requestJoinTeam(teamId);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "가입 신청에 실패했습니다");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <Button onClick={handleJoin} isLoading={isLoading}>
        <UserPlus className="mr-2 h-5 w-5" />
        가입 신청
      </Button>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </div>
  );
}
