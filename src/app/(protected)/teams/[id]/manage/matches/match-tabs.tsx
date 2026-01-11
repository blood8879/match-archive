"use client";

import { useState } from "react";
import Link from "next/link";
import { Calendar, MapPin, Edit, Users, Plus, Trophy, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DeleteMatchButton } from "./delete-match-button";
import type { Match } from "@/types/supabase";

interface MatchTabsProps {
  scheduledMatches: Match[];
  finishedMatches: Match[];
  allMatches: Match[];
  teamId: string;
}

type TabType = "scheduled" | "finished" | "all";

export function MatchTabs({
  scheduledMatches,
  finishedMatches,
  allMatches,
  teamId,
}: MatchTabsProps) {
  const [activeTab, setActiveTab] = useState<TabType>("scheduled");

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      time: date.toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      dayOfWeek: date.toLocaleDateString("ko-KR", { weekday: "long" }),
    };
  };

  const getResultBadge = (homeScore: number, awayScore: number) => {
    if (homeScore > awayScore) {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/20 text-primary font-bold text-sm">
          <Trophy className="w-4 h-4" />승
        </span>
      );
    } else if (homeScore < awayScore) {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-500/20 text-red-400 font-bold text-sm">
          <XCircle className="w-4 h-4" />패
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gray-500/20 text-gray-400 font-bold text-sm">
          무
        </span>
      );
    }
  };

  const MatchCard = ({
    match,
    showResult = false,
  }: {
    match: Match;
    showResult?: boolean;
  }) => {
    const { date, time, dayOfWeek } = formatDate(match.match_date);

    return (
      <Card className="hover:border-primary/30 transition-all">
        <CardContent className="p-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-lg font-bold text-white">
                    vs {match.opponent_name}
                  </h3>
                  {showResult &&
                    getResultBadge(match.home_score, match.away_score)}
                </div>
                <div className="flex flex-col gap-1 text-sm text-gray-400">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {date} ({dayOfWeek})
                    </span>
                    <span className="text-primary">{time}</span>
                  </div>
                  {match.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      <span>{match.location}</span>
                    </div>
                  )}
                </div>
              </div>
              {showResult && (
                <div className="text-right">
                  <div className="text-3xl font-bold text-white">
                    {match.home_score} - {match.away_score}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {match.quarters}쿼터
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pt-4 border-t border-white/5">
              <Link href={`/matches/${match.id}`} className="flex-1">
                <Button variant="secondary" size="sm" className="w-full">
                  <Users className="w-4 h-4 mr-2" />
                  라인업 관리
                </Button>
              </Link>
              <Link href={`/teams/${teamId}/manage/matches/${match.id}/edit`}>
                <Button variant="ghost" size="sm">
                  <Edit className="w-4 h-4" />
                </Button>
              </Link>
              <DeleteMatchButton matchId={match.id} teamId={teamId} />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderMatches = () => {
    let matchesToShow: Match[] = [];
    let showResults = false;

    switch (activeTab) {
      case "scheduled":
        matchesToShow = scheduledMatches;
        showResults = false;
        break;
      case "finished":
        matchesToShow = finishedMatches;
        showResults = true;
        break;
      case "all":
        matchesToShow = allMatches;
        showResults = true;
        break;
    }

    if (matchesToShow.length === 0) {
      return (
        <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
          <Calendar className="w-16 h-16 text-gray-600 mb-4" />
          <h3 className="text-xl font-bold text-gray-400 mb-2">
            {activeTab === "scheduled" && "예정된 경기가 없습니다"}
            {activeTab === "finished" && "완료된 경기가 없습니다"}
            {activeTab === "all" && "등록된 경기가 없습니다"}
          </h3>
          <p className="text-gray-500 mb-6">
            새로운 경기를 생성하여 팀원들과 일정을 공유하세요
          </p>
          <Link href={`/teams/${teamId}/matches/new`}>
            <Button variant="primary">
              <Plus className="w-5 h-5 mr-2" />
              경기 생성하기
            </Button>
          </Link>
        </div>
      );
    }

    return matchesToShow.map((match) => (
      <MatchCard key={match.id} match={match} showResult={showResults} />
    ));
  };

  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="mb-6">
        <div className="flex gap-4 border-b border-white/10">
          <button
            onClick={() => setActiveTab("scheduled")}
            className={`px-4 py-3 text-sm font-semibold transition-colors ${
              activeTab === "scheduled"
                ? "text-primary border-b-2 border-primary"
                : "text-gray-400 hover:text-white"
            }`}
          >
            예정된 경기 ({scheduledMatches.length})
          </button>
          <button
            onClick={() => setActiveTab("finished")}
            className={`px-4 py-3 text-sm font-semibold transition-colors ${
              activeTab === "finished"
                ? "text-primary border-b-2 border-primary"
                : "text-gray-400 hover:text-white"
            }`}
          >
            완료된 경기 ({finishedMatches.length})
          </button>
          <button
            onClick={() => setActiveTab("all")}
            className={`px-4 py-3 text-sm font-semibold transition-colors ${
              activeTab === "all"
                ? "text-primary border-b-2 border-primary"
                : "text-gray-400 hover:text-white"
            }`}
          >
            모든 경기 ({allMatches.length})
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {renderMatches()}
      </div>
    </div>
  );
}
