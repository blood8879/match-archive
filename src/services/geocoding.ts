export type GeocodingResult = {
  latitude: number;
  longitude: number;
} | null;

export async function geocodeAddress(address: string): Promise<GeocodingResult> {
  if (!address || address.trim().length === 0) {
    return null;
  }

  // Kakao Maps API (한국 주소에 가장 정확)
  const kakaoApiKey = process.env.KAKAO_REST_API_KEY;
  if (kakaoApiKey) {
    const kakaoResult = await geocodeWithKakao(address, kakaoApiKey);
    if (kakaoResult) return kakaoResult;
  }

  // Fallback: Nominatim (OpenStreetMap) - 무료, API 키 불필요
  const nominatimResult = await geocodeWithNominatim(address);
  if (nominatimResult) return nominatimResult;

  return null;
}

async function geocodeWithKakao(address: string, apiKey: string): Promise<GeocodingResult> {
  try {
    const url = `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(address)}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `KakaoAK ${apiKey}`,
      },
    });

    if (!response.ok) {
      console.error("[geocodeWithKakao] API error:", response.status);
      return null;
    }

    const data = await response.json();
    
    if (data.documents && data.documents.length > 0) {
      const result = data.documents[0];
      return {
        latitude: parseFloat(result.y),
        longitude: parseFloat(result.x),
      };
    }

    // 주소 검색 실패 시 키워드 검색 시도
    const keywordUrl = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(address)}`;
    const keywordResponse = await fetch(keywordUrl, {
      headers: {
        Authorization: `KakaoAK ${apiKey}`,
      },
    });

    if (keywordResponse.ok) {
      const keywordData = await keywordResponse.json();
      if (keywordData.documents && keywordData.documents.length > 0) {
        const result = keywordData.documents[0];
        return {
          latitude: parseFloat(result.y),
          longitude: parseFloat(result.x),
        };
      }
    }

    return null;
  } catch (error) {
    console.error("[geocodeWithKakao] Error:", error);
    return null;
  }
}

async function geocodeWithNominatim(address: string): Promise<GeocodingResult> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "MatchArchive/1.0",
      },
    });

    if (!response.ok) {
      console.error("[geocodeWithNominatim] API error:", response.status);
      return null;
    }

    const data = await response.json();

    if (data && data.length > 0) {
      return {
        latitude: parseFloat(data[0].lat),
        longitude: parseFloat(data[0].lon),
      };
    }

    return null;
  } catch (error) {
    console.error("[geocodeWithNominatim] Error:", error);
    return null;
  }
}
