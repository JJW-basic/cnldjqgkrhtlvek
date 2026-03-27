// KNHANES 기반 80개 변수 설문 데이터
export interface SurveyQuestion {
  id: number;
  variable: string;
  question: string;
  type: "select" | "number";
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  unit?: string;
  placeholder?: string;
}

export interface SurveySection {
  title: string;
  icon: string;
  questions: SurveyQuestion[];
}

export const surveySections: SurveySection[] = [
  {
    title: "기본 변수",
    icon: "👤",
    questions: [
      {
        id: 1, variable: "sex", question: "성별을 선택해 주세요.",
        type: "select",
        options: [{ label: "남성", value: "0" }, { label: "여성", value: "1" }],
      },
      {
        id: 2, variable: "age", question: "만 나이를 입력해 주세요.",
        type: "number", unit: "세", min: 1, max: 120, placeholder: "예: 45",
      },
    ],
  },
  {
    title: "가구조사",
    icon: "🏠",
    questions: [
      {
        id: 3, variable: "cfam", question: "가구원 수를 입력해 주세요.",
        type: "number", unit: "명", min: 1, max: 20, placeholder: "예: 4",
      },
      {
        id: 4, variable: "genertn", question: "가구 세대구성을 선택해 주세요.",
        type: "select",
        options: [{ label: "1세대", value: "1" }, { label: "2세대", value: "4" }, { label: "3세대 이상", value: "7" }],
      },
      {
        id: 5, variable: "house", question: "주택 소유 여부를 선택해 주세요.",
        type: "select",
        options: [{ label: "아니다", value: "1" }, { label: "1채", value: "2" }, { label: "2채 이상", value: "3" }, { label: "모름", value: "4" }],
      },
      {
        id: 6, variable: "live_t", question: "주택 형태를 선택해 주세요.",
        type: "select",
        options: [{ label: "단독주택", value: "1" }, { label: "아파트", value: "2" }, { label: "연립/다세대주택", value: "3" }, { label: "기타", value: "4" }],
      },
      {
        id: 7, variable: "marri_1", question: "결혼한 적이 있습니까?",
        type: "select",
        options: [{ label: "예", value: "0" }, { label: "아니오", value: "1" }],
      },
      {
        id: 8, variable: "fam_rela", question: "가구주와의 관계를 선택해 주세요.",
        type: "select",
        options: [{ label: "가구주 본인", value: "1" }, { label: "배우자", value: "2" }, { label: "자녀", value: "3" }, { label: "부모", value: "6" }],
      },
      {
        id: 9, variable: "tins", question: "건강보험 종류를 선택해 주세요.",
        type: "select",
        options: [{ label: "지역가입자", value: "1" }, { label: "직장가입자", value: "2" }, { label: "의료급여", value: "3" }],
      },
      {
        id: 10, variable: "npins", question: "민간의료보험 가입 여부를 선택해 주세요.",
        type: "select",
        options: [{ label: "가입함", value: "0" }, { label: "가입하지 않음", value: "1" }],
      },
    ],
  },
  {
    title: "주관적 건강상태",
    icon: "🏥",
    questions: [
      {
        id: 11, variable: "D_1_1", question: "평소 본인의 건강 상태가 어떻다고 생각하십니까?",
        type: "select",
        options: [{ label: "매우 좋음", value: "1" }, { label: "좋음", value: "2" }, { label: "보통", value: "3" }, { label: "나쁨", value: "4" }, { label: "매우 나쁨", value: "5" }],
      },
      {
        id: 12, variable: "D_2_1", question: "2주 이상 연속으로 일상생활에 지장이 있을 정도로 슬프거나 절망감을 느낀 적이 있습니까?",
        type: "select",
        options: [{ label: "예", value: "0" }, { label: "아니오", value: "1" }],
      },
    ],
  },
  {
    title: "의료이용",
    icon: "🩺",
    questions: [
      {
        id: 13, variable: "M_2_yr", question: "최근 1년 동안 본인이 병의원(치과 제외)에 가고 싶을 때 가지 못한 적이 있습니까?",
        type: "select",
        options: [{ label: "예", value: "1" }, { label: "아니오", value: "0" }],
      },
    ],
  },
  {
    title: "예방접종 및 건강검진",
    icon: "💉",
    questions: [
      {
        id: 14, variable: "BH9_11", question: "최근 1년 동안 인플루엔자(독감) 예방접종을 받은 적이 있습니까?",
        type: "select",
        options: [{ label: "예", value: "1" }, { label: "아니오", value: "0" }],
      },
      {
        id: 15, variable: "BH1", question: "최근 2년 동안 건강검진을 받은 적이 있습니까?",
        type: "select",
        options: [{ label: "예", value: "1" }, { label: "아니오", value: "0" }],
      },
      {
        id: 16, variable: "BH2_61", question: "최근 2년 동안 암검진을 받은 적이 있습니까?",
        type: "select",
        options: [{ label: "예", value: "1" }, { label: "아니오", value: "0" }],
      },
    ],
  },
  {
    title: "활동제한 및 삶의 질",
    icon: "🌿",
    questions: [
      {
        id: 17, variable: "LQ4_00", question: "현재 건강상의 문제나 신체 혹은 정신적 장애로 일상생활 및 사회활동에 제한을 받고 있습니까?",
        type: "select",
        options: [{ label: "예", value: "1" }, { label: "아니오", value: "0" }],
      },
      {
        id: 18, variable: "LQ1_sb", question: "최근 1달 동안 아파서 누워있었던 적이 있습니까?",
        type: "select",
        options: [{ label: "예", value: "1" }, { label: "아니오", value: "0" }],
      },
      {
        id: 19, variable: "LQ2_ab", question: "최근 1달 동안 건강 문제로 결근(결석)한 적이 있습니까?",
        type: "select",
        options: [{ label: "예", value: "1" }, { label: "아니오", value: "0" }],
      },
    ],
  },
  {
    title: "손상",
    icon: "🛡️",
    questions: [
      {
        id: 20, variable: "AC1_yr", question: "최근 1년 동안 사고나 중독으로 병의원에 간 적이 있습니까?",
        type: "select",
        options: [{ label: "예", value: "1" }, { label: "아니오", value: "0" }],
      },
    ],
  },
  {
    title: "입원 및 외래이용",
    icon: "🏨",
    questions: [
      {
        id: 21, variable: "MH1_yr", question: "최근 1년 동안 입원한 적이 있습니까?",
        type: "select",
        options: [{ label: "예", value: "1" }, { label: "아니오", value: "0" }],
      },
      {
        id: 22, variable: "MO1_wk", question: "최근 2주 동안 병의원(치과, 한의원 포함)이나 보건소에 외래 진료를 받은 적이 있습니까?",
        type: "select",
        options: [{ label: "예", value: "1" }, { label: "아니오", value: "0" }],
      },
    ],
  },
  {
    title: "교육 및 경제활동",
    icon: "💼",
    questions: [
      {
        id: 23, variable: "educ", question: "최종 학력을 선택해 주세요.",
        type: "select",
        options: [{ label: "초졸 이하", value: "1" }, { label: "중졸", value: "2" }, { label: "고졸", value: "3" }, { label: "대졸 이상", value: "4" }],
      },
      {
        id: 24, variable: "EC1_1", question: "현재 경제활동 상태를 선택해 주세요.",
        type: "select",
        options: [{ label: "취업자", value: "1" }, { label: "실업자", value: "2" }, { label: "비경제활동인구", value: "3" }],
      },
      {
        id: 25, variable: "EC_lgw_2", question: "최장기간 근무한 일자리의 직업(표준직업분류)을 선택해 주세요.",
        type: "select",
        options: [
          { label: "관리자/전문가", value: "1" }, { label: "사무직", value: "2" }, { label: "서비스/판매직", value: "3" },
          { label: "농림어업", value: "4" }, { label: "기능/기계조작", value: "5" }, { label: "단순노무", value: "6" }, { label: "기타/해당없음", value: "7" },
        ],
      },
    ],
  },
  {
    title: "비만 및 체중조절",
    icon: "⚖️",
    questions: [
      {
        id: 26, variable: "BO1", question: "본인의 체형이 어떻다고 생각하십니까?",
        type: "select",
        options: [{ label: "매우 마른 편", value: "1" }, { label: "약간 마른 편", value: "2" }, { label: "보통", value: "3" }, { label: "약간 비만", value: "4" }, { label: "매우 비만", value: "5" }],
      },
      {
        id: 27, variable: "BO1_1", question: "최근 1년 동안 몸무게의 변화가 있었습니까?",
        type: "select",
        options: [{ label: "변화 없음", value: "1" }, { label: "체중 감소", value: "2" }, { label: "체중 증가", value: "3" }],
      },
      {
        id: 28, variable: "BO2_1", question: "최근 1년 동안 몸무게를 줄이려고 노력한 적이 있습니까?",
        type: "select",
        options: [{ label: "체중을 줄이려고 노력함", value: "1" }, { label: "체중을 유지하려고 노력함", value: "2" }, { label: "체중을 늘리려고 노력함", value: "3" }, { label: "노력해 본 적 없음", value: "4" }],
      },
    ],
  },
  {
    title: "음주",
    icon: "🍷",
    questions: [
      {
        id: 29, variable: "BD1_11", question: "최근 1년 동안 술을 얼마나 자주 마셨습니까?",
        type: "select",
        options: [
          { label: "최근 1년간 전혀 마시지 않았다", value: "0" }, { label: "월 1회 미만", value: "1" }, { label: "월 1회 정도", value: "2" },
          { label: "월 2~4회", value: "3" }, { label: "주 2~3회", value: "4" }, { label: "주 4회 이상", value: "5" },
        ],
      },
      {
        id: 30, variable: "BD2_1", question: "한 번에 술을 얼마나 마십니까? (소주 기준)",
        type: "select",
        options: [{ label: "1~2잔", value: "1" }, { label: "3~4잔", value: "2" }, { label: "5~6잔", value: "3" }, { label: "7~9잔", value: "4" }, { label: "10잔 이상", value: "5" }],
      },
      {
        id: 31, variable: "BD2_31", question: "한 번의 술자리에서 소주 5잔(또는 맥주 3캔) 이상을 마시는 빈도는 어떻게 됩니까?",
        type: "select",
        options: [{ label: "전혀 없음", value: "0" }, { label: "월 1회 미만", value: "1" }, { label: "월 1회 정도", value: "2" }, { label: "주 1회 정도", value: "3" }, { label: "거의 매일", value: "4" }],
      },
      {
        id: 32, variable: "BD7_4", question: "가족이나 의사가 술을 줄이도록 권유한 적이 있습니까?",
        type: "select",
        options: [{ label: "예", value: "1" }, { label: "아니오", value: "0" }],
      },
      {
        id: 33, variable: "BD7_5", question: "최근 1년 동안 음주 문제로 상담을 받은 적이 있습니까?",
        type: "select",
        options: [{ label: "예", value: "1" }, { label: "아니오", value: "0" }],
      },
    ],
  },
  {
    title: "안전의식",
    icon: "🚗",
    questions: [
      {
        id: 34, variable: "BA2_12", question: "자동차 운전 시 안전벨트를 착용하십니까?",
        type: "select",
        options: [{ label: "항상 착용", value: "1" }, { label: "대부분 착용", value: "2" }, { label: "가끔 착용", value: "3" }, { label: "착용 안 함", value: "4" }],
      },
      {
        id: 35, variable: "BA2_13", question: "자동차 앞좌석 탑승 시 안전벨트를 착용하십니까?",
        type: "select",
        options: [{ label: "항상 착용", value: "1" }, { label: "대부분 착용", value: "2" }, { label: "가끔 착용", value: "3" }, { label: "착용 안 함", value: "4" }],
      },
      {
        id: 36, variable: "BA2_14", question: "자동차 뒷좌석 탑승 시 안전벨트를 착용하십니까?",
        type: "select",
        options: [{ label: "항상 착용", value: "1" }, { label: "대부분 착용", value: "2" }, { label: "가끔 착용", value: "3" }, { label: "착용 안 함", value: "4" }],
      },
    ],
  },
  {
    title: "정신건강",
    icon: "🧠",
    questions: [
      {
        id: 37, variable: "BP1", question: "평소 일상생활 중에 스트레스를 어느 정도 느끼고 있습니까?",
        type: "select",
        options: [{ label: "대단히 많이 느낀다", value: "1" }, { label: "많이 느끼는 편이다", value: "2" }, { label: "조금 느끼는 편이다", value: "3" }, { label: "거의 느끼지 않는다", value: "4" }],
      },
      {
        id: 38, variable: "BP7", question: "최근 1년 동안 정신건강 문제로 상담을 받은 적이 있습니까?",
        type: "select",
        options: [{ label: "예", value: "1" }, { label: "아니오", value: "0" }],
      },
    ],
  },
  {
    title: "흡연",
    icon: "🚬",
    questions: [
      {
        id: 39, variable: "BS1_1", question: "지금까지 일반담배(궐련)를 피워 본 적이 있습니까?",
        type: "select",
        options: [{ label: "피운 적 없음", value: "1" }, { label: "과거에는 피웠으나 현재 피우지 않음", value: "2" }, { label: "현재 피우고 있음", value: "3" }],
      },
      {
        id: 40, variable: "BS12_37", question: "궐련형 전자담배를 사용해 본 적이 있습니까?",
        type: "select",
        options: [{ label: "사용한 적 없음", value: "0" }, { label: "과거 사용", value: "1" }, { label: "현재 사용", value: "2" }],
      },
      {
        id: 41, variable: "BS12_1", question: "액상형 전자담배를 사용해 본 적이 있습니까?",
        type: "select",
        options: [{ label: "사용한 적 없음", value: "0" }, { label: "과거 사용", value: "1" }, { label: "현재 사용", value: "2" }],
      },
      {
        id: 42, variable: "BS8_2", question: "직장 실내에서 다른 사람이 피우는 담배 연기를 맡은 적이 있습니까?",
        type: "select",
        options: [{ label: "예", value: "1" }, { label: "아니오", value: "0" }],
      },
      {
        id: 43, variable: "BS9_2", question: "가정 실내에서 다른 사람이 피우는 담배 연기를 맡은 적이 있습니까?",
        type: "select",
        options: [{ label: "예", value: "1" }, { label: "아니오", value: "0" }],
      },
      {
        id: 44, variable: "BS13", question: "공공장소 실내에서 다른 사람이 피우는 담배 연기를 맡은 적이 있습니까?",
        type: "select",
        options: [{ label: "예", value: "1" }, { label: "아니오", value: "0" }],
      },
    ],
  },
  {
    title: "신체활동",
    icon: "🏃",
    questions: [
      {
        id: 45, variable: "BE3_71", question: "최근 1주일 동안 평소보다 몸이 매우 힘든 고강도 신체활동을 한 날은 며칠입니까?",
        type: "select",
        options: [{ label: "안 함", value: "0" }, { label: "1일", value: "1" }, { label: "2일", value: "2" }, { label: "3일", value: "3" }, { label: "4일", value: "4" }, { label: "5일", value: "5" }, { label: "6일", value: "6" }, { label: "7일", value: "7" }],
      },
      {
        id: 46, variable: "BE3_81", question: "최근 1주일 동안 평소보다 몸이 조금 힘든 중강도 신체활동을 한 날은 며칠입니까?",
        type: "select",
        options: [{ label: "안 함", value: "0" }, { label: "1일", value: "1" }, { label: "2일", value: "2" }, { label: "3일", value: "3" }, { label: "4일", value: "4" }, { label: "5일", value: "5" }, { label: "6일", value: "6" }, { label: "7일", value: "7" }],
      },
      {
        id: 47, variable: "BE3_91", question: "최근 1주일 동안 장소를 이동할 때 10분 이상 걷거나 자전거를 이용한 날은 며칠입니까?",
        type: "select",
        options: [{ label: "안 함", value: "0" }, { label: "1일", value: "1" }, { label: "2일", value: "2" }, { label: "3일", value: "3" }, { label: "4일", value: "4" }, { label: "5일", value: "5" }, { label: "6일", value: "6" }, { label: "7일", value: "7" }],
      },
      {
        id: 48, variable: "BE3_75", question: "최근 1주일 동안 여가 시간에 고강도 신체활동을 한 날은 며칠입니까?",
        type: "select",
        options: [{ label: "안 함", value: "0" }, { label: "1일", value: "1" }, { label: "2일", value: "2" }, { label: "3일", value: "3" }, { label: "4일", value: "4" }, { label: "5일", value: "5" }, { label: "6일", value: "6" }, { label: "7일", value: "7" }],
      },
      {
        id: 49, variable: "BE3_85", question: "최근 1주일 동안 여가 시간에 중강도 신체활동을 한 날은 며칠입니까?",
        type: "select",
        options: [{ label: "안 함", value: "0" }, { label: "1일", value: "1" }, { label: "2일", value: "2" }, { label: "3일", value: "3" }, { label: "4일", value: "4" }, { label: "5일", value: "5" }, { label: "6일", value: "6" }, { label: "7일", value: "7" }],
      },
      {
        id: 50, variable: "BE8_1", question: "평소 하루에 앉아서 보내는 시간은 어느 정도입니까?",
        type: "number", unit: "시간", min: 0, max: 24, placeholder: "예: 8",
      },
      {
        id: 51, variable: "BE3_31", question: "최근 1주일 동안 10분 이상 걸은 날은 며칠입니까?",
        type: "select",
        options: [{ label: "안 함", value: "0" }, { label: "1일", value: "1" }, { label: "2일", value: "2" }, { label: "3일", value: "3" }, { label: "4일", value: "4" }, { label: "5일", value: "5" }, { label: "6일", value: "6" }, { label: "7일", value: "7" }],
      },
      {
        id: 52, variable: "BE5_1", question: "최근 1주일 동안 팔굽혀펴기, 윗몸일으키기, 아령, 역기, 철봉 등 근력운동을 한 날은 며칠입니까?",
        type: "select",
        options: [{ label: "안 함", value: "0" }, { label: "1일", value: "1" }, { label: "2일", value: "2" }, { label: "3일", value: "3" }, { label: "4일", value: "4" }, { label: "5일 이상", value: "5" }],
      },
    ],
  },
  {
    title: "검진조사",
    icon: "🔬",
    questions: [
      {
        id: 53, variable: "HE_fh", question: "부모, 형제, 자매 중 고혈압, 당뇨병, 심근경색/협심증, 뇌졸중을 의사에게 진단받은 사람이 있습니까?",
        type: "select",
        options: [{ label: "없음", value: "0" }, { label: "있음", value: "1" }],
      },
    ],
  },
  {
    title: "신체계측",
    icon: "📏",
    questions: [
      {
        id: 54, variable: "HE_ht", question: "키(신장)를 입력해 주세요.",
        type: "number", unit: "cm", min: 50, max: 250, placeholder: "예: 170.5",
      },
      {
        id: 55, variable: "HE_wt", question: "몸무게를 입력해 주세요.",
        type: "number", unit: "kg", min: 10, max: 300, placeholder: "예: 68.3",
      },
      {
        id: 56, variable: "HE_wc", question: "허리둘레를 입력해 주세요.",
        type: "number", unit: "cm", min: 30, max: 200, placeholder: "예: 82.0",
      },
    ],
  },
  {
    title: "구강건강",
    icon: "🦷",
    questions: [
      {
        id: 57, variable: "OR1", question: "본인의 구강건강이 어떻다고 생각하십니까?",
        type: "select",
        options: [{ label: "매우 좋음", value: "1" }, { label: "좋음", value: "2" }, { label: "보통", value: "3" }, { label: "나쁨", value: "4" }, { label: "매우 나쁨", value: "5" }],
      },
      {
        id: 58, variable: "O_pain", question: "최근 1년 동안 치통(치아가 쑤시거나 욱신거림)을 경험한 적이 있습니까?",
        type: "select",
        options: [{ label: "예", value: "1" }, { label: "아니오", value: "0" }],
      },
      {
        id: 59, variable: "O_ortho", question: "교정치료를 받은 경험이 있습니까?",
        type: "select",
        options: [{ label: "예", value: "1" }, { label: "아니오", value: "0" }],
      },
      {
        id: 60, variable: "BM1_0", question: "어제 하루 동안 칫솔질을 하셨습니까?",
        type: "select",
        options: [{ label: "예", value: "1" }, { label: "아니오", value: "0" }],
      },
      {
        id: 61, variable: "BM7", question: "치아나 틀니, 잇몸 등 입 안의 문제로 음식을 씹는 데 불편감을 느끼십니까?",
        type: "select",
        options: [{ label: "매우 불편", value: "1" }, { label: "불편", value: "2" }, { label: "보통", value: "3" }, { label: "불편하지 않음", value: "4" }, { label: "전혀 불편하지 않음", value: "5" }],
      },
      {
        id: 62, variable: "BM8", question: "치아나 틀니, 잇몸 등 입 안의 문제로 말하는 데 불편감을 느끼십니까?",
        type: "select",
        options: [{ label: "매우 불편", value: "1" }, { label: "불편", value: "2" }, { label: "보통", value: "3" }, { label: "불편하지 않음", value: "4" }, { label: "전혀 불편하지 않음", value: "5" }],
      },
      {
        id: 63, variable: "OR1_2", question: "최근 1년 동안 구강검진을 받은 적이 있습니까?",
        type: "select",
        options: [{ label: "예", value: "1" }, { label: "아니오", value: "0" }],
      },
      {
        id: 64, variable: "MO4_00", question: "최근 1년 동안 치과병의원을 이용한 적이 있습니까?",
        type: "select",
        options: [{ label: "예", value: "1" }, { label: "아니오", value: "0" }],
      },
      {
        id: 65, variable: "BM14", question: "최근 1년 동안 치과 진료가 필요하였으나 받지 못한 적이 있습니까?",
        type: "select",
        options: [{ label: "예", value: "1" }, { label: "아니오", value: "0" }],
      },
    ],
  },
  {
    title: "안검사",
    icon: "👁️",
    questions: [
      {
        id: 66, variable: "E_Q_EX", question: "안과 검사를 가장 최근에 받은 시기는 언제입니까?",
        type: "select",
        options: [{ label: "1년 이내", value: "1" }, { label: "1~2년 전", value: "2" }, { label: "2~3년 전", value: "3" }, { label: "3년 이상 전", value: "4" }, { label: "받은 적 없음", value: "5" }],
      },
    ],
  },
  {
    title: "식생활",
    icon: "🥗",
    questions: [
      {
        id: 67, variable: "L_BR_FQ", question: "최근 1년 동안 1주일 동안 아침식사를 몇 회 하셨습니까?",
        type: "select",
        options: [{ label: "거의 안 함(0회)", value: "0" }, { label: "주 1~2회", value: "1" }, { label: "주 3~4회", value: "3" }, { label: "주 5~6회", value: "5" }, { label: "매일(7회)", value: "7" }],
      },
      {
        id: 68, variable: "L_LN_FQ", question: "최근 1년 동안 1주일 동안 점심식사를 몇 회 하셨습니까?",
        type: "select",
        options: [{ label: "거의 안 함(0회)", value: "0" }, { label: "주 1~2회", value: "1" }, { label: "주 3~4회", value: "3" }, { label: "주 5~6회", value: "5" }, { label: "매일(7회)", value: "7" }],
      },
      {
        id: 69, variable: "L_DN_FQ", question: "최근 1년 동안 1주일 동안 저녁식사를 몇 회 하셨습니까?",
        type: "select",
        options: [{ label: "거의 안 함(0회)", value: "0" }, { label: "주 1~2회", value: "1" }, { label: "주 3~4회", value: "3" }, { label: "주 5~6회", value: "5" }, { label: "매일(7회)", value: "7" }],
      },
      {
        id: 70, variable: "L_OUT_FQ", question: "최근 1년 동안 평균 외식 빈도는 어떻게 됩니까?",
        type: "select",
        options: [{ label: "거의 안 함", value: "0" }, { label: "월 1~3회", value: "1" }, { label: "주 1~2회", value: "2" }, { label: "주 3~4회", value: "3" }, { label: "주 5~6회", value: "4" }, { label: "하루 1회 이상", value: "5" }],
      },
      {
        id: 71, variable: "LS_VEG1", question: "최근 1년 동안 채소류(김치 및 장아찌 포함), 버섯류, 해조류를 얼마나 자주 드셨습니까?",
        type: "select",
        options: [{ label: "하루 1회 미만", value: "1" }, { label: "하루 1회", value: "2" }, { label: "하루 2회", value: "3" }, { label: "하루 3회", value: "4" }, { label: "하루 4회 이상", value: "5" }],
      },
      {
        id: 72, variable: "LS_VEG2", question: "최근 1년 동안 채소류(김치 및 장아찌 제외), 버섯류, 해조류를 얼마나 자주 드셨습니까?",
        type: "select",
        options: [{ label: "하루 1회 미만", value: "1" }, { label: "하루 1회", value: "2" }, { label: "하루 2회", value: "3" }, { label: "하루 3회", value: "4" }, { label: "하루 4회 이상", value: "5" }],
      },
      {
        id: 73, variable: "LS_FRUIT", question: "최근 1년 동안 과일류를 얼마나 자주 드셨습니까?",
        type: "select",
        options: [{ label: "하루 1회 미만", value: "1" }, { label: "하루 1회", value: "2" }, { label: "하루 2회", value: "3" }, { label: "하루 3회 이상", value: "4" }],
      },
      {
        id: 74, variable: "LS_1YR", question: "최근 1년 동안 2주 이상 비타민이나 무기질 보충제(식이보충제)를 복용한 적이 있습니까?",
        type: "select",
        options: [{ label: "예", value: "1" }, { label: "아니오", value: "0" }],
      },
      {
        id: 75, variable: "LK_EDU", question: "최근 1년 동안 영양교육 및 상담을 받은 적이 있습니까?",
        type: "select",
        options: [{ label: "예", value: "1" }, { label: "아니오", value: "0" }],
      },
      {
        id: 76, variable: "LK_LB_CO", question: "가공식품을 사거나 고를 때 영양표시를 읽습니까?",
        type: "select",
        options: [{ label: "항상 읽는다", value: "1" }, { label: "가끔 읽는다", value: "2" }, { label: "읽지 않는다", value: "3" }],
      },
    ],
  },
  {
    title: "식품섭취",
    icon: "🍽️",
    questions: [
      {
        id: 77, variable: "N_DIET", question: "현재 식사요법(당뇨식, 저염식 등)을 하고 계십니까?",
        type: "select",
        options: [{ label: "예", value: "1" }, { label: "아니오", value: "0" }],
      },
      {
        id: 78, variable: "N_DUSUAL", question: "어제 드신 식사량은 평소와 비교하여 어떻습니까?",
        type: "select",
        options: [{ label: "평소보다 적게 먹었다", value: "1" }, { label: "평소와 비슷하게 먹었다", value: "2" }, { label: "평소보다 많이 먹었다", value: "3" }],
      },
      {
        id: 79, variable: "N_WAT_C", question: "어제 하루 동안 물을 몇 컵 드셨습니까?",
        type: "number", unit: "컵", min: 0, max: 30, placeholder: "예: 8",
      },
    ],
  },
  {
    title: "식품안전",
    icon: "🛒",
    questions: [
      {
        id: 80, variable: "LF_SAFE", question: "지난 1년 동안 귀하의 가구에서는 식생활 형편이 어떠하였습니까?",
        type: "select",
        options: [
          { label: "충분한 양과 다양한 종류의 음식을 먹을 수 있었다", value: "1" },
          { label: "충분한 양의 음식을 먹었으나 다양하지는 못했다", value: "2" },
          { label: "경제적으로 어려워 때때로 먹을 것이 부족했다", value: "3" },
          { label: "경제적으로 어려워 자주 먹을 것이 부족했다", value: "4" },
        ],
      },
    ],
  },
];

export const allVariableIds = surveySections.flatMap(s => s.questions.map(q => q.variable));

// 건강한 남성 더미 데이터
export const healthyMaleDummyData: Record<string, string> = {
  sex: "0", age: "35", cfam: "4", genertn: "4", house: "2", live_t: "2",
  marri_1: "0", fam_rela: "1", tins: "2", npins: "0",
  D_1_1: "2", D_2_1: "1",
  M_2_yr: "0",
  BH9_11: "1", BH1: "1", BH2_61: "0",
  LQ4_00: "0", LQ1_sb: "0", LQ2_ab: "0",
  AC1_yr: "0",
  MH1_yr: "0", MO1_wk: "0",
  educ: "4", EC1_1: "1", EC_lgw_2: "1",
  BO1: "3", BO1_1: "1", BO2_1: "2",
  BD1_11: "1", BD2_1: "1", BD2_31: "0", BD7_4: "0", BD7_5: "0",
  BA2_12: "1", BA2_13: "1", BA2_14: "1",
  BP1: "3", BP7: "0",
  BS1_1: "1", BS12_37: "0", BS12_1: "0", BS8_2: "0", BS9_2: "0", BS13: "0",
  BE3_71: "2", BE3_81: "3", BE3_91: "5", BE3_75: "2", BE3_85: "3",
  BE8_1: "6", BE3_31: "5", BE5_1: "3",
  HE_fh: "0",
  HE_ht: "175", HE_wt: "72", HE_wc: "80",
  OR1: "2", O_pain: "0", O_ortho: "0", BM1_0: "1", BM7: "4", BM8: "4", OR1_2: "1", MO4_00: "1", BM14: "0",
  E_Q_EX: "1",
  L_BR_FQ: "7", L_LN_FQ: "7", L_DN_FQ: "7", L_OUT_FQ: "2",
  LS_VEG1: "3", LS_VEG2: "3", LS_FRUIT: "2", LS_1YR: "1", LK_EDU: "0", LK_LB_CO: "2",
  N_DIET: "0", N_DUSUAL: "2", N_WAT_C: "8",
  LF_SAFE: "1",
};