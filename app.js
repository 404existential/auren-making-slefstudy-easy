const {createClient}=window.supabase;
const sb=createClient(window.AUREN_SUPABASE_URL,window.AUREN_SUPABASE_KEY);
const $=s=>document.querySelector(s), $$=s=>document.querySelectorAll(s);
const overlay=$('#authOverlay'), authContent=$('#authContent');
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2800)}
function openAuth(mode='login'){overlay.classList.remove('hidden');renderAuth(mode)}
function closeAuth(){overlay.classList.add('hidden')}
function renderAuth(mode){
 const login=mode==='login';
 authContent.innerHTML=`<span class="eyebrow">AUREN</span><h2>${login?'welcome back.':'build your system.'}</h2><p>${login?'continue where you left off.':'start with an email. your academic system grows around you.'}</p>
 <form class="auth-form" id="authForm"><input id="authEmail" type="email" autocomplete="email" placeholder="email address" required>${login?'<input id="authPassword" type="password" autocomplete="current-password" placeholder="password" required>':'<input id="authPassword" type="password" autocomplete="new-password" minlength="8" placeholder="password · 8+ characters" required>'}<button class="pill-btn dark" type="submit">${login?'log in ↗':'create account ↗'}</button></form>
 <div class="auth-switch">${login?'new here?':'already have an account?'} <button type="button" id="switchAuth">${login?'create account':'log in'}</button></div>
 <div class="auth-switch"><button type="button" id="otpMode">${login?'use a one-time email code instead':'use email code instead'}</button></div>`;
 $('#authForm').addEventListener('submit',login?passwordLogin:passwordSignup);$('#switchAuth').onclick=()=>renderAuth(login?'signup':'login');$('#otpMode').onclick=()=>renderOtp(login?'otp-login':'otp-signup');
}
function renderOtp(){
 authContent.innerHTML=`<span class="eyebrow">EMAIL CODE</span><h2>no password<br>needed.</h2><p>we'll send a one-time code to your email. enter it here to continue.</p><form class="auth-form" id="otpForm"><input id="otpEmail" type="email" autocomplete="email" placeholder="email address" required><button class="pill-btn dark" type="submit">send code ↗</button></form><div class="auth-switch"><button type="button" id="backPassword">use password instead</button></div><div class="code-note">email-code login requires email delivery to be enabled in the connected Supabase project.</div>`;
 $('#otpForm').addEventListener('submit',sendOtp);$('#backPassword').onclick=()=>renderAuth('login');
}
async function passwordSignup(e){e.preventDefault();const email=$('#authEmail').value.trim(),password=$('#authPassword').value;const {data,error}=await sb.auth.signUp({email,password});if(error){toast(error.message);return}if(data.user){await sb.from('profiles').upsert({id:data.user.id,full_name:email.split('@')[0]},{onConflict:'id'});toast(data.session?'account created':'check your email to verify your account');if(data.session){closeAuth();showApp(data.session.user)}}}
async function passwordLogin(e){e.preventDefault();const email=$('#authEmail').value.trim(),password=$('#authPassword').value;const {data,error}=await sb.auth.signInWithPassword({email,password});if(error){toast(error.message);return}closeAuth();showApp(data.user)}
async function sendOtp(e){e.preventDefault();const email=$('#otpEmail').value.trim();const {error}=await sb.auth.signInWithOtp({email,options:{emailRedirectTo:window.location.href}});if(error){toast(error.message);return}authContent.innerHTML=`<span class="eyebrow">CHECK YOUR EMAIL</span><h2>enter the<br>six-digit code.</h2><p>we sent a one-time code to <b>${email}</b>.</p><form class="auth-form" id="verifyForm"><input id="otpCode" inputmode="numeric" maxlength="6" placeholder="123456" required><button class="pill-btn dark" type="submit">verify ↗</button></form><div class="auth-switch"><button type="button" id="backOtp">use another email</button></div>`;$('#verifyForm').addEventListener('submit',async ev=>{ev.preventDefault();const token=$('#otpCode').value.trim();const {data,error}=await sb.auth.verifyOtp({email,token,type:'email'});if(error){toast(error.message);return}closeAuth();showApp(data.user)});$('#backOtp').onclick=()=>renderOtp();}
async function logout(){await sb.auth.signOut();showPublic();toast('logged out')}
function showPublic(){$('#publicView').classList.remove('hidden');$('#appView').classList.add('hidden');}
async function showApp(user){$('#publicView').classList.add('hidden');$('#appView').classList.remove('hidden');$('#userEmail').textContent=user.email||'';const {data}=await sb.from('profiles').select('*').eq('id',user.id).maybeSingle();const name=data?.full_name||user.email?.split('@')[0]||'student';$('#welcomeName').textContent=`good morning, ${name.split(' ')[0]}.`;$('#goalLine').textContent=data?.primary_goal?`${data.primary_goal} · your next move is ready.`:'your next move is ready.';$('#todayDate').textContent=new Intl.DateTimeFormat('en-IN',{weekday:'long',month:'short',day:'numeric'}).format(new Date());}
$('#logoutBtn').onclick=logout;$('#authClose').onclick=closeAuth;overlay.addEventListener('click',e=>{if(e.target===overlay)closeAuth()});$$('[data-auth]').forEach(b=>b.addEventListener('click',()=>openAuth(b.dataset.auth)));$('#tutorBtn')?.addEventListener('click',()=>openAuth('login'));
sb.auth.onAuthStateChange((_event,session)=>{if(session)showApp(session.user);else showPublic()});
sb.auth.getSession().then(({data:{session}})=>session?showApp(session.user):showPublic());

// Ambient live effect: subtle generative particles / academic signal, not a distracting background.
const canvas=$('#ambient'),ctx=canvas.getContext('2d');let particles=[];
function resize(){canvas.width=innerWidth*devicePixelRatio;canvas.height=innerHeight*devicePixelRatio;canvas.style.width=innerWidth+'px';canvas.style.height=innerHeight+'px';ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);particles=Array.from({length:Math.min(45,Math.floor(innerWidth/32))},()=>({x:Math.random()*innerWidth,y:Math.random()*innerHeight,r:Math.random()*1.6+.3,vx:(Math.random()-.5)*.12,vy:(Math.random()-.5)*.12,a:Math.random()*.35+.08}))}
function animate(){ctx.clearRect(0,0,innerWidth,innerHeight);const t=Date.now()/1000;for(const p of particles){p.x+=p.vx;p.y+=p.vy;if(p.x<0||p.x>innerWidth)p.vx*=-1;if(p.y<0||p.y>innerHeight)p.vy*=-1;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fillStyle=`rgba(113,54,54,${p.a})`;ctx.fill()}requestAnimationFrame(animate)}
addEventListener('resize',resize);resize();animate();

// Small mobile navigation.
$('#mobileMenu')?.addEventListener('click',()=>{const nav=$('.site-header nav');if(!nav)return;nav.style.display=nav.style.display==='flex'?'none':'flex';nav.style.position='absolute';nav.style.top='74px';nav.style.left='0';nav.style.right='0';nav.style.padding='20px';nav.style.background='rgba(244,241,234,.97)';nav.style.flexDirection='column';nav.style.gap='18px';nav.style.borderBottom='1px solid var(--line)'});
