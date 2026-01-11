import Link from "next/link";
import { BarChart3, Users, Archive, PlayCircle, ArrowRight, ChevronLeft, ChevronRight, Star, Menu } from "lucide-react";

export default function Home() {
  return (
    <div className="bg-[#0f2319] text-white font-sans antialiased overflow-x-hidden">
      <nav className="fixed top-0 left-0 right-0 z-50 h-16 bg-[#0f2319]/85 backdrop-blur-xl border-b border-white/[0.08]">
        <div className="h-full flex items-center justify-between px-4 md:px-10 lg:px-40 max-w-[1440px] mx-auto">
          <Link href="/" className="flex items-center gap-4 text-white">
            <div className="size-8 text-[#00e677]">
              <svg className="w-full h-full" fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                <g clipPath="url(#clip0_6_535)">
                  <path clipRule="evenodd" d="M47.2426 24L24 47.2426L0.757355 24L24 0.757355L47.2426 24ZM12.2426 21H35.7574L24 9.24264L12.2426 21Z" fill="currentColor" fillRule="evenodd"></path>
                </g>
                <defs>
                  <clipPath id="clip0_6_535"><rect fill="white" height="48" width="48"></rect></clipPath>
                </defs>
              </svg>
            </div>
            <h2 className="text-white text-xl font-bold leading-tight tracking-tight">Match Archive</h2>
          </Link>
          <div className="hidden md:flex flex-1 justify-end gap-8 items-center">
            <div className="flex items-center gap-8">
              <a className="text-gray-300 hover:text-white text-sm font-medium transition-colors" href="#features">기능</a>
              <a className="text-gray-300 hover:text-white text-sm font-medium transition-colors" href="#stats">통계</a>
              <a className="text-gray-300 hover:text-white text-sm font-medium transition-colors" href="#reviews">후기</a>
            </div>
            <div className="flex gap-3">
              <Link href="/login" className="flex items-center justify-center overflow-hidden rounded-xl h-9 px-4 hover:bg-white/5 text-white text-sm font-bold transition-colors">
                <span className="truncate">로그인</span>
              </Link>
              <Link href="/signup" className="flex items-center justify-center overflow-hidden rounded-xl h-9 px-5 bg-[#00e677] hover:bg-[#00cc6a] text-[#0f2319] text-sm font-bold shadow-[0_0_15px_rgba(0,230,119,0.3)] transition-all">
                <span className="truncate">회원가입</span>
              </Link>
            </div>
          </div>
          <button className="md:hidden text-white">
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </nav>

      <main className="flex flex-col min-h-screen pt-16">
        <section className="relative w-full flex justify-center py-12 md:py-24 lg:py-32 overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-4xl bg-[radial-gradient(circle_at_center,_rgba(0,230,119,0.15)_0%,_rgba(15,35,25,0)_70%)] opacity-60 pointer-events-none z-0"></div>
          <div className="flex flex-col max-w-[1280px] w-full px-4 md:px-10 lg:px-40 z-10">
            <div className="flex flex-col gap-10 px-4 py-6 md:gap-12 lg:flex-row items-center">
              <div className="flex flex-col gap-6 min-w-0 md:min-w-[400px] md:gap-8 flex-1">
                <div className="flex flex-col gap-4 text-left">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00e677]/10 border border-[#00e677]/20 w-fit">
                    <span className="w-2 h-2 rounded-full bg-[#00e677] animate-pulse"></span>
                    <span className="text-[#00e677] text-xs font-bold uppercase tracking-wider">라이브 베타</span>
                  </div>
                  <h1 className="text-white text-4xl font-black leading-[1.1] tracking-[-0.033em] md:text-5xl lg:text-6xl break-keep">
                    당신의 아마추어 경기를 <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00e677] to-teal-400">한 단계 높이세요.</span>
                  </h1>
                  <h2 className="text-gray-400 text-lg font-normal leading-relaxed max-w-xl break-keep">
                    흩어진 아마추어 축구 기록을 체계적으로 관리하고, 데이터 기반으로 즐기는 축구 라이프
                  </h2>
                </div>
                <div className="flex flex-wrap gap-4">
                  <Link href="/signup" className="flex min-w-[140px] cursor-pointer items-center justify-center rounded-xl h-12 px-6 bg-[#00e677] hover:bg-[#00cc6a] text-[#0f2319] text-base font-bold shadow-[0_0_20px_rgba(0,230,119,0.4)] hover:shadow-[0_0_30px_rgba(0,230,119,0.6)] transition-all transform hover:-translate-y-0.5">
                    <span className="truncate">시즌 시작하기</span>
                  </Link>
                  <button className="flex min-w-[140px] cursor-pointer items-center justify-center rounded-xl h-12 px-6 bg-white/5 border border-white/10 hover:bg-white/10 text-white text-base font-bold backdrop-blur-sm transition-all">
                    <span className="flex items-center gap-2">
                      <PlayCircle className="w-5 h-5" />
                      <span className="truncate">데모 보기</span>
                    </span>
                  </button>
                </div>
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex -space-x-3">
                    <div className="w-10 h-10 rounded-full border-2 border-[#0f2319] bg-gray-700"></div>
                    <div className="w-10 h-10 rounded-full border-2 border-[#0f2319] bg-gray-600"></div>
                    <div className="w-10 h-10 rounded-full border-2 border-[#0f2319] bg-gray-500"></div>
                    <div className="w-10 h-10 rounded-full border-2 border-[#0f2319] bg-[#00e677] flex items-center justify-center text-[#0f2319] font-bold text-xs">+500</div>
                  </div>
                  <p className="text-gray-400 text-sm">개의 팀이 이미 함께하고 있습니다</p>
                </div>
              </div>
              <div className="w-full flex-1 mt-8 lg:mt-0 relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-[#00e677] to-teal-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-[#162e23]/60 backdrop-blur-xl border border-white/[0.08]">
                  <div className="absolute inset-0 bg-gray-800/50"></div>
                  <div className="absolute bottom-4 left-4 right-4 bg-[#0f2319]/90 backdrop-blur-md rounded-xl p-4 border border-white/10 shadow-2xl">
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                        <span className="text-xs font-bold text-gray-300 uppercase">실시간 경기</span>
                      </div>
                      <span className="text-xs text-[#00e677] font-mono">87:12</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="text-white font-bold text-lg">FC Rockets</div>
                      <div className="bg-black/50 px-3 py-1 rounded text-2xl font-mono text-white tracking-widest border border-white/5">2 - 1</div>
                      <div className="text-white font-bold text-lg text-right">United City</div>
                    </div>
                    <div className="mt-3 h-1 w-full bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full bg-[#00e677] w-[65%]"></div>
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-500 mt-1 uppercase">
                      <span>점유율</span>
                      <span>65%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="relative w-full bg-[#0f2319] py-16 md:py-24" id="features">
          <div className="flex flex-col items-center">
            <div className="max-w-[1280px] w-full px-4 md:px-10 lg:px-40">
              <div className="flex flex-col gap-10">
                <div className="flex flex-col gap-4 text-center items-center">
                  <h2 className="text-white text-3xl md:text-4xl font-black leading-tight tracking-tight">
                    모두를 위한 <span className="text-[#00e677]">프로급 분석 도구</span>
                  </h2>
                  <p className="text-gray-400 text-base md:text-lg font-normal leading-relaxed max-w-2xl break-keep">
                    최고의 클럽처럼 팀을 관리하는 데 필요한 모든 것을 세련된 인터페이스에 담았습니다.
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <FeatureCard
                    icon={<BarChart3 className="w-6 h-6" />}
                    title="경기 분석"
                    description="히트맵, 패스 네트워크 등 자동으로 생성되는 전문 시각화 자료를 통해 퍼포먼스 데이터를 심층 분석하세요."
                  />
                  <FeatureCard
                    icon={<Users className="w-6 h-6" />}
                    title="선수단 관리"
                    description="팀 로스터를 정리하고, 다가오는 경기 참석 여부를 확인하며, 포지션을 손쉽게 관리하세요."
                  />
                  <FeatureCard
                    icon={<Archive className="w-6 h-6" />}
                    title="히스토리 아카이브"
                    description="모든 경기 결과, 득점자, 어시스트를 영구적인 디지털 기록으로 남겨 논쟁을 종결하세요."
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="w-full py-10" id="stats">
          <div className="flex justify-center">
            <div className="max-w-[1280px] w-full px-4 md:px-10 lg:px-40">
              <div className="relative rounded-3xl overflow-hidden min-h-[400px] flex flex-col justify-end group">
                <div className="absolute inset-0 bg-gray-800 transition-transform duration-700 group-hover:scale-105"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-[#0f2319] via-[#0f2319]/50 to-transparent"></div>
                <div className="relative z-10 p-8 md:p-12 flex flex-col md:flex-row justify-between items-end gap-6">
                  <div className="max-w-xl">
                    <h2 className="text-white text-3xl md:text-4xl font-black mb-4">데이터로 즐기는 축구 라이프</h2>
                    <p className="text-gray-300 text-lg break-keep">
                      모든 태클, 패스, 골을 의미 있는 인사이트로 바꾸세요. 시즌의 성장을 전에 없던 방식으로 시각화하세요.
                    </p>
                  </div>
                  <button className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur border border-white/20 text-white font-bold transition-all">
                    <span>샘플 프로필 보기</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="relative w-full py-16 md:py-24 bg-[#0f2319]" id="reviews">
          <div className="flex justify-center">
            <div className="max-w-[1280px] w-full px-4 md:px-10 lg:px-40">
              <div className="flex flex-col gap-10">
                <div className="flex items-center justify-between">
                  <h2 className="text-white text-2xl md:text-3xl font-bold">매니저 피드백</h2>
                  <div className="flex gap-2">
                    <button className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/5 text-white transition-colors">
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/5 text-white transition-colors">
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <ReviewCard
                    name="알렉스 존슨"
                    role="조기축구회 매니저"
                    rating={5}
                    review="이 앱은 우리 팀 운영 방식을 완전히 바꿨습니다. 통계 기능은 정말 놀랍고, 팀원들도 자신의 데이터를 보는 것을 좋아해요."
                  />
                  <ReviewCard
                    name="사라 밀러"
                    role="리그 코디네이터"
                    rating={5}
                    review="디자인이 마음에 들고 선수 참석 여부 관리가 정말 편합니다. 더 이상 메신저로 선수들을 쫓아다닐 필요가 없어요."
                  />
                  <ReviewCard
                    name="데이비드 첸"
                    role="팀 주장"
                    rating={4}
                    review="드디어 우리 경기 기록을 전문적으로 관리할 방법이 생겼습니다. 히스토리 아카이브 기능은 딱 우리에게 필요한 것이었어요."
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="flex justify-center">
            <div className="max-w-[960px] w-full px-4 md:px-10 lg:px-40">
              <div className="bg-[#162e23]/60 backdrop-blur-xl border border-white/[0.08] rounded-3xl p-10 text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-[#00e677]/5"></div>
                <div className="relative z-10 flex flex-col items-center gap-6">
                  <h2 className="text-3xl md:text-5xl font-black text-white">킥오프 준비되셨나요?</h2>
                  <p className="text-gray-300 text-lg max-w-lg break-keep">오늘 바로 수천 명의 아마추어 선수들과 함께 수준 높은 경기를 시작하세요.</p>
                  <Link href="/signup" className="flex min-w-[180px] cursor-pointer items-center justify-center rounded-xl h-14 px-8 bg-[#00e677] hover:bg-[#00cc6a] text-[#0f2319] text-lg font-bold shadow-[0_0_25px_rgba(0,230,119,0.5)] transition-all">
                    무료 계정 만들기
                  </Link>
                  <p className="text-xs text-gray-500">기본 팀 생성에는 신용카드가 필요하지 않습니다.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <footer className="border-t border-white/10 bg-[#0f2319] pt-12 pb-8">
          <div className="flex flex-col max-w-[1280px] mx-auto px-4 md:px-10 lg:px-40">
            <div className="flex flex-col md:flex-row justify-between gap-10 mb-12">
              <div className="flex flex-col gap-4 max-w-xs">
                <div className="flex items-center gap-2 text-white">
                  <div className="size-6 text-[#00e677]">
                    <svg className="w-full h-full" fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                      <g clipPath="url(#clip0_footer)">
                        <path clipRule="evenodd" d="M47.2426 24L24 47.2426L0.757355 24L24 0.757355L47.2426 24ZM12.2426 21H35.7574L24 9.24264L12.2426 21Z" fill="currentColor" fillRule="evenodd"></path>
                      </g>
                      <defs>
                        <clipPath id="clip0_footer"><rect fill="white" height="48" width="48"></rect></clipPath>
                      </defs>
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold">Match Archive</h3>
                </div>
                <p className="text-gray-500 text-sm break-keep">전문 데이터 도구로 아마추어 축구를 혁신합니다. 당신만의 레거시를 만드세요.</p>
              </div>
              <div className="flex gap-16 flex-wrap">
                <div className="flex flex-col gap-4">
                  <h4 className="text-white font-bold text-sm uppercase tracking-wider">제품</h4>
                  <a className="text-gray-400 hover:text-[#00e677] text-sm transition-colors" href="#">기능</a>
                  <a className="text-gray-400 hover:text-[#00e677] text-sm transition-colors" href="#">가격</a>
                  <a className="text-gray-400 hover:text-[#00e677] text-sm transition-colors" href="#">연동</a>
                </div>
                <div className="flex flex-col gap-4">
                  <h4 className="text-white font-bold text-sm uppercase tracking-wider">회사</h4>
                  <a className="text-gray-400 hover:text-[#00e677] text-sm transition-colors" href="#">회사 소개</a>
                  <a className="text-gray-400 hover:text-[#00e677] text-sm transition-colors" href="#">채용</a>
                  <a className="text-gray-400 hover:text-[#00e677] text-sm transition-colors" href="#">블로그</a>
                </div>
                <div className="flex flex-col gap-4">
                  <h4 className="text-white font-bold text-sm uppercase tracking-wider">지원</h4>
                  <a className="text-gray-400 hover:text-[#00e677] text-sm transition-colors" href="#">고객센터</a>
                  <a className="text-gray-400 hover:text-[#00e677] text-sm transition-colors" href="#">이용약관</a>
                  <a className="text-gray-400 hover:text-[#00e677] text-sm transition-colors" href="#">개인정보처리방침</a>
                </div>
              </div>
            </div>
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-8 border-t border-white/5">
              <p className="text-gray-600 text-xs">© 2024 Match Archive Inc. All rights reserved.</p>
              <div className="flex gap-4">
                <a className="text-gray-500 hover:text-white transition-colors" href="#"><span className="sr-only">Twitter</span></a>
                <a className="text-gray-500 hover:text-white transition-colors" href="#"><span className="sr-only">Instagram</span></a>
                <a className="text-gray-500 hover:text-white transition-colors" href="#"><span className="sr-only">LinkedIn</span></a>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-[#162e23]/60 backdrop-blur-xl border border-white/[0.08] p-6 rounded-2xl flex flex-col gap-4 hover:border-[#00e677]/40 hover:shadow-[0_0_30px_rgba(0,230,119,0.1)] hover:-translate-y-0.5 transition-all duration-300 group">
      <div className="w-12 h-12 rounded-lg bg-[#00e677]/10 flex items-center justify-center text-[#00e677] group-hover:bg-[#00e677] group-hover:text-[#0f2319] transition-colors">
        {icon}
      </div>
      <div className="flex flex-col gap-2">
        <h3 className="text-white text-xl font-bold leading-tight">{title}</h3>
        <p className="text-gray-400 text-sm leading-relaxed break-keep">{description}</p>
      </div>
    </div>
  );
}

function ReviewCard({
  name,
  role,
  rating,
  review,
}: {
  name: string;
  role: string;
  rating: number;
  review: string;
}) {
  return (
    <div className="bg-[#162e23]/60 backdrop-blur-xl border border-white/[0.08] p-6 rounded-xl flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-gray-700 border-2 border-[#00e677]/30"></div>
        <div className="flex-1">
          <p className="text-white text-base font-bold">{name}</p>
          <p className="text-gray-500 text-xs">{role}</p>
        </div>
      </div>
      <div className="flex gap-0.5 text-[#00e677]">
        {[...Array(5)].map((_, i) => (
          <Star key={i} className={`w-5 h-5 ${i < rating ? "fill-current" : ""}`} />
        ))}
      </div>
      <p className="text-gray-300 text-sm leading-relaxed break-keep">{review}</p>
    </div>
  );
}
