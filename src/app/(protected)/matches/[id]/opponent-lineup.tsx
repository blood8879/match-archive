"use client";

import { useState, useTransition } from "react";
import {
  addOpponentPlayer,
  deleteOpponentPlayer,
} from "@/services/opponent-players";
import { Plus, Trash2, X, UserPlus } from "lucide-react";
import type { OpponentPlayer } from "@/types/supabase";

interface OpponentLineupProps {
  matchId: string;
  opponentPlayers: OpponentPlayer[];
  isManager: boolean;
  isFinished: boolean;
}

export function OpponentLineup({
  matchId,
  opponentPlayers,
  isManager,
  isFinished,
}: OpponentLineupProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerNumber, setNewPlayerNumber] = useState<string>("");
  const [newPlayerPosition, setNewPlayerPosition] = useState<
    "FW" | "MF" | "DF" | "GK" | ""
  >("");
  const [isPending, startTransition] = useTransition();

  const handleAddPlayer = () => {
    if (!newPlayerName.trim()) return;

    startTransition(async () => {
      await addOpponentPlayer(
        matchId,
        newPlayerName.trim(),
        newPlayerNumber ? parseInt(newPlayerNumber) : null,
        newPlayerPosition || null
      );
      setNewPlayerName("");
      setNewPlayerNumber("");
      setNewPlayerPosition("");
      setIsAdding(false);
    });
  };

  const handleDelete = (playerId: string, playerName: string) => {
    if (!confirm(`${playerName} 선수를 삭제하시겠습니까?`)) return;

    startTransition(async () => {
      await deleteOpponentPlayer(playerId, matchId);
    });
  };

  const getPositionBadgeClass = (position: string | null | undefined) => {
    switch (position) {
      case "FW":
        return "bg-blue-500/20 text-blue-400 border border-blue-500/30";
      case "MF":
        return "bg-green-500/20 text-green-400 border border-green-500/30";
      case "DF":
        return "bg-orange-500/20 text-orange-400 border border-orange-500/30";
      case "GK":
        return "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30";
      default:
        return "bg-[#214a36] text-[#8eccae]";
    }
  };

  // Filter only playing opponents
  const playingOpponents = opponentPlayers.filter((p) => p.is_playing);

  return (
    <div className="space-y-3">
      {/* 선수 목록 */}
      <ul className="space-y-2">
        {playingOpponents.map((player) => {
          return (
            <li key={player.id}>
              <div className="flex items-center justify-between rounded-lg bg-[#162e23] hover:bg-[#1e3a2c] px-4 py-3 transition-colors group">
                {/* Avatar & Name */}
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-full bg-[#214a36] flex items-center justify-center text-[#8eccae] text-xs font-bold">
                    {player.number ? (
                      <span className="text-[#8eccae] font-bold text-sm">
                        {player.number}
                      </span>
                    ) : (
                      <span className="text-[#8eccae] font-bold text-sm">
                        {player.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <span className="text-white font-medium text-sm">
                    {player.name}
                  </span>
                  {player.position && (
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-bold ${getPositionBadgeClass(
                        player.position
                      )}`}
                    >
                      {player.position}
                    </span>
                  )}
                </div>

                {/* Delete Button */}
                {isManager && !isFinished && (
                  <button
                    type="button"
                    onClick={() => handleDelete(player.id, player.name)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-red-500/20 text-red-400 transition-all"
                    title="삭제"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </li>
          );
        })}
        {playingOpponents.length === 0 && !isAdding && (
          <p className="py-8 text-center text-[#8eccae] text-sm">
            상대팀 선수를 추가해주세요
          </p>
        )}
      </ul>

      {/* Add Player Form */}
      {isManager && !isFinished && (
        <>
          {isAdding ? (
            <div className="space-y-3 rounded-lg bg-[#162e23] p-4 border border-[#214a36]">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#8eccae] text-xs font-medium mb-2">
                    이름
                  </label>
                  <input
                    type="text"
                    value={newPlayerName}
                    onChange={(e) => setNewPlayerName(e.target.value)}
                    placeholder="선수 이름"
                    className="w-full px-3 py-2 bg-[#0f2319] border border-[#214a36] rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#00e677]/50"
                  />
                </div>
                <div>
                  <label className="block text-[#8eccae] text-xs font-medium mb-2">
                    등번호
                  </label>
                  <input
                    type="number"
                    value={newPlayerNumber}
                    onChange={(e) => setNewPlayerNumber(e.target.value)}
                    placeholder="번호"
                    className="w-full px-3 py-2 bg-[#0f2319] border border-[#214a36] rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#00e677]/50"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[#8eccae] text-xs font-medium mb-2">
                  포지션
                </label>
                <select
                  value={newPlayerPosition}
                  onChange={(e) =>
                    setNewPlayerPosition(
                      e.target.value as "FW" | "MF" | "DF" | "GK" | ""
                    )
                  }
                  className="w-full px-3 py-2 bg-[#0f2319] border border-[#214a36] rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#00e677]/50"
                >
                  <option value="">선택</option>
                  <option value="FW">FW</option>
                  <option value="MF">MF</option>
                  <option value="DF">DF</option>
                  <option value="GK">GK</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsAdding(false)}
                  className="flex-1 px-4 py-2 rounded-lg bg-[#162e23] hover:bg-[#1e3a2c] text-[#8eccae] text-sm font-medium transition-colors border border-[#214a36] flex items-center justify-center gap-2"
                >
                  <X className="h-4 w-4" />
                  취소
                </button>
                <button
                  onClick={handleAddPlayer}
                  disabled={isPending || !newPlayerName.trim()}
                  className="flex-1 px-4 py-2 rounded-lg bg-[#00e677] hover:bg-green-400 text-[#0f2319] text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  {isPending ? "추가 중..." : "추가"}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsAdding(true)}
              className="w-full px-4 py-2 rounded-lg bg-[#162e23] hover:bg-[#1e3a2c] text-[#8eccae] text-sm font-medium transition-colors border border-[#214a36] flex items-center justify-center gap-2"
            >
              <UserPlus className="h-4 w-4" />
              상대팀 선수 추가
            </button>
          )}
        </>
      )}

    </div>
  );
}
