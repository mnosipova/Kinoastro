(() => {
  const $ = s => document.querySelector(s);
  const screens = {
    start: $('#startScreen'), profile: $('#profileScreen'),
    candidates: $('#candidatesScreen'), reveal: $('#revealScreen'), result: $('#resultScreen')
  };
  const zodiac = [
    {name:'Козерог',symbol:'♑',element:'🌍 Земля',planet:'♄ Сатурн',from:[12,22],to:[1,19],prefs:['драма','детектив','история','биография'],text:'Ты ценишь истории с характером, смыслом и героями, которые проходят испытания.'},
    {name:'Водолей',symbol:'♒',element:'💨 Воздух',planet:'♅ Уран',from:[1,20],to:[2,18],prefs:['фантастика','комедия','приключения','фэнтези'],text:'Тебя тянет к необычным мирам, свежим идеям и историям, которые ломают шаблоны.'},
    {name:'Рыбы',symbol:'♓',element:'💧 Вода',planet:'♆ Нептун',from:[2,19],to:[3,20],prefs:['драма','мелодрама','фэнтези','романтика'],text:'Ты чувствуешь атмосферу и эмоции. Твои истории — те, которые остаются внутри надолго.'},
    {name:'Овен',symbol:'♈',element:'🔥 Огонь',planet:'♂ Марс',from:[3,21],to:[4,19],prefs:['боевик','приключения','триллер','фантастика'],text:'Тебе нужны скорость, риск и герои, которые не боятся идти напролом.'},
    {name:'Телец',symbol:'♉',element:'🌍 Земля',planet:'♀ Венера',from:[4,20],to:[5,20],prefs:['драма','романтика','комедия','биография'],text:'Ты выбираешь истории с красивой атмосферой, живыми чувствами и настоящими характерами.'},
    {name:'Близнецы',symbol:'♊',element:'💨 Воздух',planet:'☿ Меркурий',from:[5,21],to:[6,20],prefs:['комедия','детектив','фантастика','приключения'],text:'Тебе нравится, когда фильм удивляет, играет с идеями и не даёт заскучать.'},
    {name:'Рак',symbol:'♋',element:'💧 Вода',planet:'☾ Луна',from:[6,21],to:[7,22],prefs:['драма','семейный','романтика','история'],text:'Тебя цепляют отношения, память, дом и истории, где эмоции важнее эффектов.'},
    {name:'Лев',symbol:'♌',element:'🔥 Огонь',planet:'☀️ Солнце',from:[7,23],to:[8,22],prefs:['приключения','боевик','комедия','фэнтези'],text:'Ты любишь яркие истории, сильных героев и фильмы, после которых хочется обсудить финал.'},
    {name:'Дева',symbol:'♍',element:'🌍 Земля',planet:'☿ Меркурий',from:[8,23],to:[9,22],prefs:['детектив','драма','история','триллер'],text:'Ты замечаешь детали и ценишь хорошо собранные истории, где каждая деталь имеет значение.'},
    {name:'Весы',symbol:'♎',element:'💨 Воздух',planet:'♀ Венера',from:[9,23],to:[10,22],prefs:['романтика','комедия','драма','фэнтези'],text:'Для тебя важны стиль, химия между героями и чувство гармонии в истории.'},
    {name:'Скорпион',symbol:'♏',element:'💧 Вода',planet:'♇ Плутон',from:[10,23],to:[11,21],prefs:['триллер','детектив','драма','криминал'],text:'Тебя притягивают тайны, напряжение и персонажи со скрытой второй стороной.'},
    {name:'Стрелец',symbol:'♐',element:'🔥 Огонь',planet:'♃ Юпитер',from:[11,22],to:[12,21],prefs:['приключения','комедия','фантастика','боевик'],text:'Тебе нужны путешествия, масштаб и ощущение, что за следующим поворотом начинается новое приключение.'}
  ];

  let state = {profile:null, candidates:[], chosen:null, seed:0, date:''};

  function show(name){Object.values(screens).forEach(x=>x.classList.remove('active'));screens[name].classList.add('active');window.scrollTo({top:0,behavior:'smooth'});}
  function hash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0);}
  function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t^=t+Math.imul(t^t>>>7,61|t);return((t^t>>>14)>>>0)/4294967296}}
  function shuffle(arr,rand){let a=[...arr];for(let i=a.length-1;i>0;i--){let j=Math.floor(rand()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
  function zodiacFor(dateStr){
    const d=new Date(dateStr+'T12:00:00');
    const m=d.getMonth()+1, day=d.getDate();
    for(const z of zodiac){
      const [fm,fd]=z.from,[tm,td]=z.to;
      if((m===fm&&day>=fd)||(m===tm&&day<=td))return z;
    }
    return zodiac[0];
  }
  function tokenize(s){return s.toLowerCase().replace(/[^а-яa-zё0-9 ]/g,' ').split(/\s+/).filter(Boolean)}
  function genreMatch(movie, profile){
    const text=(movie.genre+' '+movie.description).toLowerCase();
    let score=0;
    profile.prefs.forEach((p,i)=>{if(text.includes(p))score+=3-i*.3});
    return score;
  }
  function movieScore(movie, profile, rand){
    const gm=genreMatch(movie,profile);
    const ratingNorm=Math.max(0,Math.min(1,(movie.rating-5)/4))*1.3;
    const textLen=Math.min(1,(movie.description||'').length/500)*.35;
    const jitter=rand()*.65;
    return gm+ratingNorm+textLen+jitter;
  }
  function buildCandidates(profile,dateStr){
    const rand=rng(hash(dateStr+'|kinoastro'));
    const pool=window.MOVIES.filter(m=>m.rating!==null);
    // Score a broad pool, then diversify by taking strong genre/score/era buckets.
    const scored=pool.map(m=>({...m,_score:movieScore(m,profile,rand)})).sort((a,b)=>b._score-a._score);
    const picked=[];
    const used=new Set();
    const buckets=[
      scored.filter(m=>genreMatch(m,profile)>0),
      scored.filter(m=>m.rating>=8.0),
      scored.filter(m=>Number.parseInt(m.year)||0 >= 2015),
      scored.filter(m=>m.description && m.description.length>180),
      scored
    ];
    for(const bucket of buckets){
      const choices=bucket.filter(m=>!used.has(m.title));
      if(choices.length){const m=choices[Math.floor(rand()*Math.min(choices.length,8))];picked.push(m);used.add(m.title);}
      if(picked.length===5)break;
    }
    for(const m of scored){if(picked.length===5)break;if(!used.has(m.title)){picked.push(m);used.add(m.title)}}
    return picked.slice(0,5).map((m,i)=>({...m,compat:compatibility(m,profile,i,dateStr)}));
  }
  function compatibility(movie,profile,i,dateStr){
    const rand=rng(hash(dateStr+'|compat|'+movie.title));
    const gm=genreMatch(movie,profile);
    const base=62+Math.min(23,gm*3.2)+Math.min(8,Math.max(0,movie.rating-7)*2)+rand()*7;
    return Math.round(Math.min(97,Math.max(64,base)));
  }
  function profileDescription(z){return z.text}
  function loadProfile(){
    const date=$('#birthDate').value;
    if(!date){$('#birthDate').focus();return}
    const d=new Date(date+'T12:00:00');
    if(Number.isNaN(d.getTime())||d>new Date()){alert('Пожалуйста, введи корректную дату рождения.');return}
    state.date=date;state.profile=zodiacFor(date);state.seed=hash(date);
    show('profile');
    const steps=['Анализируем дату рождения...','Определяем знак...','Сверяемся с созвездиями...','Ищем фильмы...'];
    let i=0;$('#profileCard').classList.add('hidden');
    const timer=setInterval(()=>{
      $('#loadingText').textContent=steps[i]||steps[3];i++;
      if(i>=steps.length){clearInterval(timer);setTimeout(revealProfile,350)}
    },650);
  }
  function revealProfile(){
    const p=state.profile;
    $('#loadingText').textContent='Космический профиль готов.';
    $('#zodiacSymbol').textContent=p.symbol;$('#zodiacName').textContent=p.name;
    $('#element').textContent=p.element;$('#planet').textContent=p.planet;$('#profileText').textContent=profileDescription(p);
    $('#profileCard').classList.remove('hidden');
  }
  function renderCandidates(){
    state.candidates=buildCandidates(state.profile,state.date);
    const grid=$('#candidateGrid');grid.innerHTML='';
    state.candidates.forEach((m,i)=>{
      const el=document.createElement('button');el.className='candidate';el.innerHTML=`<span class="star">✦</span><span class="label">КАНДИДАТ ${i+1}</span>`;
      el.addEventListener('click',()=>choose(i));grid.appendChild(el);
    });
    show('candidates');
  }
  function choose(i){
    if(state.chosen!==null)return;
    state.chosen=i;const els=[...document.querySelectorAll('.candidate')];
    els.forEach((e,idx)=>{if(idx===i)e.classList.add('selected');else e.classList.add('dim')});
    $('#candidateGrid').classList.add('locked');$('#selectionHint').textContent='Звёзды определяются...';
    setTimeout(()=>revealMovie(state.candidates[i]),1050);
  }
  function revealMovie(movie){
    const p=state.profile;
    $('#moviePoster').src=movie.image||'';$('#moviePoster').alt=movie.title;
    $('#movieTitle').textContent=movie.title;
    $('#movieMeta').textContent=`${movie.year||'Год неизвестен'} · ${movie.genre||'Фильм'}`;
    $('#movieRating').textContent=`⭐ ${movie.rating.toFixed(1)} на Кинопоиске`;
    $('#whyText').textContent=`${p.symbol} ${p.name}. Твоя стихия — ${p.element}. Тебе близки ${p.prefs.slice(0,2).join(' и ')}. ${movie.title} попал в твою космическую орбиту благодаря сочетанию жанровых совпадений, атмосферы и общего профиля. Это игровое предсказание — но кто знает, вдруг звёзды действительно что-то знают?`;
    show('reveal');
  }
  function renderResult(){
    const m=state.candidates[state.chosen],p=state.profile;
    $('#resultPoster').src=m.image||'';$('#resultPoster').alt=m.title;$('#resultMovie').textContent=m.title;
    $('#resultMeta').textContent=`${m.year||'—'} · ${m.genre||'Фильм'} · ⭐ ${m.rating.toFixed(1)}`;
    $('#resultZodiac').textContent=`${p.symbol} ${p.name}`;$('#resultElement').textContent=p.element;
    $('#compatPct').textContent=m.compat+'%';$('#compatText').textContent=m.compat>=90?'Звёзды сегодня явно на твоей стороне.':m.compat>=80?'Орбиты совпали очень удачно.':'Неожиданное притяжение — иногда именно оно работает лучше всего.';
    setTimeout(()=>$('#compatBar').style.width=m.compat+'%',120);
    $('#alternatives').innerHTML=state.candidates.filter((_,i)=>i!==state.chosen).map((x,idx)=>`<div class="alternative"><img src="${x.image||''}" alt=""><div><div class="a-title">${x.title}</div><div class="a-reason">Альтернатива №${idx+1} · ${x.compat}% совместимости</div></div><b>⭐ ${x.rating.toFixed(1)}</b></div>`).join('');
    show('result');
  }
  async function share(){
    const m=state.candidates[state.chosen],p=state.profile;
    const text=`✨ Моё Киноастро\n\n${p.symbol} ${p.name}\n🎬 ${m.title}\n⭐ ${m.rating.toFixed(1)}\n🌌 Совместимость: ${m.compat}%\n\nА какой фильм выбрали бы звёзды для тебя?`;
    if(navigator.share){try{await navigator.share({title:'Моё Киноастро',text})}catch(e){}}
    else if(navigator.clipboard){await navigator.clipboard.writeText(text);alert('Результат скопирован в буфер обмена.')}
    else alert(text);
  }

  $('#startBtn').addEventListener('click',loadProfile);
  $('#candidatesBtn').addEventListener('click',renderCandidates);
  $('#resultBtn').addEventListener('click',renderResult);
  $('#alternativesBtn').addEventListener('click',()=>{$('#alternatives').classList.toggle('hidden');$('#alternativesBtn').textContent=$('#alternatives').classList.contains('hidden')?'ПОКАЗАТЬ АЛЬТЕРНАТИВЫ':'СКРЫТЬ АЛЬТЕРНАТИВЫ'});
  $('#againBtn').addEventListener('click',()=>{state={profile:null,candidates:[],chosen:null,seed:0,date:''};$('#birthDate').value='';show('start')});
  $('#shareBtn').addEventListener('click',share);
})();