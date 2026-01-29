"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

declare global {
  interface Window {
    OneSignalDeferred?: Array<(OneSignal: any) => void>;
  }
}

interface OneSignalProviderProps {
  children: React.ReactNode;
}

export function OneSignalProvider({ children }: OneSignalProviderProps) {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
    if (!appId || appId === "your_onesignal_app_id") {
      console.warn("[OneSignal] App ID not configured");
      return;
    }

    const script = document.createElement("script");
    script.src = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";
    script.defer = true;
    document.head.appendChild(script);

    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal: any) => {
      try {
        await OneSignal.init({
          appId,
          safari_web_id: undefined,
          notifyButton: { enable: false },
          welcomeNotification: { disable: true },
          promptOptions: { autoPrompt: false },
          serviceWorkerPath: "/OneSignalSDKWorker.js",
        });

        console.log("[OneSignal] Initialized successfully");
        await linkUserToOneSignal();
      } catch (error) {
        console.error("[OneSignal] Initialization failed:", error);
      }
    });
  }, []);

  return <>{children}</>;
}

async function linkUserToOneSignal() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user && window.OneSignalDeferred) {
      window.OneSignalDeferred.push(async (OneSignal: any) => {
        await OneSignal.login(user.id);
        console.log("[OneSignal] User linked:", user.id);
      });
    }
  } catch (error) {
    console.error("[OneSignal] Failed to link user:", error);
  }
}

export async function requestPushPermission(): Promise<boolean> {
  return new Promise((resolve) => {
    if (!window.OneSignalDeferred) {
      resolve(false);
      return;
    }

    window.OneSignalDeferred.push(async (OneSignal: any) => {
      try {
        const permission = await OneSignal.Notifications.permission;
        
        if (permission) {
          await OneSignal.User.PushSubscription.optIn();
          resolve(true);
          return;
        }

        await OneSignal.Notifications.requestPermission();
        const newPermission = await OneSignal.Notifications.permission;
        
        if (newPermission) {
          await OneSignal.User.PushSubscription.optIn();
        }
        
        resolve(newPermission);
      } catch (error) {
        console.error("[OneSignal] Permission request failed:", error);
        resolve(false);
      }
    });
  });
}

export async function unsubscribePush(): Promise<boolean> {
  return new Promise((resolve) => {
    if (!window.OneSignalDeferred) {
      resolve(false);
      return;
    }

    window.OneSignalDeferred.push(async (OneSignal: any) => {
      try {
        await OneSignal.User.PushSubscription.optOut();
        resolve(true);
      } catch (error) {
        console.error("[OneSignal] Unsubscribe failed:", error);
        resolve(false);
      }
    });
  });
}

export async function isPushSubscribed(): Promise<boolean> {
  return new Promise((resolve) => {
    if (!window.OneSignalDeferred) {
      resolve(false);
      return;
    }

    window.OneSignalDeferred.push(async (OneSignal: any) => {
      try {
        const optedIn = OneSignal.User.PushSubscription.optedIn;
        resolve(optedIn === true);
      } catch (error) {
        console.error("[OneSignal] Check subscription failed:", error);
        resolve(false);
      }
    });
  });
}

export async function setUserTags(tags: Record<string, string>): Promise<void> {
  return new Promise((resolve) => {
    if (!window.OneSignalDeferred) {
      resolve();
      return;
    }

    window.OneSignalDeferred.push(async (OneSignal: any) => {
      try {
        await OneSignal.User.addTags(tags);
        resolve();
      } catch (error) {
        console.error("[OneSignal] Set tags failed:", error);
        resolve();
      }
    });
  });
}
