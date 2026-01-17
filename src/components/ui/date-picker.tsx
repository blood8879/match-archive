"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  addYears,
  subYears,
  setMonth,
  setYear,
  isSameMonth,
  isSameDay,
  isToday,
  isBefore,
  isAfter,
  parseISO,
  getYear,
  getMonth,
} from "date-fns";
import { ko } from "date-fns/locale";
import { Calendar, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface DatePickerProps {
  name?: string;
  value?: string;
  onChange?: (value: string) => void;
  min?: string;
  max?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  label?: string;
  icon?: React.ReactNode;
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const MONTHS = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];

type ViewMode = "days" | "months" | "years";

export function DatePicker({
  name,
  value,
  onChange,
  min,
  max,
  required,
  disabled,
  placeholder = "날짜를 선택하세요",
  className,
  label,
  icon,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("days");
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (value) {
      try {
        return parseISO(value);
      } catch {
        return new Date();
      }
    }
    return new Date();
  });
  const [yearRangeStart, setYearRangeStart] = useState(() => {
    const year = getYear(currentMonth);
    return Math.floor(year / 12) * 12;
  });
  
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedDate = value ? parseISO(value) : null;
  const minDate = min ? parseISO(min) : null;
  const maxDate = max ? parseISO(max) : null;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setViewMode("days");
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (viewMode !== "days") {
          setViewMode("days");
        } else {
          setIsOpen(false);
        }
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, viewMode]);

  const handleDateSelect = useCallback(
    (date: Date) => {
      const formatted = format(date, "yyyy-MM-dd");
      onChange?.(formatted);
      setIsOpen(false);
      setViewMode("days");
    },
    [onChange]
  );

  const handleMonthSelect = useCallback((monthIndex: number) => {
    setCurrentMonth((prev) => setMonth(prev, monthIndex));
    setViewMode("days");
  }, []);

  const handleYearSelect = useCallback((year: number) => {
    setCurrentMonth((prev) => setYear(prev, year));
    setViewMode("months");
  }, []);

  const handlePrevMonth = useCallback(() => {
    setCurrentMonth((prev) => subMonths(prev, 1));
  }, []);

  const handleNextMonth = useCallback(() => {
    setCurrentMonth((prev) => addMonths(prev, 1));
  }, []);

  const handlePrevYearRange = useCallback(() => {
    setYearRangeStart((prev) => prev - 12);
  }, []);

  const handleNextYearRange = useCallback(() => {
    setYearRangeStart((prev) => prev + 12);
  }, []);

  const handlePrevYear = useCallback(() => {
    setCurrentMonth((prev) => subYears(prev, 1));
  }, []);

  const handleNextYear = useCallback(() => {
    setCurrentMonth((prev) => addYears(prev, 1));
  }, []);

  const isDateDisabled = useCallback(
    (date: Date) => {
      if (minDate && isBefore(date, minDate)) return true;
      if (maxDate && isAfter(date, maxDate)) return true;
      return false;
    },
    [minDate, maxDate]
  );

  const generateCalendarDays = useCallback(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

    const days: Date[] = [];
    let day = startDate;

    while (day <= endDate) {
      days.push(day);
      day = addDays(day, 1);
    }

    return days;
  }, [currentMonth]);

  const generateYears = useCallback(() => {
    return Array.from({ length: 12 }, (_, i) => yearRangeStart + i);
  }, [yearRangeStart]);

  const days = generateCalendarDays();
  const years = generateYears();

  const displayValue = selectedDate
    ? format(selectedDate, "yyyy년 M월 d일", { locale: ko })
    : "";

  const currentYear = getYear(currentMonth);
  const currentMonthIndex = getMonth(currentMonth);

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      {label && (
        <label className="mb-2 block text-sm font-medium text-white/80">
          {label}
        </label>
      )}

      <input type="hidden" name={name} value={value || ""} required={required} />

      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          "flex h-12 w-full items-center justify-between gap-2 rounded-lg",
          "border border-[var(--border-dark)] bg-[var(--surface-dark)] px-4 py-3",
          "text-sm text-white transition-colors duration-200",
          "hover:bg-[var(--surface-dark-hover)]",
          "focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-0",
          "disabled:cursor-not-allowed disabled:opacity-50",
          !displayValue && "text-[var(--text-400)]"
        )}
      >
        <span className="flex items-center gap-2 truncate">
          <span className="text-[var(--text-400)]">
            {icon || <Calendar className="w-5 h-5" />}
          </span>
          <span>{displayValue || placeholder}</span>
        </span>
        <ChevronDown className="h-4 w-4 opacity-50 text-[var(--text-400)]" />
      </button>

      {isOpen && (
        <div
          className={cn(
            "absolute z-50 mt-2 w-full min-w-[320px] rounded-2xl",
            "bg-[#183527]/95 backdrop-blur-xl border border-[#2f6a4d]",
            "shadow-2xl shadow-black/50",
            "animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-200"
          )}
        >
          {viewMode === "days" && (
            <>
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#2f6a4d]">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                  aria-label="이전 달"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setYearRangeStart(Math.floor(currentYear / 12) * 12);
                    setViewMode("years");
                  }}
                  className="text-white font-semibold text-lg hover:text-[#00e677] transition-colors px-3 py-1 rounded-lg hover:bg-white/5"
                >
                  {format(currentMonth, "yyyy년 M월", { locale: ko })}
                </button>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                  aria-label="다음 달"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-7 px-2 pt-3 pb-1">
                {WEEKDAYS.map((day, index) => (
                  <div
                    key={day}
                    className={cn(
                      "text-center text-xs font-medium py-2",
                      index === 0 ? "text-red-400" : "text-gray-500"
                    )}
                  >
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1 px-2 pb-3">
                {days.map((day, index) => {
                  const isCurrentMonth = isSameMonth(day, currentMonth);
                  const isSelected = selectedDate && isSameDay(day, selectedDate);
                  const isTodayDate = isToday(day);
                  const isDisabled = isDateDisabled(day);
                  const isSunday = day.getDay() === 0;

                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => !isDisabled && handleDateSelect(day)}
                      disabled={isDisabled}
                      className={cn(
                        "relative h-10 w-full rounded-lg text-sm font-medium transition-all",
                        "focus:outline-none focus:ring-2 focus:ring-[#00e677]/50",
                        !isCurrentMonth && "text-gray-600",
                        isCurrentMonth && !isSelected && "text-white",
                        isCurrentMonth && isSunday && !isSelected && "text-red-400",
                        !isSelected &&
                          !isDisabled &&
                          "hover:bg-[#00e677]/10 hover:text-[#00e677]",
                        isSelected &&
                          "bg-[#00e677] text-[#0f2319] font-bold shadow-lg shadow-[#00e677]/30",
                        isTodayDate &&
                          !isSelected &&
                          "ring-1 ring-[#00e677]/50 ring-inset",
                        isDisabled && "opacity-30 cursor-not-allowed"
                      )}
                    >
                      {format(day, "d")}
                      {isTodayDate && !isSelected && (
                        <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#00e677]" />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between px-4 py-3 border-t border-[#2f6a4d]">
                <button
                  type="button"
                  onClick={() => {
                    setCurrentMonth(new Date());
                    if (!isDateDisabled(new Date())) {
                      handleDateSelect(new Date());
                    }
                  }}
                  className="text-sm text-[#00e677] hover:text-[#00e677]/80 transition-colors"
                >
                  오늘
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-1.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                >
                  닫기
                </button>
              </div>
            </>
          )}

          {viewMode === "months" && (
            <>
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#2f6a4d]">
                <button
                  type="button"
                  onClick={handlePrevYear}
                  className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                  aria-label="이전 년"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setYearRangeStart(Math.floor(currentYear / 12) * 12);
                    setViewMode("years");
                  }}
                  className="text-white font-semibold text-lg hover:text-[#00e677] transition-colors px-3 py-1 rounded-lg hover:bg-white/5"
                >
                  {currentYear}년
                </button>
                <button
                  type="button"
                  onClick={handleNextYear}
                  className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                  aria-label="다음 년"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 p-4">
                {MONTHS.map((month, index) => {
                  const isSelected = index === currentMonthIndex;
                  return (
                    <button
                      key={month}
                      type="button"
                      onClick={() => handleMonthSelect(index)}
                      className={cn(
                        "py-3 rounded-xl text-sm font-medium transition-all",
                        "focus:outline-none focus:ring-2 focus:ring-[#00e677]/50",
                        isSelected
                          ? "bg-[#00e677] text-[#0f2319] font-bold"
                          : "text-white hover:bg-[#00e677]/10 hover:text-[#00e677]"
                      )}
                    >
                      {month}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-center px-4 py-3 border-t border-[#2f6a4d]">
                <button
                  type="button"
                  onClick={() => setViewMode("days")}
                  className="px-4 py-1.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                >
                  취소
                </button>
              </div>
            </>
          )}

          {viewMode === "years" && (
            <>
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#2f6a4d]">
                <button
                  type="button"
                  onClick={handlePrevYearRange}
                  className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                  aria-label="이전 년도"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-white font-semibold text-lg">
                  {yearRangeStart} - {yearRangeStart + 11}
                </span>
                <button
                  type="button"
                  onClick={handleNextYearRange}
                  className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                  aria-label="다음 년도"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 p-4">
                {years.map((year) => {
                  const isSelected = year === currentYear;
                  const isCurrentYear = year === getYear(new Date());
                  return (
                    <button
                      key={year}
                      type="button"
                      onClick={() => handleYearSelect(year)}
                      className={cn(
                        "py-3 rounded-xl text-sm font-medium transition-all",
                        "focus:outline-none focus:ring-2 focus:ring-[#00e677]/50",
                        isSelected
                          ? "bg-[#00e677] text-[#0f2319] font-bold"
                          : "text-white hover:bg-[#00e677]/10 hover:text-[#00e677]",
                        isCurrentYear && !isSelected && "ring-1 ring-[#00e677]/50"
                      )}
                    >
                      {year}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-center px-4 py-3 border-t border-[#2f6a4d]">
                <button
                  type="button"
                  onClick={() => setViewMode("days")}
                  className="px-4 py-1.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                >
                  취소
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

DatePicker.displayName = "DatePicker";
