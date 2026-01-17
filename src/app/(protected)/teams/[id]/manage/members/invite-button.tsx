"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { InviteModal } from "./invite-modal";

interface InviteButtonProps {
  teamId: string;
}

export function InviteButton({ teamId }: InviteButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="h-10 px-4 rounded-xl bg-primary hover:bg-primary-dark text-black font-semibold text-sm transition-all flex items-center gap-2"
      >
        <UserPlus className="w-4 h-4" />
        팀원 초대
      </button>
      <InviteModal
        teamId={teamId}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
