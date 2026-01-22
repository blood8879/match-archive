export type WeatherData = {
  temperature: number;
  weatherCode: number;
  precipitation: number;
  snowfall: number;
  windSpeed: number;
  humidity: number;
  description: string;
  icon: string;
};

const WEATHER_CODES: Record<number, { description: string; icon: string }> = {
  0: { description: "맑음", icon: "sun" },
  1: { description: "대체로 맑음", icon: "sun" },
  2: { description: "부분 흐림", icon: "cloud-sun" },
  3: { description: "흐림", icon: "cloud" },
  45: { description: "안개", icon: "cloud-fog" },
  48: { description: "짙은 안개", icon: "cloud-fog" },
  51: { description: "가벼운 이슬비", icon: "cloud-drizzle" },
  53: { description: "이슬비", icon: "cloud-drizzle" },
  55: { description: "짙은 이슬비", icon: "cloud-drizzle" },
  61: { description: "가벼운 비", icon: "cloud-rain" },
  63: { description: "비", icon: "cloud-rain" },
  65: { description: "강한 비", icon: "cloud-rain" },
  66: { description: "가벼운 빙결성 비", icon: "cloud-rain" },
  67: { description: "빙결성 비", icon: "cloud-rain" },
  71: { description: "가벼운 눈", icon: "cloud-snow" },
  73: { description: "눈", icon: "cloud-snow" },
  75: { description: "강한 눈", icon: "cloud-snow" },
  77: { description: "눈 알갱이", icon: "cloud-snow" },
  80: { description: "소나기", icon: "cloud-rain" },
  81: { description: "소나기", icon: "cloud-rain" },
  82: { description: "강한 소나기", icon: "cloud-rain" },
  85: { description: "눈 소나기", icon: "cloud-snow" },
  86: { description: "강한 눈 소나기", icon: "cloud-snow" },
  95: { description: "뇌우", icon: "cloud-lightning" },
  96: { description: "뇌우와 우박", icon: "cloud-lightning" },
  99: { description: "강한 뇌우와 우박", icon: "cloud-lightning" },
};

function getWeatherInfo(code: number): { description: string; icon: string } {
  return WEATHER_CODES[code] || { description: "알 수 없음", icon: "cloud" };
}

export async function getWeather(
  latitude: number,
  longitude: number,
  date: string,
  time?: string
): Promise<WeatherData | null> {
  try {
    const matchDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const daysDiff = Math.floor((matchDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    let url: string;
    let isHistorical = daysDiff < 0;
    let isForecast = daysDiff >= 0 && daysDiff <= 16;
    
    if (!isHistorical && !isForecast) {
      return null;
    }
    
    const hour = time ? parseInt(time.split(":")[0]) : 12;
    
    if (isHistorical) {
      url = `https://archive-api.open-meteo.com/v1/archive?latitude=${latitude}&longitude=${longitude}&start_date=${date}&end_date=${date}&hourly=temperature_2m,relative_humidity_2m,precipitation,snowfall,weather_code,wind_speed_10m&timezone=Asia/Seoul`;
    } else {
      url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=temperature_2m,relative_humidity_2m,precipitation,snowfall,weather_code,wind_speed_10m&timezone=Asia/Seoul`;
    }
    
    const response = await fetch(url, { next: { revalidate: 3600 } });
    
    if (!response.ok) {
      console.error("[getWeather] API error:", response.status);
      return null;
    }
    
    const data = await response.json();
    
    if (!data.hourly || !data.hourly.time) {
      return null;
    }
    
    let targetIndex: number;
    
    if (isHistorical) {
      targetIndex = hour;
    } else {
      const targetDateTime = `${date}T${hour.toString().padStart(2, "0")}:00`;
      targetIndex = data.hourly.time.findIndex((t: string) => t === targetDateTime);
      
      if (targetIndex === -1) {
        const targetDate = date;
        targetIndex = data.hourly.time.findIndex((t: string) => t.startsWith(targetDate));
        if (targetIndex !== -1) {
          targetIndex = Math.min(targetIndex + hour, data.hourly.time.length - 1);
        }
      }
    }
    
    if (targetIndex === -1 || targetIndex >= data.hourly.time.length) {
      return null;
    }
    
    const weatherCode = data.hourly.weather_code[targetIndex] ?? 0;
    const weatherInfo = getWeatherInfo(weatherCode);
    
    return {
      temperature: Math.round(data.hourly.temperature_2m[targetIndex] ?? 0),
      weatherCode,
      precipitation: data.hourly.precipitation[targetIndex] ?? 0,
      snowfall: data.hourly.snowfall[targetIndex] ?? 0,
      windSpeed: Math.round(data.hourly.wind_speed_10m[targetIndex] ?? 0),
      humidity: data.hourly.relative_humidity_2m[targetIndex] ?? 0,
      description: weatherInfo.description,
      icon: weatherInfo.icon,
    };
  } catch (error) {
    console.error("[getWeather] Error:", error);
    return null;
  }
}
