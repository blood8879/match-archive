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
  setHours,
  setMinutes,
  getYear,
  getMonth,
} from "date-fns";
import { ko } from "date-fns/locale";
import { Calendar, ChevronDown, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface DateTimePickerProps {
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
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const MONTHS = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

type ViewMode = "days" | "months" | "years";

export function DateTimePicker({
  name,
  value,
  onChange,
  min,
  max,
  required,
  disabled,
  placeholder = "날짜와 시간을 선택하세요",
  className,
  label,
}: DateTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"date" | "time">("date");
  const [viewMode, setViewMode] = useState<ViewMode>("days");

  const parseValue = useCallback((val: string | undefined) => {
    if (!val) return null;
    try {
      return parseISO(val);
    } catch {
      return null;
    }
  }, []);

  const initialDate = parseValue(value);
  const [currentMonth, setCurrentMonth] = useState(() => initialDate || new Date());
  const [yearRangeStart, setYearRangeStart] = useState(() => {
    const year = getYear(currentMonth);
    return Math.floor(year / 12) * 12;
  });
  const [selectedDate, setSelectedDate] = useState<Date | null>(initialDate);
  const [selectedHour, setSelectedHour] = useState(() =>
    initialDate ? initialDate.getHours() : 19
  );
  const [selectedMinute, setSelectedMinute] = useState(() =>
    initialDate ? Math.floor(initialDate.getMinutes() / 5) * 5 : 0
  );

  const containerRef = useRef<HTMLDivElement>(null);

  const minDate = min ? parseISO(min) : null;
  const maxDate = max ? parseISO(max) : null;

  useEffect(() => {
    const parsed = parseValue(value);
    if (parsed) {
      setSelectedDate(parsed);
      setSelectedHour(parsed.getHours());
      setSelectedMinute(Math.floor(parsed.getMinutes() / 5) * 5);
      setCurrentMonth(parsed);
    }
  }, [value, parseValue]);

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

  const updateValue = useCallback(
    (date: Date, hour: number, minute: number) => {
      const dateTime = setMinutes(setHours(date, hour), minute);
      const formatted = format(dateTime, "yyyy-MM-dd'T'HH:mm:ss'+09:00'");
      onChange?.(formatted);
    },
    [onChange]
  );

  const handleDateSelect = useCallback(
    (date: Date) => {
      setSelectedDate(date);
      updateValue(date, selectedHour, selectedMinute);
      setActiveTab("time");
    },
    [selectedHour, selectedMinute, updateValue]
  );

  const handleMonthSelect = useCallback((monthIndex: number) => {
    setCurrentMonth((prev) => setMonth(prev, monthIndex));
    setViewMode("days");
  }, []);

  const handleYearSelect = useCallback((year: number) => {
    setCurrentMonth((prev) => setYear(prev, year));
    setViewMode("months");
  }, []);

  const handleTimeChange = useCallback(
    (hour: number, minute: number) => {
      setSelectedHour(hour);
      setSelectedMinute(minute);
      if (selectedDate) {
        updateValue(selectedDate, hour, minute);
      }
    },
    [selectedDate, updateValue]
  );

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
    ? `${format(selectedDate, "yyyy년 M월 d일", { locale: ko })} ${String(
        selectedHour
      ).padStart(2, "0")}:${String(selectedMinute).padStart(2, "0")}`
    : "";

  const currentYear = getYear(currentMonth);
  const currentMonthIndex = getMonth(currentMonth);

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      {label && (
        <label className="mb-2 block text-sm font-medium text-gray-300">
          {label}
        </label>
      )}

      <input
        type="hidden"
        name={name}
        value={
          selectedDate
            ? format(
                setMinutes(setHours(selectedDate, selectedHour), selectedMinute),
                "yyyy-MM-dd'T'HH:mm:ss'+09:00'"
              )
            : ""
        }
        required={required}
      />

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
            <Calendar className="w-5 h-5" />
          </span>
          <span>{displayValue || placeholder}</span>
        </span>
        <ChevronDown className="h-4 w-4 opacity-50 text-[var(--text-400)]" />
      </button>

      {isOpen && (
        <div
          className={cn(
            "absolute z-50 mt-2 w-full min-w-[340px] rounded-2xl",
            "bg-[#183527]/95 backdrop-blur-xl border border-[#2f6a4d]",
            "shadow-2xl shadow-black/50",
            "animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-200"
          )}
        >
          <div className="flex border-b border-[#2f6a4d]">
            <button
              type="button"
              onClick={() => {
                setActiveTab("date");
                setViewMode("days");
              }}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-all",
                activeTab === "date"
                  ? "text-[#00e677] border-b-2 border-[#00e677] bg-[#00e677]/5"
                  : "text-gray-400 hover:text-white"
              )}
            >
              <Calendar className="w-4 h-4" />
              날짜
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("time")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-all",
                activeTab === "time"
                  ? "text-[#00e677] border-b-2 border-[#00e677] bg-[#00e677]/5"
                  : "text-gray-400 hover:text-white"
              )}
            >
              <Clock className="w-4 h-4" />
              시간
            </button>
          </div>

          {activeTab === "date" && viewMode === "days" && (
            <>
              <div className="flex items-center justify-between px-4 py-3">
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

              <div className="grid grid-cols-7 px-2 pb-1">
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
            </>
          )}

          {activeTab === "date" && viewMode === "months" && (
            <>
              <div className="flex items-center justify-between px-4 py-3">
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

          {activeTab === "date" && viewMode === "years" && (
            <>
              <div className="flex items-center justify-between px-4 py-3">
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

          {activeTab === "time" && (
            <div className="p-4">
              <div className="flex items-center justify-center gap-6 mb-6">
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-2">시</p>
                  <div className="text-4xl font-bold text-white tabular-nums">
                    {String(selectedHour).padStart(2, "0")}
                  </div>
                </div>
                <div className="text-4xl font-bold text-[#00e677]">:</div>
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-2">분</p>
                  <div className="text-4xl font-bold text-white tabular-nums">
                    {String(selectedMinute).padStart(2, "0")}
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-xs text-gray-400 mb-2 font-medium">시간 선택</p>
                <div className="grid grid-cols-6 gap-1.5 max-h-32 overflow-y-auto p-1">
                  {HOURS.map((hour) => (
                    <button
                      key={hour}
                      type="button"
                      onClick={() => handleTimeChange(hour, selectedMinute)}
                      className={cn(
                        "py-2 rounded-lg text-sm font-medium transition-all",
                        selectedHour === hour
                          ? "bg-[#00e677] text-[#0f2319] font-bold"
                          : "text-gray-300 hover:bg-white/10 hover:text-white"
                      )}
                    >
                      {String(hour).padStart(2, "0")}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs text-gray-400 mb-2 font-medium">분 선택</p>
                <div className="grid grid-cols-6 gap-1.5 p-1">
                  {MINUTES.map((minute) => (
                    <button
                      key={minute}
                      type="button"
                      onClick={() => handleTimeChange(selectedHour, minute)}
                      className={cn(
                        "py-2 rounded-lg text-sm font-medium transition-all",
                        selectedMinute === minute
                          ? "bg-[#00e677] text-[#0f2319] font-bold"
                          : "text-gray-300 hover:bg-white/10 hover:text-white"
                      )}
                    >
                      {String(minute).padStart(2, "0")}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-[#2f6a4d]">
                <p className="text-xs text-gray-400 mb-2 font-medium">빠른 선택</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: "오전 9시", hour: 9, minute: 0 },
                    { label: "오후 2시", hour: 14, minute: 0 },
                    { label: "오후 7시", hour: 19, minute: 0 },
                    { label: "오후 9시", hour: 21, minute: 0 },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => handleTimeChange(preset.hour, preset.minute)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                        selectedHour === preset.hour && selectedMinute === preset.minute
                          ? "bg-[#00e677]/20 text-[#00e677] border border-[#00e677]"
                          : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-transparent"
                      )}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between px-4 py-3 border-t border-[#2f6a4d]">
            <div className="text-sm text-gray-400">
              {selectedDate && (
                <span className="text-[#00e677] font-medium">
                  {format(selectedDate, "M/d", { locale: ko })}{" "}
                  {String(selectedHour).padStart(2, "0")}:
                  {String(selectedMinute).padStart(2, "0")}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setViewMode("days");
              }}
              className="px-4 py-2 rounded-xl text-sm font-bold bg-[#00e677] text-[#0f2319] hover:bg-[#00e677]/90 transition-all"
            >
              확인
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

DateTimePicker.displayName = "DateTimePicker";
