const { createClient } = window.supabase;
const sb = createClient(window.AUREN_SUPABASE_URL, window.AUREN_SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);
const overlay = $('#authOverlay');
const authContent = $('#authContent');
let otpCooldownUntil = 0;
let authBusy = false;

function toast(msg) {
  const t = $('#toast');
  if (!t) return;
  t.textContent = String(msg || 'Something went wrong.');
  t.classList.add('show');
  window.setTimeout(() => t.classList.remove('show'), 2800);
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

function validPassword(password) {
  return typeof password === 'string' && password.length >= 10 && password.length <= 128;
}

function validOtp(code) {
  return /^\d{6}$/.test(String(code || '').trim());
}

function openAuth(mode = 'login') {
  overlay?.classList.remove('hidden');
  renderAuth(mode === 'signup' ? 'signup' : 'login');
}

function closeAuth() {
  overlay?.classList.add('hidden');
  authBusy = false;
}

function renderAuth(mode) {
  const login = mode === 'login';
  authContent.textContent = '';

  const eyebrow = document.createElement('span');
  eyebrow.className = 'eyebrow';
  eyebrow.textContent = 'AUREN';
  const h2 = document.createElement('h2');
  h2.textContent = login ? 'welcome back.' : 'build your system.';
  const p = document.createElement('p');
  p.textContent = login ? 'continue where you left off.' : 'start with an email. your academic system grows around you.';

  const form = document.createElement('form');
  form.className = 'auth-form';
  form.id = 'authForm';

  const email = document.createElement('input');
  email.id = 'authEmail'; email.type = 'email'; email.autocomplete = 'email';
  email.placeholder = 'email address'; email.required = true; email.maxLength = 254;

  const password = document.createElement('input');
  password.id = 'authPassword'; password.type = 'password';
  password.autocomplete = login ? 'current-password' : 'new-password';
  password.placeholder = login ? 'password' : 'password · 10+ characters';
  password.required = true; password.maxLength = 128;
  if (!login) password.minLength = 10;

  const submit = document.createElement('button');
  submit.className = 'pill-btn dark'; submit.type = 'submit';
  submit.textContent = login ? 'log in ↗' : 'create account ↗';
  form.append(email, password, submit);

  const switchRow = document.createElement('div');
  switchRow.className = 'auth-switch';
  switchRow.textContent = login ? 'new here? ' : 'already have an account? ';
  const switchBtn = document.createElement('button');
  switchBtn.type = 'button'; switchBtn.textContent = login ? 'create account' : 'log in';
  switchRow.appendChild(switchBtn);

  const otpRow = document.createElement('div');
  otpRow.className = 'auth-switch';
  const otpBtn = document.createElement('button');
  otpBtn.type = 'button'; otpBtn.textContent = login ? 'use a one-time email code instead' : 'use email code instead';
  otpRow.appendChild(otpBtn);

  authContent.append(eyebrow, h2, p, form, switchRow, otpRow);
  form.addEventListener('submit', login ? passwordLogin : passwordSignup);
  switchBtn.addEventListener('click', () => renderAuth(login ? 'signup' : 'login'));
  otpBtn.addEventListener('click', () => renderOtp());
}

function renderOtp() {
  authContent.textContent = '';
  const eyebrow = document.createElement('span'); eyebrow.className = 'eyebrow'; eyebrow.textContent = 'EMAIL CODE';
  const h2 = document.createElement('h2'); h2.textContent = 'no password needed.';
  const p = document.createElement('p'); p.textContent = "we'll send a one-time code to your email. enter it here to continue.";
  const form = document.createElement('form'); form.className = 'auth-form'; form.id = 'otpForm';
  const email = document.createElement('input'); email.id = 'otpEmail'; email.type = 'email'; email.autocomplete = 'email'; email.placeholder = 'email address'; email.required = true; email.maxLength = 254;
  const submit = document.createElement('button'); submit.className = 'pill-btn dark'; submit.type = 'submit'; submit.textContent = 'send code ↗';
  form.append(email, submit);
  const row = document.createElement('div'); row.className = 'auth-switch';
  const back = document.createElement('button'); back.type = 'button'; back.textContent = 'use password instead'; row.appendChild(back);
  authContent.append(eyebrow, h2, p, form, row);
  form.addEventListener('submit', sendOtp);
  back.addEventListener('click', () => renderAuth('login'));
}

async function passwordSignup(e) {
  e.preventDefault();
  if (authBusy) return;
  const email = normalizeEmail($('#authEmail')?.value);
  const password = $('#authPassword')?.value || '';
  if (!validEmail(email)) return toast('enter a valid email address');
  if (!validPassword(password)) return toast('use a password between 10 and 128 characters');
  authBusy = true;
  try {
    const { data, error } = await sb.auth.signUp({ email, password });
    if (error) return toast('account creation could not be completed');
    if (!data?.user) return toast('account creation could not be completed');
    if (data.session) {
      closeAuth();
      await showApp(data.user);
      toast('account created');
    } else {
      toast('check your email to verify your account');
    }
  } finally { authBusy = false; }
}

async function passwordLogin(e) {
  e.preventDefault();
  if (authBusy) return;
  const email = normalizeEmail($('#authEmail')?.value);
  const password = $('#authPassword')?.value || '';
  if (!validEmail(email)) return toast('enter a valid email address');
  if (!password || password.length > 128) return toast('invalid email or password');
  authBusy = true;
  try {
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error || !data?.user) return toast('invalid email or password');
    closeAuth();
    await showApp(data.user);
  } finally { authBusy = false; }
}

async function sendOtp(e) {
  e.preventDefault();
  if (authBusy) return;
  const now = Date.now();
  if (now < otpCooldownUntil) return toast(`try again in ${Math.ceil((otpCooldownUntil - now) / 1000)}s`);
  const email = normalizeEmail($('#otpEmail')?.value);
  if (!validEmail(email)) return toast('enter a valid email address');
  authBusy = true;
  try {
    const { error } = await sb.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}${window.location.pathname}` }
    });
    if (error) return toast('we could not send a code right now');
    otpCooldownUntil = Date.now() + 60000;
    renderOtpVerify(email);
  } finally { authBusy = false; }
}

function renderOtpVerify(email) {
  authContent.textContent = '';
  const eyebrow = document.createElement('span'); eyebrow.className = 'eyebrow'; eyebrow.textContent = 'CHECK YOUR EMAIL';
  const h2 = document.createElement('h2'); h2.textContent = 'enter the six-digit code.';
  const p = document.createElement('p'); p.textContent = 'we sent a one-time code to ';
  const strong = document.createElement('b'); strong.textContent = email; p.appendChild(strong);
  const form = document.createElement('form'); form.className = 'auth-form'; form.id = 'verifyForm';
  const code = document.createElement('input'); code.id = 'otpCode'; code.inputMode = 'numeric'; code.maxLength = 6; code.pattern = '[0-9]{6}'; code.autocomplete = 'one-time-code'; code.placeholder = '123456'; code.required = true;
  const submit = document.createElement('button'); submit.className = 'pill-btn dark'; submit.type = 'submit'; submit.textContent = 'verify ↗'; form.append(code, submit);
  const row = document.createElement('div'); row.className = 'auth-switch'; const back = document.createElement('button'); back.type = 'button'; back.textContent = 'use another email'; row.appendChild(back);
  authContent.append(eyebrow, h2, p, form, row);
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const token = code.value.trim();
    if (!validOtp(token)) return toast('enter the six-digit code');
    if (authBusy) return;
    authBusy = true;
    try {
      const { data, error } = await sb.auth.verifyOtp({ email, token, type: 'email' });
      if (error || !data?.user) return toast('invalid or expired code');
      closeAuth();
      await showApp(data.user);
    } finally { authBusy = false; }
  });
  back.addEventListener('click', () => renderOtp());
  code.focus();
}

async function logout() {
  const { error } = await sb.auth.signOut({ scope: 'global' });
  if (error) return toast('could not log out completely');
  showPublic();
  toast('logged out');
}

function showPublic() {
  $('#publicView')?.classList.remove('hidden');
  $('#appView')?.classList.add('hidden');
}

async function showApp(user) {
  if (!user?.id) return showPublic();
  $('#publicView')?.classList.add('hidden');
  $('#appView')?.classList.remove('hidden');
  $('#userEmail').textContent = user.email || '';
  const { data, error } = await sb.from('profiles').select('full_name,primary_goal').eq('id', user.id).maybeSingle();
  if (error) console.warn('profile load failed');
  const fallback = user.email ? user.email.split('@')[0] : 'student';
  const name = data?.full_name || fallback;
  $('#welcomeName').textContent = `good morning, ${name.split(/\s+/)[0]}.`;
  $('#goalLine').textContent = data?.primary_goal ? `${data.primary_goal} · your next move is ready.` : 'your next move is ready.';
  $('#todayDate').textContent = new Intl.DateTimeFormat('en-IN', { weekday: 'long', month: 'short', day: 'numeric' }).format(new Date());
}

$('#logoutBtn')?.addEventListener('click', logout);
$('#authClose')?.addEventListener('click', closeAuth);
overlay?.addEventListener('click', (e) => { if (e.target === overlay) closeAuth(); });
$$('[data-auth]').forEach((b) => b.addEventListener('click', () => openAuth(b.dataset.auth)));
$('#tutorBtn')?.addEventListener('click', () => openAuth('login'));

sb.auth.onAuthStateChange((_event, session) => {
  if (session?.user) showApp(session.user);
  else showPublic();
});
sb.auth.getSession().then(({ data: { session } }) => session?.user ? showApp(session.user) : showPublic());

// Ambient live effect. No user data is rendered into the canvas.
const canvas = $('#ambient');
const ctx = canvas?.getContext('2d');
let particles = [];
function resize() {
  if (!canvas || !ctx) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = innerWidth * dpr; canvas.height = innerHeight * dpr;
  canvas.style.width = innerWidth + 'px'; canvas.style.height = innerHeight + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  particles = Array.from({ length: Math.min(45, Math.floor(innerWidth / 32)) }, () => ({
    x: Math.random() * innerWidth, y: Math.random() * innerHeight, r: Math.random() * 1.6 + .3,
    vx: (Math.random() - .5) * .12, vy: (Math.random() - .5) * .12, a: Math.random() * .35 + .08
  }));
}
function animate() {
  if (!canvas || !ctx) return;
  ctx.clearRect(0, 0, innerWidth, innerHeight);
  for (const p of particles) {
    p.x += p.vx; p.y += p.vy;
    if (p.x < 0 || p.x > innerWidth) p.vx *= -1;
    if (p.y < 0 || p.y > innerHeight) p.vy *= -1;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(113,54,54,${p.a})`; ctx.fill();
  }
  requestAnimationFrame(animate);
}
addEventListener('resize', resize); resize(); animate();

$('#mobileMenu')?.addEventListener('click', () => {
  const nav = $('.site-header nav');
  if (!nav) return;
  nav.classList.toggle('mobile-open');
});
