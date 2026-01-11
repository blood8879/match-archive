"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    daum: {
      Postcode: new (config: {
        oncomplete: (data: DaumPostcodeData) => void;
        width?: string | number;
        height?: string | number;
      }) => {
        embed: (element: HTMLElement) => void;
      };
    };
  }
}

export interface DaumPostcodeData {
  address: string; // 주소
  addressEnglish: string; // 영문 주소
  addressType: "R" | "J"; // 주소 타입 (R: 도로명, J: 지번)
  apartment: "Y" | "N"; // 아파트 여부
  autoJibunAddress: string; // 지번 주소 (도로명 검색 시 제공)
  autoJibunAddressEnglish: string; // 영문 지번 주소
  autoRoadAddress: string; // 도로명 주소 (지번 검색 시 제공)
  autoRoadAddressEnglish: string; // 영문 도로명 주소
  bcode: string; // 법정동 코드
  bname: string; // 법정동명
  bname1: string; // 법정리명
  bname2: string; // 법정동명
  bnameEnglish: string; // 영문 법정동명
  buildingCode: string; // 건물 관리 번호
  buildingName: string; // 건물명
  hname: string; // 행정동명
  jibunAddress: string; // 지번 주소
  jibunAddressEnglish: string; // 영문 지번 주소
  noSelected: "Y" | "N"; // 검색결과 선택 여부
  postcode: string; // 우편번호 (5자리)
  postcode1: string; // 우편번호 앞 3자리
  postcode2: string; // 우편번호 뒤 2자리
  postcodeSeq: string; // 우편번호 일련번호
  query: string; // 검색어
  roadAddress: string; // 도로명 주소
  roadAddressEnglish: string; // 영문 도로명 주소
  roadname: string; // 도로명
  roadnameCode: string; // 도로명 코드
  roadnameEnglish: string; // 영문 도로명
  sido: string; // 시도명
  sidoEnglish: string; // 영문 시도명
  sigungu: string; // 시군구명
  sigunguCode: string; // 시군구 코드
  sigunguEnglish: string; // 영문 시군구명
  userLanguageType: "K" | "E"; // 검색 언어 (K: 한글, E: 영문)
  userSelectedType: "R" | "J"; // 사용자가 선택한 주소 타입
  zonecode: string; // 우편번호 (구 우편번호)
}

interface DaumPostcodeProps {
  onComplete: (data: DaumPostcodeData) => void;
  width?: string | number;
  height?: string | number;
}

export function DaumPostcode({
  onComplete,
  width = "100%",
  height = 400,
}: DaumPostcodeProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadScript = () => {
      if (window.daum?.Postcode) {
        initPostcode();
        return;
      }

      const script = document.createElement("script");
      script.src =
        "//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
      script.async = true;
      script.onload = () => initPostcode();
      document.body.appendChild(script);
    };

    const initPostcode = () => {
      if (!containerRef.current) return;

      const postcode = new window.daum.Postcode({
        oncomplete: onComplete,
        width,
        height,
      });

      postcode.embed(containerRef.current);
    };

    loadScript();
  }, [onComplete, width, height]);

  return <div ref={containerRef} style={{ width, height }} />;
}
