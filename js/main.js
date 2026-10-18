
  let databaseReady = false;
  let db, peopleCol, collection, doc, addDoc, updateDoc, deleteDoc,
      onSnapshot, query, orderBy, getDocs, writeBatch;
  async function connectDatabase(){
    const [appSDK, storeSDK] = await Promise.all([
      import("https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js")
    ]);
    ({ collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy, getDocs, writeBatch } = storeSDK);
    const firebaseConfig = {
    apiKey: "AIzaSyDa08MrbwXUqTlH5WkfykyR8rvRcxo-FBg",
    authDomain: "hellokish-bdd03.firebaseapp.com",
    projectId: "hellokish-bdd03",
    storageBucket: "hellokish-bdd03.firebasestorage.app",
    messagingSenderId: "566049154168",
    appId: "1:566049154168:web:501af82caa66856456f98d",
  };
    db = storeSDK.getFirestore(appSDK.initializeApp(firebaseConfig));
    peopleCol = collection(db, "people");
    try { await seedIfEmpty(); } catch (error) { console.error("Initial data setup failed", error); }
    subscribePeople();
  }

  // 이 잠금은 서버 없는 정적 페이지의 편집 권한 구분용 장치일 뿐, 실제 보안 기능은 아닙니다.
  // 요청에 따라 세션에 저장하지 않고 편집 모드를 켤 때마다 매번 비밀번호를 다시 입력받습니다.
  const ADMIN_PASSWORD = "3141592";

  const CATEGORIES = {
    library: { label: "도서관", color: "#b48426", soft: "#fff3d9" },
    cafeteria: { label: "급식실", color: "#d97539", soft: "#fdead9" },
    cleaning: { label: "환경미화", color: "#258b91", soft: "#e0f3f4" },
    shop: { label: "매점", color: "#c45f91", soft: "#fae7f0" },
    facility: { label: "시설관리", color: "#2f9e63", soft: "#e4f5eb" },
    office:   { label: "행정실",   color: "#3d6fd1", soft: "#e6edfb" },
    security: { label: "경비",     color: "#8258c9", soft: "#efe7fa" },
  };


  const CREDITS = [
    { name:"김현준", studentId:"10109", roleTag:"정보 조사" },
    { name:"심인성", studentId:"10116", roleTag:"정보 조사" },
    { name:"오시우", studentId:"10319", roleTag:"정보 조사" },
    { name:"이승찬", studentId:"10324", roleTag:"정보 조사" },
    { name:"김홍래", studentId:"10509", roleTag:"정보 조사" },
    { name:"양승현", studentId:"10520", roleTag:"앱 개발" },
    { name:"이다호", studentId:"10523", roleTag:"정보 조사" },
    { name:"최유찬", studentId:"10530", roleTag:"앱 개발" },
    { name:"배윤호", studentId:"10612", roleTag:"앱 개발" },
    { name:"이지호", studentId:"10626", roleTag:"정보 조사" },
  ];

  let PEOPLE = DEFAULT_PEOPLE.map(p => ({ ...p }));
  let activeFilter = "all";
  let searchTerm = "";
  let isAdmin = false;
  let editingId = null; // null = 새로 작성, 문자열 = 수정 중인 Firestore 문서 id
  let currentPhotoDataUrl = null; // 폼에서 선택/제거 중인 사진 (base64 data URL 또는 null)

  // 기존 예시 인물만 교체하고 사용자가 등록한 문서는 보존합니다.
  async function seedIfEmpty(){
    const snap = await getDocs(peopleCol);
    if(snap.docs.some(d => DEFAULT_PEOPLE.some(p => p.id === d.id))) return;
    const demoNames = ["홍길동", "김미영", "박정수", "이수진", "최영호", "장은희", "윤태식", "한서연", "오민석", "신하늘"];
    const batch = writeBatch(db);
    snap.docs.forEach(d => {
      const index = Number(d.id.slice(1)) - 1;
      if(/^p\d+$/.test(d.id) && d.data().name === demoNames[index]) batch.delete(d.ref);
    });
    DEFAULT_PEOPLE.forEach(({id, ...data}) => batch.set(doc(peopleCol, id), data));
    await batch.commit();
  }

  function subscribePeople(){
    const q = query(peopleCol, orderBy("seq"));
    onSnapshot(q, (snap)=>{
      PEOPLE = snap.docs.map(d => ({ ...d.data(), id: d.id }));
      databaseReady = true;
      renderWeekly();
      renderGrid();
    }, (err)=>{
      databaseReady = false;
      console.error("subscribe failed", err);
      showToast("데이터를 불러오지 못했습니다.");
    });
  }

  function escapeHTML(value){
    return String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"}[ch]));
  }

  function safePhotoURL(value){
    const url = String(value || "");
    return /^(https:\/\/|data:image\/(?:jpeg|png|webp);base64,)/i.test(url) ? url : "";
  }

  function initials(name){ return escapeHTML(String(name||"").slice(-2) || "?"); }

  function avatarInner(p){
    if(/^#portrait-[0-5]$/.test(p.photo || "")){
      return `<span class="staff-portrait portrait-${p.photo.slice(-1)}" role="img" aria-label="구성원 사진"></span>`;
    }
    const photo = safePhotoURL(p.photo);
    return photo
      ? `<img src="${escapeHTML(photo)}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
      : initials(p.name);
  }

  // 원본 사진 파일을 그대로 Firestore에 넣기엔 너무 크므로(문서당 256KB 제한),
  // 한 변이 480px을 넘지 않게 축소하고 JPEG로 압축한 뒤 data URL로 반환한다.
  function compressImageFile(file){
    return new Promise((resolve, reject)=>{
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error);
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error("이미지를 읽지 못했습니다."));
        img.onload = () => {
          const maxDim = 480;
          let { width, height } = img;
          if(width > maxDim || height > maxDim){
            if(width > height){ height = Math.round(height * maxDim / width); width = maxDim; }
            else{ width = Math.round(width * maxDim / height); height = maxDim; }
          }
          const canvas = document.createElement("canvas");
          canvas.width = width; canvas.height = height;
          canvas.getContext("2d").drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.72));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function isoWeekNumber(date){
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  }

  function getWeeklyPerson(){
    if(PEOPLE.length === 0) return null;
    const week = isoWeekNumber(new Date());
    return PEOPLE[week % PEOPLE.length];
  }

  function showToast(msg){
    const t = document.getElementById("toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(()=> t.classList.remove("show"), 1800);
  }

  // ---------------- 렌더링 ----------------
  function renderWeekly(){
    const p = getWeeklyPerson();
    const el = document.getElementById("weeklyCard");
    if(!p){ el.innerHTML = `<div class="empty-msg">아직 등록된 구성원이 없어요.</div>`; return; }
    const cat = CATEGORIES[p.category] || {label:"기타", color:"#8a8577", soft:"#f3f0e9"};
    el.innerHTML = `
      <div class="avatar" style="background:${cat.color}">${avatarInner(p)}</div>
      <div class="info">
        <span class="badge">이번 주 인사 대상</span>
        <h3>${escapeHTML(p.name)} 선생님</h3>
        <div class="role">${cat.label} · ${escapeHTML(p.role)} · ${escapeHTML(p.location)}</div>
        <div class="quote">${escapeHTML(p.message)}</div>
      </div>
    `;
  }

  function renderFilters(){
    const bar = document.getElementById("filterBar");
    const all = [{ key:"all", label:"전체" }, ...Object.entries(CATEGORIES).map(([key,v])=>({key,label:v.label}))];
    bar.innerHTML = all.map(f =>
      `<button class="filter-btn ${activeFilter===f.key?'active':''}" data-key="${f.key}">${f.label}</button>`
    ).join("");
    bar.querySelectorAll(".filter-btn").forEach(btn=>{
      btn.addEventListener("click", ()=>{ activeFilter = btn.dataset.key; renderFilters(); renderGrid(); });
    });
  }

  function renderGrid(){
    const grid = document.getElementById("peopleGrid");
    const filtered = PEOPLE.filter(p=>{
      const matchCat = activeFilter === "all" || p.category === activeFilter;
      const matchSearch = String(p.name || "").toLocaleLowerCase().includes(searchTerm.trim().toLocaleLowerCase());
      return matchCat && matchSearch;
    });

    if(filtered.length === 0){
      grid.innerHTML = `<div class="empty-msg">검색 결과가 없어요.</div>`;
      return;
    }

    grid.innerHTML = filtered.map(p=>{
      const cat = CATEGORIES[p.category] || {label:"기타", color:"#8a8577", soft:"#f3f0e9"};
      return `
        <button class="person-card" data-id="${escapeHTML(p.id)}">
          <div class="avatar" style="background:${cat.color}">${avatarInner(p)}</div>
          <span class="cat-tag" style="color:${cat.color};background:${cat.soft}">${cat.label}</span>
          <h4>${escapeHTML(p.name)}</h4>
          <div class="role">${escapeHTML(p.role)}</div>
          <div class="loc">📍 ${escapeHTML(p.location)}</div>
        </button>
      `;
    }).join("");

    grid.querySelectorAll(".person-card").forEach(card=>{
      card.addEventListener("click", ()=> openDetail(card.dataset.id));
    });
  }

  function renderCredits(){
    const list = document.getElementById("creditsList");
    list.innerHTML = CREDITS.map(c=>`
      <div class="credit-card">
        <div class="avatar" style="background:${['#e8863a','#3d6fd1','#2f9e63'][CREDITS.indexOf(c)%3]}">${initials(c.name)}</div>
        <div class="info">
          <h4>${c.name}</h4>
          <div class="sub">학번 ${c.studentId}</div>
          <span class="credit-tag">${c.roleTag}</span>
        </div>
      </div>
    `).join("");
  }

  function renderAdminUI(){
    const btn = document.getElementById("adminToggleBtn");
    const fab = document.getElementById("fabAdd");
    btn.textContent = isAdmin ? "🔓" : "🔒";
    btn.classList.toggle("unlocked", isAdmin);
    fab.classList.toggle("show", isAdmin);
  }

  // ---------------- 상세보기 모달 ----------------
  function openDetail(id){
    const p = PEOPLE.find(x=>x.id===id);
    if(!p) return;
    const cat = CATEGORIES[p.category] || {label:"기타", color:"#8a8577", soft:"#f3f0e9"};
    const modal = document.getElementById("modalContent");
    modal.innerHTML = `
      <button class="close-btn" id="closeModalBtn">✕</button>
      <div class="avatar-lg" style="background:${cat.color}">${avatarInner(p)}</div>
      <span class="cat-tag" style="color:${cat.color};background:${cat.soft}">${cat.label}</span>
      <h3>${escapeHTML(p.name)} 선생님</h3>
      <div class="role">${escapeHTML(p.role)}</div>
      <div class="detail-row"><span class="label">근무 기간</span><span>${escapeHTML(p.period || "미제공")}</span></div>
      <div class="detail-row"><span class="label">근무 시간</span><span>${escapeHTML(p.hours || "미제공")}</span></div>
      <div class="detail-row"><span class="label">근무 장소</span><span>${escapeHTML(p.location)}</span></div>
      ${p.researcher ? `<div class="detail-row"><span class="label">조사 학생</span><span>${escapeHTML(p.researcher)}</span></div>` : ""}
      <div class="quote-box">${escapeHTML(p.message)}</div>
      ${isAdmin ? `
        <div class="modal-actions">
          <button class="btn-edit" id="editBtn">✏️ 수정</button>
          <button class="btn-delete" id="deleteBtn">🗑 삭제</button>
        </div>
      ` : ``}
    `;
    document.getElementById("modalOverlay").classList.add("open");
    document.getElementById("closeModalBtn").addEventListener("click", closeDetail);
    if(isAdmin){
      document.getElementById("editBtn").addEventListener("click", ()=>{ closeDetail(); openForm(id); });
      document.getElementById("deleteBtn").addEventListener("click", async ()=>{
        if(!isAdmin || !databaseReady){ showToast("서버 연결과 편집 모드를 확인해 주세요."); return; }
        if(confirm(`${p.name} 선생님 소개를 삭제할까요?`)){
          try{
            await deleteDoc(doc(peopleCol, id));
            closeDetail();
            showToast("삭제되었습니다.");
          }catch(e){
            console.error(e);
            showToast("삭제에 실패했습니다. 다시 시도해주세요.");
          }
        }
      });
    }
  }
  function closeDetail(){ document.getElementById("modalOverlay").classList.remove("open"); }

  // ---------------- 작성/수정 폼 모달 ----------------
  function openForm(id){
    if(!isAdmin) return;
    editingId = id || null;
    const p = editingId ? PEOPLE.find(x=>x.id===editingId) : null;
    currentPhotoDataUrl = p?.photo || null;
    const content = document.getElementById("formContent");
    content.innerHTML = `
      <button class="close-btn" id="closeFormBtn">✕</button>
      <p class="form-title">${p ? "소개 글 수정" : "새 소개 글 작성"}</p>
      <p class="form-sub">${p ? escapeHTML(p.name) + " 선생님의 정보를 수정합니다." : "학교 구성원 정보를 입력해주세요."}</p>
      <div class="field"><label>사진 (선택)</label>
        <div class="photo-field">
          <div class="photo-preview" id="photoPreview">${currentPhotoDataUrl ? avatarInner({photo:currentPhotoDataUrl}) : `<span>사진 없음</span>`}</div>
          <div class="photo-actions">
            <label class="photo-btn" for="f_photo_input">사진 선택</label>
            <input type="file" id="f_photo_input" accept="image/*" style="display:none" />
            <button type="button" class="photo-btn remove" id="photoRemoveBtn">사진 제거</button>
          </div>
        </div>
      </div>
      <div class="field"><label>이름</label><input id="f_name" type="text" value="${escapeHTML(p?.name||'')}" placeholder="예: 홍길동" /></div>
      <div class="field"><label>구분</label>
        <select id="f_category">
          ${Object.entries(CATEGORIES).map(([k,v])=>`<option value="${k}" ${p?.category===k?'selected':''}>${v.label}</option>`).join("")}
        </select>
      </div>
      <div class="field"><label>직책</label><input id="f_role" type="text" value="${escapeHTML(p?.role||'')}" placeholder="예: 시설관리 주무관" /></div>
      <div class="field"><label>근무 기간</label><input id="f_period" type="text" value="${escapeHTML(p?.period||'')}" placeholder="예: 2015년 ~ 현재" /></div>
      <div class="field"><label>근무 시간</label><input id="f_hours" type="text" value="${escapeHTML(p?.hours||'')}" placeholder="예: 오전 8시 ~ 오후 4시" /></div>
      <div class="field"><label>주로 근무하는 곳</label><input id="f_location" type="text" value="${escapeHTML(p?.location||'')}" placeholder="예: 본관 1층 행정실" /></div>
      <div class="field"><label>학생들에게 하고 싶은 말</label><textarea id="f_message" placeholder="따뜻한 한마디를 적어주세요">${escapeHTML(p?.message||'')}</textarea></div>
      <div class="field"><label>조사한 학생</label><input id="f_researcher" type="text" value="${escapeHTML(p?.researcher||'')}" placeholder="예: 김OO" /></div>
      <button class="form-submit" id="formSaveBtn">${p ? "수정 완료" : "작성 완료"}</button>
    `;
    document.getElementById("formOverlay").classList.add("open");
    document.getElementById("closeFormBtn").addEventListener("click", closeForm);
    document.getElementById("formSaveBtn").addEventListener("click", saveForm);

    const photoPreview = document.getElementById("photoPreview");
    const photoInput = document.getElementById("f_photo_input");
    photoInput.addEventListener("change", async ()=>{
      const file = photoInput.files[0];
      if(!file) return;
      try{
        currentPhotoDataUrl = await compressImageFile(file);
        photoPreview.innerHTML = `<img src="${currentPhotoDataUrl}">`;
      }catch(e){
        console.error(e);
        showToast("사진을 불러오지 못했습니다.");
      }
    });
    document.getElementById("photoRemoveBtn").addEventListener("click", ()=>{
      currentPhotoDataUrl = null;
      photoInput.value = "";
      photoPreview.innerHTML = `<span>사진 없음</span>`;
    });
  }
  function closeForm(){
    document.getElementById("formOverlay").classList.remove("open");
    editingId = null;
    currentPhotoDataUrl = null;
  }

  async function saveForm(){
    if(!isAdmin) return;
    if(!databaseReady){ showToast("서버 연결이 완료된 후 저장해 주세요."); return; }
    const name = document.getElementById("f_name").value.trim();
    if(!name){ showToast("이름을 입력해주세요."); return; }
    const data = {
      name,
      category: document.getElementById("f_category").value,
      role: document.getElementById("f_role").value.trim(),
      period: document.getElementById("f_period").value.trim(),
      hours: document.getElementById("f_hours").value.trim(),
      location: document.getElementById("f_location").value.trim(),
      message: document.getElementById("f_message").value.trim(),
      researcher: document.getElementById("f_researcher").value.trim(),
      photo: currentPhotoDataUrl || null,
    };
    const saveBtn = document.getElementById("formSaveBtn");
    saveBtn.disabled = true;
    try{
      if(editingId){
        await updateDoc(doc(peopleCol, editingId), data);
        showToast("수정되었습니다.");
      }else{
        const maxSeq = PEOPLE.reduce((max,p)=>Math.max(max, p.seq||0), 0);
        await addDoc(peopleCol, { ...data, seq: maxSeq + 1 });
        showToast("새 소개 글이 등록되었습니다.");
      }
      closeForm();
    }catch(e){
      console.error(e);
      showToast("저장에 실패했습니다. 다시 시도해주세요.");
      saveBtn.disabled = false;
    }
  }

  // ---------------- 비밀번호 모달 ----------------
  function openPasswordModal(){
    const overlay = document.getElementById("pwOverlay");
    document.getElementById("pwInput").value = "";
    document.getElementById("pwError").classList.remove("show");
    overlay.classList.add("open");
    setTimeout(()=> document.getElementById("pwInput").focus(), 100);
  }
  function closePasswordModal(){ document.getElementById("pwOverlay").classList.remove("open"); }

  function submitPassword(){
    const val = document.getElementById("pwInput").value.trim();
    if(val === ADMIN_PASSWORD){
      isAdmin = true;
      renderAdminUI();
      renderGrid();
      closePasswordModal();
      showToast("편집 모드가 켜졌습니다.");
    }else{
      document.getElementById("pwError").classList.add("show");
    }
  }

  // ---------------- 이벤트 바인딩 ----------------
  // 편집 모드는 세션에 저장하지 않으므로, 껐다가 다시 켤 때마다 비밀번호를 새로 입력해야 합니다.
  document.getElementById("adminToggleBtn").addEventListener("click", ()=>{
    if(isAdmin){
      isAdmin = false;
      renderAdminUI();
      renderGrid();
      showToast("편집 모드가 꺼졌습니다.");
    }else{
      openPasswordModal();
    }
  });
  document.getElementById("closePwBtn").addEventListener("click", closePasswordModal);
  document.getElementById("pwSubmitBtn").addEventListener("click", submitPassword);
  document.getElementById("pwInput").addEventListener("keydown", (e)=>{ if(e.key==="Enter") submitPassword(); });

  document.getElementById("fabAdd").addEventListener("click", ()=> openForm(null));

  document.getElementById("modalOverlay").addEventListener("click", (e)=>{ if(e.target.id==="modalOverlay") closeDetail(); });
  document.getElementById("formOverlay").addEventListener("click", (e)=>{ if(e.target.id==="formOverlay") closeForm(); });
  document.getElementById("pwOverlay").addEventListener("click", (e)=>{ if(e.target.id==="pwOverlay") closePasswordModal(); });

  document.getElementById("searchInput").addEventListener("input", (e)=>{ searchTerm = e.target.value; renderGrid(); });

  document.querySelectorAll(".nav-btn").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      document.querySelectorAll(".nav-btn").forEach(b=>b.classList.remove("active"));
      btn.classList.add("active");
      document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));
      document.getElementById("page-" + btn.dataset.page).classList.add("active");
      document.getElementById("fabAdd").style.display = (btn.dataset.page === "home") ? "" : "none";
      if(isAdmin && btn.dataset.page === "home") document.getElementById("fabAdd").classList.add("show");
    });
  });

  // ---------------- 초기 렌더 ----------------
  renderFilters();
  renderCredits();
  renderAdminUI();
  renderWeekly();
  renderGrid();
  connectDatabase().catch(err => {
    console.error("Database connection failed", err);
    showToast("저장된 소개를 표시합니다. 온라인 저장 연결을 확인해 주세요.");
  });
