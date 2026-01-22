import type { WeatherData } from "@/services/weather";
import {
  Sun,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudSun,
  Wind,
  Droplets,
  Snowflake,
  Thermometer,
} from "lucide-react";

interface MatchWeatherProps {
  weather: WeatherData;
}

function WeatherIcon({ icon, size = 32 }: { icon: string; size?: number }) {
  const iconProps = { size, className: "text-[#00e677]" };
  
  switch (icon) {
    case "sun":
      return <Sun {...iconProps} className="text-yellow-400" />;
    case "cloud-sun":
      return <CloudSun {...iconProps} className="text-yellow-300" />;
    case "cloud":
      return <Cloud {...iconProps} className="text-gray-400" />;
    case "cloud-rain":
      return <CloudRain {...iconProps} className="text-blue-400" />;
    case "cloud-drizzle":
      return <CloudDrizzle {...iconProps} className="text-blue-300" />;
    case "cloud-snow":
      return <CloudSnow {...iconProps} className="text-blue-200" />;
    case "cloud-fog":
      return <CloudFog {...iconProps} className="text-gray-300" />;
    case "cloud-lightning":
      return <CloudLightning {...iconProps} className="text-purple-400" />;
    default:
      return <Cloud {...iconProps} />;
  }
}

export function MatchWeather({ weather }: MatchWeatherProps) {
  return (
    <div className="flex items-center gap-4 px-4 py-3 bg-[#162e23]/50 rounded-xl">
      <div className="flex flex-col items-center">
        <WeatherIcon icon={weather.icon} size={36} />
        <span className="text-[10px] text-[#8eccae] mt-1">{weather.description}</span>
      </div>
      
      <div className="h-10 w-px bg-[#214a36]" />
      
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-1.5">
          <Thermometer size={14} className="text-red-400" />
          <span className="text-white font-medium">{weather.temperature}°C</span>
        </div>
        
        {weather.precipitation > 0 && (
          <div className="flex items-center gap-1.5">
            <Droplets size={14} className="text-blue-400" />
            <span className="text-white/80">{weather.precipitation}mm</span>
          </div>
        )}
        
        {weather.snowfall > 0 && (
          <div className="flex items-center gap-1.5">
            <Snowflake size={14} className="text-blue-200" />
            <span className="text-white/80">{weather.snowfall}cm</span>
          </div>
        )}
        
        <div className="flex items-center gap-1.5">
          <Wind size={14} className="text-[#8eccae]" />
          <span className="text-white/80">{weather.windSpeed}km/h</span>
        </div>
      </div>
    </div>
  );
}
