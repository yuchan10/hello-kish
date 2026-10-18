// 인터뷰 순서. 사진을 제공하지 않은 구성원은 photo: null로 표시합니다.
const DEFAULT_PEOPLE = [
  {
    "id": "staff-tiep",
    "name": "Tiep",
    "category": "security",
    "role": "등하교 교통 지도, 방문객 등록·안내, 학생 안전 관리",
    "period": "2020년부터 · 7년 근무",
    "hours": "하루 12시간",
    "location": "학교 정문",
    "message": "하교할 때 정문 쪽이 위험하니 택시를 탈 때 조심해 주세요.",
    "photo": "#portrait-0",
    "seq": 1,
    "researcher": ""
  },
  {
    "id": "staff-uyen",
    "name": "uyen",
    "category": "library",
    "role": "사서 · 학생들의 도서관 이용 도움",
    "period": "2025년부터",
    "hours": "매일 오전 8시 ~ 오후 4시",
    "location": "도서관",
    "message": "아이들이 착해서 좋습니다.",
    "photo": null,
    "seq": 2,
    "researcher": ""
  },
  {
    "id": "staff-pham-huong",
    "name": "Pham huong",
    "category": "facility",
    "role": "시설관리",
    "period": "",
    "hours": "오전 8시 ~ 오후 4시",
    "location": "하노이한국국제학교 시설팀",
    "message": "공부 열심히 하고, 학교 시설도 소중히 다뤄 주세요.",
    "photo": "#portrait-1",
    "seq": 3,
    "researcher": ""
  },
  {
    "id": "staff-kim-yukyung",
    "name": "김유경",
    "category": "cafeteria",
    "role": "식단 구성, 매일 제공되는 음식 검수, 식자재 확인, 배식",
    "period": "",
    "hours": "오전 6시 ~ 오후 3시",
    "location": "급식실 1·2층",
    "message": "편식하지 말고, 고기뿐 아니라 채소도 골고루 먹어 주세요.",
    "photo": "#portrait-2",
    "seq": 4,
    "researcher": ""
  },
  {
    "id": "staff-tu-anh",
    "name": "Tú anh",
    "category": "cafeteria",
    "role": "급식실 베트남 직원 총괄",
    "period": "2022년부터",
    "hours": "",
    "location": "급식실",
    "message": "편식하지 말고 음식을 잘 먹으며 건강하게 지내 주세요.",
    "photo": "#portrait-3",
    "seq": 5,
    "researcher": ""
  },
  {
    "id": "staff-do-thi-thao",
    "name": "Do thi thao",
    "category": "cleaning",
    "role": "2층 청소, 화장실과 로비 청소",
    "period": "",
    "hours": "",
    "location": "2층 · 화장실 · 로비",
    "message": "착하고 공부 잘하는 학생이 되고, 학교를 깨끗하게 사용해 주세요.",
    "photo": "#portrait-4",
    "seq": 6,
    "researcher": ""
  },
  {
    "id": "staff-song-myeongheon",
    "name": "송명헌",
    "category": "shop",
    "role": "매점 음식 배달 및 서빙",
    "period": "",
    "hours": "매일 오전 8시 ~ 오후 4시",
    "location": "매점",
    "message": "KISH 화이팅!",
    "photo": "#portrait-5",
    "seq": 7,
    "researcher": ""
  }
];
