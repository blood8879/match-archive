"use client";

import { useState, useEffect } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import {
  requestPushPermission,
  unsubscribePush,
  isPushSubscribed,
} from "@/components/providers/onesignal-provider";

interface PushNotificationToggleProps {
  className?: string;
  showLabel?: boolean;
}

export function PushNotificationToggle({
  className = "",
  showLabel = true,
}: PushNotificationToggleProps) {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [permission, setPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    const checkStatus = async () => {
      if (typeof window === "undefined") return;

      const supported =
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window;

      setIsSupported(supported);

      if (supported) {
        setPermission(Notification.permission);
        const subscribed = await isPushSubscribed();
        setIsSubscribed(subscribed);
      }

      setIsLoading(false);
    };

    checkStatus();
  }, []);

  const handleToggle = async () => {
    if (!isSupported || isLoading) return;

    setIsLoading(true);

    try {
      if (isSubscribed) {
        const success = await unsubscribePush();
        if (success) {
          setIsSubscribed(false);
        }
      } else {
        const granted = await requestPushPermission();
        if (granted) {
          setIsSubscribed(true);
          setPermission("granted");
        } else {
          setPermission(Notification.permission);
        }
      }
    } catch (error) {
      console.error("[Push] Toggle failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isSupported) {
    return null;
  }

  const isDenied = permission === "denied";

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {showLabel && (
        <div className="flex-1">
          <p className="text-sm font-medium text-white">푸시 알림</p>
          <p className="text-xs text-gray-400">
            {isDenied
              ? "브라우저 설정에서 알림을 허용해주세요"
              : isSubscribed
              ? "새 경기 등록 시 알림을 받습니다"
              : "알림을 켜서 새 경기 소식을 받아보세요"}
          </p>
        </div>
      )}

      <button
        onClick={handleToggle}
        disabled={isLoading || isDenied}
        className={`
          relative flex items-center justify-center
          w-12 h-12 rounded-xl transition-all duration-200
          ${
            isSubscribed
              ? "bg-primary-500/20 text-primary-400 hover:bg-primary-500/30"
              : isDenied
              ? "bg-gray-700/50 text-gray-500 cursor-not-allowed"
              : "bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-white"
          }
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
        title={
          isDenied
            ? "브라우저 설정에서 알림을 허용해주세요"
            : isSubscribed
            ? "알림 끄기"
            : "알림 켜기"
        }
      >
        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : isSubscribed ? (
          <Bell className="w-5 h-5" />
        ) : (
          <BellOff className="w-5 h-5" />
        )}

        {isSubscribed && !isLoading && (
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-primary-500 rounded-full animate-pulse" />
        )}
      </button>
    </div>
  );
}

export function PushNotificationBanner() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem("push-banner-dismissed");
    if (dismissed) {
      setIsDismissed(true);
    }

    const checkStatus = async () => {
      if (typeof window === "undefined") return;

      const supported =
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window;

      setIsSupported(supported);

      if (supported) {
        const subscribed = await isPushSubscribed();
        setIsSubscribed(subscribed);
      }

      setIsLoading(false);
    };

    checkStatus();
  }, []);

  const handleEnable = async () => {
    setIsLoading(true);
    try {
      const granted = await requestPushPermission();
      if (granted) {
        setIsSubscribed(true);
      }
    } catch (error) {
      console.error("[Push] Enable failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem("push-banner-dismissed", "true");
  };

  if (!isSupported || isSubscribed || isDismissed || isLoading) {
    return null;
  }

  if (Notification.permission === "denied") {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-primary-500/20 to-blue-500/20 border border-primary-500/30 rounded-xl p-4 mb-4">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 bg-primary-500/20 rounded-lg flex items-center justify-center">
          <Bell className="w-5 h-5 text-primary-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white">푸시 알림을 켜보세요</p>
          <p className="text-xs text-gray-400 mt-0.5">
            새로운 경기가 등록되면 바로 알림을 받을 수 있어요
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleDismiss}
            className="px-3 py-1.5 text-xs text-gray-400 hover:text-white transition-colors"
          >
            나중에
          </button>
          <button
            onClick={handleEnable}
            disabled={isLoading}
            className="px-3 py-1.5 text-xs bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {isLoading ? "..." : "알림 켜기"}
          </button>
        </div>
      </div>
    </div>
  );
}
