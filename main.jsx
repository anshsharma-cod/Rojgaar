import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ArrowRight, BriefcaseBusiness, CheckCircle2, Compass, Crown, HardHat, Home,
  LogOut, MapPin, Plus, Search, Send, ShieldCheck, Users, X
} from 'lucide-react';
import { supabase } from './supabase.js';
import WorkerPlatform from './worker-platform.jsx';
import BlackHole from './BlackHole.jsx';
import StickmanArcher from './StickmanArcher.jsx';
import './style.css';

const categories = ['Home & life', 'Tech & devices', 'Creative help', 'Education', 'Moving & errands', 'Daily services'];
const configured = Boolean(supabase);
const fallingStars = [
  ['4%', '7.5s', '-5s', '18px', '42px'],
  ['12%', '9s', '-1s', '24px', '-24px'],
  ['21%', '6.5s', '-4s', '16px', '30px'],
  ['29%', '10s', '-8s', '26px', '-36px'],
  ['38%', '8s', '-2s', '20px', '25px'],
  ['47%', '11s', '-7s', '16px', '-22px'],
  ['56%', '7s', '-3s', '22px', '36px'],
  ['65%', '9.5s', '-6s', '18px', '-30px'],
  ['73%', '6s', '-1.5s', '25px', '27px'],
  ['81%', '10.5s', '-9s', '17px', '-25px'],
  ['90%', '7.8s', '-4.5s', '23px', '34px'],
  ['97%', '12s', '-10s', '19px', '-32px'],
];

function initials(name = '') {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0].toUpperCase()).join('') || 'R';
}

function formatPostedAt(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(date);
}

const roleDetails = {
  worker: {
    label: 'WORKER EXPERIENCE',
    title: <>Apne hunar ko<br/><em>kaam se jodo.</em></>,
    intro: 'Apni skills aur service area dikhayein, kaam ki baat seedhe karein, aur apni availability par control rakhein.',
    action: 'Worker ke roop mein shuru karein',
    features: [
      ['Secure worker enrollment', 'Live enrollment ke liye connected backend zaroori hai: mobile/ID duplicate checks, checksum check, PIN lookup, camera photo aur optional voice bio. Aadhaar checksum identity/KYC verification nahi hai. Abhi yahan sirf safe local profile draft ban sakta hai.', 'draft'],
      ['Digital registration ID', 'QR registration card aur enrollment status secure server enrollment ke baad hi milte hain. Local draft registration ID ya government ID/KYC verification nahi hai.', 'backend'],
      ['Worker directory', 'Public listing, availability aur rate management ke liye backend connect hona baaki hai. Abhi profile draft sirf is browser mein hai; WhatsApp share aap khud bhejte hain.', 'draft'],
      ['Chat aur deal', 'Realtime chat, offer accept/counter aur booking server-backed hain; yeh live features backend deploy hone ke baad chalenge.', 'backend'],
      ['Payment aur completion', 'UPI/Razorpay booking actions ke liye server functions aur private provider setup zaroori hai. Razorpay escrow nahi hai; completion code sirf app status update karta hai.', 'backend'],
      ['Hindi, English aur offline draft', 'Language toggle aur non-sensitive form draft. Directory, chat aur online enrollment ke liye internet chahiye. SMS/WhatsApp confirmation provider abhi configured nahi hai.', 'draft'],
    ],
  },
  customer: {
    label: 'CUSTOMER EXPERIENCE',
    title: <>Apne paas<br/><em>sahi madad paayein.</em></>,
    intro: 'Local workers ko unke skill aur area ke hisaab se dhoondhein, kaam aur rate par baat karein, aur booking status dekhein.',
    action: 'Customer ke roop mein shuru karein',
    features: [
      ['Local worker directory', 'Live worker search ke liye shared Supabase directory chahiye. Backend connect hone par skill, district/PIN, rate aur availability filters chalenge.', 'backend'],
      ['Kaam ki request', 'Abhi task details ka draft isi browser mein save karke apni marzi se WhatsApp par share kar sakte hain. Yeh shared Rojgaar task board par publish nahi hota.', 'draft'],
      ['Chat aur price negotiation', 'Realtime worker chat, offer bhejna, counter-offer aur deal locking ke liye connected backend zaroori hai.', 'backend'],
      ['Booking aur payment', 'UPI/Razorpay booking actions tabhi chalenge jab server functions aur payment provider set up hon. Direct UPI Rojgaar verify nahi karta; Razorpay escrow nahi hai.', 'backend'],
      ['Booking completion', 'Paid booking ke liye completion-code flow. Code app mein completion confirm karta hai—funds hold/release nahi karta.', 'backend'],
      ['Account aur privacy', 'Real email/password accounts ke liye Supabase setup baaki hai. Worker ki ID unverified ho sakti hai; registration card government ID ka substitute nahi hai.', 'backend'],
    ],
  },
};

function PublicLanding({ onChooseRole }) {
  return <main className="public-landing">
    <BlackHole/>
    <StickmanArcher/>
    <div className="falling-stars" aria-hidden="true">
      {fallingStars.map(([left, duration, delay, trail, drift], index) => <span
        className={`falling-star ${index % 4 === 0 ? 'warm-star' : ''}`}
        key={left}
        style={{
          '--star-left': left,
          '--star-duration': duration,
          '--star-delay': delay,
          '--star-trail': trail,
          '--star-drift': drift,
        }}
      />)}
    </div>
    <header className="landing-header">
      <a className="brand landing-brand" href="#home"><i>R</i><span><span>Rojgaar</span></span></a>
      <nav aria-label="Main navigation">
        <a href="#how-it-works">How it works</a>
        <a href="#for-workers">For workers</a>
        <a href="#for-customers">For customers</a>
      </nav>
      <button className="landing-signin" onClick={() => onChooseRole('customer')}>Explore Rojgaar <ArrowRight size={16}/></button>
    </header>

    <section className="landing-hero" id="home">
      <div className="landing-hero-copy">
        <span className="landing-kicker"><span/> KAAM AAS-PAAS. MAUKE SABKE LIYE.</span>
        <h1>Local kaam <span className="ko-word">ko<i className="ko-base"/></span><br/><em>nayi pehchaan.</em></h1>
        <p>Rojgaar brings people who need a hand together with skilled workers in their neighbourhood.</p>
        <button className="landing-primary" onClick={() => onChooseRole('customer')}>Find local help <ArrowRight size={17}/></button>
        <div className="landing-trust"><ShieldCheck size={16}/> Built around clear work, fair conversations and local communities.</div>
      </div>
      <div className="landing-art" aria-hidden="true">
        <div className="landing-art-ring ring-one"/>
        <div className="landing-art-ring ring-two"/>
        <div className="landing-art-core cinematic-logo"><span>R</span><small>ROJGAAR</small></div>
        <div className="landing-art-dot"/>
      </div>
    </section>

    <section className="landing-how" id="how-it-works">
      <div className="landing-section-heading">
        <span className="landing-kicker">SIMPLE. LOCAL. HUMAN.</span>
        <h2>Kaam dhoondhna ho ya<br/><em>madad deni ho.</em></h2>
        <p>Ek hi jagah, dono taraf ke logon ke liye bana.</p>
      </div>
      <div className="landing-cards">
        <button className="landing-card" id="for-workers" onClick={() => onChooseRole('worker')}>
          <span className="landing-card-icon"><HardHat size={20}/></span>
          <span className="landing-card-label">WORKERS KE LIYE</span>
          <strong className="landing-card-title">Apne hunar ko kaam se jodo.</strong>
          <span className="landing-card-copy">Apni skills aur service area dikhayein, kaam ki baat seedhe karein, aur apni availability par control rakhein.</span>
          <span className="landing-card-points"><span><CheckCircle2 size={15}/> Hunar aur local profile</span><span><CheckCircle2 size={15}/> Kaam aur rate par seedhi baat</span></span>
        </button>
        <button className="landing-card featured" id="for-customers" onClick={() => onChooseRole('customer')}>
          <span className="landing-card-icon"><Users size={20}/></span>
          <span className="landing-card-label">CUSTOMERS KE LIYE</span>
          <strong className="landing-card-title">Apne paas sahi madad paayein.</strong>
          <span className="landing-card-copy">Apni zaroorat saaf batayein, local logon se connect karein, aur shuru karne se pehle kaam aur daam tay karein.</span>
          <span className="landing-card-points"><span><CheckCircle2 size={15}/> Local skills aur services</span><span><CheckCircle2 size={15}/> Kaam shuru hone se pehle terms tay</span></span>
        </button>
      </div>
    </section>

    <section className="landing-values">
      <div><Compass size={18}/><span><strong>Local-first</strong><small>Apne aas-paas ke maukon par focus.</small></span></div>
      <div><ShieldCheck size={18}/><span><strong>Clear conversations</strong><small>Kaam, daam aur timing pehle se tay.</small></span></div>
      <div><BriefcaseBusiness size={18}/><span><strong>Many kinds of work</strong><small>Rozmarra ki madad se skilled services tak.</small></span></div>
    </section>

    <footer className="landing-footer">
      <a className="brand landing-brand" href="#home"><i>R</i><span><span>Rojgaar</span></span></a>
      <span>Local work. Real people. Better possibilities.</span>
    </footer>
  </main>;
}

function RoleExperience({ role, onBack, onSwitchRole }) {
  const [message, setMessage] = useState('');
  const [featureNotice, setFeatureNotice] = useState(null);
  const [savedDraft, setSavedDraft] = useState(null);
  const [editingDraft, setEditingDraft] = useState(null);
  const details = roleDetails[role];
  const storageKey = `rojgaar-${role}-draft`;

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      setSavedDraft(saved ? JSON.parse(saved) : null);
      setMessage('');
    } catch (storageError) {
      console.error(`Could not read the saved ${role} draft`, storageError);
      setMessage('Is browser mein purana draft nahi khul saka. Naya draft bana sakte hain.');
      setSavedDraft(null);
    }
  }, [role, storageKey]);

  const saveDraft = event => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const draft = Object.fromEntries(formData.entries());
    draft.savedAt = new Date().toISOString();
    try {
      localStorage.setItem(storageKey, JSON.stringify(draft));
      setSavedDraft(draft);
      setEditingDraft(null);
      setMessage(role === 'customer'
        ? 'Task draft isi device par save hua hai. Abhi public Rojgaar board par post nahi hua.'
        : 'Worker profile draft isi device par save hua hai. Abhi public directory mein register nahi hua.');
    } catch (storageError) {
      console.error(`Could not save the ${role} draft`, storageError);
      setMessage('Draft save nahi ho saka. Browser storage available nahi hai; details copy karke rakh lein.');
    }
  };

  const removeDraft = () => {
    try {
      localStorage.removeItem(storageKey);
      setSavedDraft(null);
      setEditingDraft(null);
      setMessage('Is device se saved draft delete kar diya.');
    } catch (storageError) {
      console.error(`Could not delete the ${role} draft`, storageError);
      setMessage('Draft delete nahi ho saka. Browser storage setting check karein.');
    }
  };

  const shareDraft = () => {
    if (!savedDraft) return;
    const text = role === 'customer'
      ? `Rojgaar task request\n${savedDraft.title}\n${savedDraft.category}\n${savedDraft.description}\nBudget: ₹${savedDraft.reward}\nLocation: ${savedDraft.city}${savedDraft.state ? `, ${savedDraft.state}` : ''}\n\nPlease contact me to discuss this work.`
      : `Rojgaar worker profile\n${savedDraft.name}\nSkill: ${savedDraft.skill}\nDaily rate: ₹${savedDraft.rate}\nExperience: ${savedDraft.experience} years\nService area: ${savedDraft.district}, ${savedDraft.state} ${savedDraft.pincode}\n\nThis is a self-shared profile, not identity/KYC verified. Please contact me to discuss work.`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  };

  const activateFeature = (title, description, action) => {
    setFeatureNotice(null);
    if (action === 'draft') {
      document.getElementById('role-action')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      window.setTimeout(() => {
        const firstInput = document.querySelector('.role-action-form input, .role-action-form select');
        if (firstInput instanceof HTMLElement) firstInput.focus({ preventScroll: true });
      }, 250);
      setMessage(role === 'customer'
        ? 'Task request draft form khul gaya. Save karne se pehle details review karein.'
        : 'Worker profile draft form khul gaya. Yeh public enrollment nahi hai.');
      return;
    }
    setFeatureNotice({ title, description, action });
  };

  return <main className="role-experience">
    <header className="landing-header role-header">
      <button className="brand landing-brand" onClick={onBack}><i>R</i><span><span>Rojgaar</span></span></button>
      <button className="role-back" onClick={onBack}>← Home</button>
    </header>
    <section className="role-hero">
      <span className="landing-kicker"><span/>{details.label}</span>
      <h1>{details.title}</h1>
      <p>{details.intro}</p>
      <div className="role-hero-actions">
        <button className="landing-primary" onClick={() => {
          setMessage('');
          document.getElementById('role-action')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }}>{details.action}<ArrowRight size={17}/></button>
        <button className="role-switch" onClick={() => { setMessage(''); onSwitchRole(role === 'worker' ? 'customer' : 'worker'); }}>
          {role === 'worker' ? 'Customer options dekhein' : 'Worker options dekhein'}
        </button>
      </div>
    </section>
    <section className="role-action-panel" id="role-action">
      <div className="role-action-heading">
        <span className="landing-kicker">{role === 'customer' ? 'CUSTOMER TASK' : 'WORKER PROFILE'}</span>
        <h2>{savedDraft
          ? (role === 'customer' ? 'Aapka saved task draft' : 'Aapka saved worker draft')
          : (role === 'customer' ? 'Kaam ki request taiyar karein' : 'Apni worker profile taiyar karein')}</h2>
        <p>Draft sirf isi browser/device par save hota hai. Yeh public post, online enrollment ya kisi aur user ko dikhne wali listing nahi hai.</p>
      </div>
      {savedDraft ? <div className="role-draft-preview">
        <div className="role-draft-copy">
          {role === 'customer' ? <>
            <span className="category">{savedDraft.category}</span>
            <h3>{savedDraft.title}</h3>
            <p>{savedDraft.description}</p>
            <span>Budget: ₹{Number(savedDraft.reward).toLocaleString('en-IN')} · {savedDraft.city}{savedDraft.state ? `, ${savedDraft.state}` : ''}</span>
          </> : <>
            <span className="category">{savedDraft.skill}</span>
            <h3>{savedDraft.name}</h3>
            <p>₹{Number(savedDraft.rate).toLocaleString('en-IN')} / day · {savedDraft.experience} years experience</p>
            <span>{savedDraft.district}, {savedDraft.state} · PIN {savedDraft.pincode}</span>
          </>}
        </div>
        <div className="role-draft-actions">
          <button type="button" className="landing-primary" onClick={shareDraft}>WhatsApp par share karein <ArrowRight size={16}/></button>
          <button type="button" className="role-switch" onClick={() => { setEditingDraft(savedDraft); setSavedDraft(null); setMessage('Draft edit karein; save karne par isi device ka draft update hoga.'); }}>Edit draft</button>
          <button type="button" className="role-delete-draft" onClick={removeDraft}>Draft delete karein</button>
        </div>
      </div> : role === 'customer' ? <form className="role-action-form" onSubmit={saveDraft}>
        <label>Kaam ka title<input name="title" required minLength={5} maxLength={120} defaultValue={editingDraft?.title || ''} placeholder="Jaise: Ghar ka fan repair karwana hai"/></label>
        <label>Category<select name="category" required defaultValue={editingDraft?.category || categories[0]}>{categories.map(category => <option key={category}>{category}</option>)}</select></label>
        <label className="role-form-wide">Kaam ki details<textarea name="description" required minLength={10} maxLength={2000} defaultValue={editingDraft?.description || ''} placeholder="Kaam, timing aur zaroori details batayein"/></label>
        <label>Budget (₹)<input name="reward" required type="number" min="1" step="1" defaultValue={editingDraft?.reward || ''} placeholder="Jaise: 700"/></label>
        <label>City<input name="city" required maxLength={100} defaultValue={editingDraft?.city || ''} placeholder="Aapka shehar"/></label>
        <label>State (optional)<input name="state" maxLength={100} defaultValue={editingDraft?.state || ''} placeholder="Rajya"/></label>
        <div className="role-form-wide">
          <p className="role-form-note">Address, phone number ya Aadhaar yahan mat daalein. Save karne se request public nahi hogi; WhatsApp share aapke control mein hai.</p>
          <button className="landing-primary" type="submit">Task draft save karein <ArrowRight size={16}/></button>
        </div>
      </form> : <form className="role-action-form" onSubmit={saveDraft}>
        <label>Aapka naam<input name="name" required minLength={2} maxLength={80} autoComplete="name" defaultValue={editingDraft?.name || ''} placeholder="Poora naam"/></label>
        <label>Skill / service<select name="skill" required defaultValue={editingDraft?.skill || ''}><option value="" disabled>Skill chunein</option>{['Plumber', 'Electrician', 'Carpenter', 'Cleaner', 'Cook', 'Tutor', 'Driver', 'Delivery helper', 'Mechanic', 'Gardener', 'Tailor', 'Web developer', 'Designer', 'Other'].map(skill => <option key={skill}>{skill}</option>)}</select></label>
        <label>Daily rate (₹)<input name="rate" required type="number" min="1" step="1" defaultValue={editingDraft?.rate || ''} placeholder="Jaise: 800"/></label>
        <label>Experience (years)<input name="experience" required type="number" min="0" max="80" step="0.5" defaultValue={editingDraft?.experience || ''} placeholder="Jaise: 3"/></label>
        <label>District<input name="district" required maxLength={100} defaultValue={editingDraft?.district || ''} placeholder="Aapka zila"/></label>
        <label>State<input name="state" required maxLength={100} defaultValue={editingDraft?.state || ''} placeholder="Aapka rajya"/></label>
        <label className="role-form-wide">PIN code<input name="pincode" required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} defaultValue={editingDraft?.pincode || ''} placeholder="6-digit PIN code"/></label>
        <div className="role-form-wide">
          <p className="role-form-note">Yeh personal draft hai, public worker enrollment ya KYC verification nahi. Aadhaar, UPI ID, phone number ya private details yahan mat daalein.</p>
          <button className="landing-primary" type="submit">Worker profile draft save karein <ArrowRight size={16}/></button>
        </div>
      </form>}
      {message && <div className="role-message" role="status">{message}</div>}
    </section>
    <section className="role-features">
      <div className="role-features-heading">
        <span className="landing-kicker">ROJGAAR PAR KYA KAR SAKTE HAIN</span>
        <h2>{role === 'worker' ? 'Worker ke liye tools' : 'Customer ke liye tools'}</h2>
        <p>{role === 'customer' ? 'Task draft taiyar karke WhatsApp se apni pasand ke logon ke saath share karein.' : 'Profile draft taiyar karke WhatsApp se apne contacts ke saath share karein.'}</p>
      </div>
      <div className="role-feature-grid">
        {details.features.map(([title, description, action], index) => <button
          className="role-feature"
          key={title}
          type="button"
          onClick={() => activateFeature(title, description, action)}
          aria-label={`${title}: ${action === 'draft' ? 'open draft form' : 'view feature details and available next step'}`}
        >
          <span className="role-feature-number">0{index + 1}</span>
          <strong className="role-feature-title">{title}</strong>
          <span className="role-feature-description">{description}</span>
          <span className="role-feature-action">{action === 'draft' ? 'Apna draft kholen' : 'Feature details dekhein'} <ArrowRight size={14}/></span>
        </button>)}
      </div>
      {featureNotice && <div className="role-feature-notice" role="status">
        <div><strong>{featureNotice.title}</strong><p>{featureNotice.description}</p></div>
        <div className="role-feature-notice-actions">
          {role === 'customer' && featureNotice.action === 'backend' && featureNotice.title !== 'Account aur privacy' && <button type="button" className="landing-primary" onClick={() => {
            setFeatureNotice(null);
            document.getElementById('role-action')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }}>Task request draft banayein <ArrowRight size={15}/></button>}
          {role === 'worker' && featureNotice.action === 'backend' && <button type="button" className="landing-primary" onClick={() => {
            setFeatureNotice(null);
            document.getElementById('role-action')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }}>Worker profile draft banayein <ArrowRight size={15}/></button>}
          <button type="button" className="role-switch" onClick={() => setFeatureNotice(null)}>Band karein</button>
        </div>
      </div>}
    </section>
    <footer className="landing-footer role-footer">
      <button className="brand landing-brand" onClick={onBack}><i>R</i><span><span>Rojgaar</span></span></button>
      <span>Local work. Real people. Better possibilities.</span>
    </footer>
  </main>;
}

function AuthScreen() {
  const [mode, setMode] = useState('sign-in');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const submit = async event => {
    event.preventDefault();
    setError('');
    setNotice('');
    setBusy(true);

    try {
      if (mode === 'sign-up') {
        const { data, error: authError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { full_name: fullName.trim() } }
        });
        if (authError) throw authError;
        if (!data.session) setNotice('Account created. Check your email to confirm your address, then sign in.');
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password
        });
        if (authError) throw authError;
      }
    } catch (authError) {
      setError(authError.message || 'Could not authenticate. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return <main className="auth-page">
    <section className="auth-card">
      <a className="brand auth-brand" href="#top"><i>R</i><span><span>Rojgaar</span></span></a>
      <span className="eyebrow"><ShieldCheck size={14}/> REAL PEOPLE. REAL WORK.</span>
      <h1>{mode === 'sign-up' ? 'Join Rojgaar' : 'Welcome back'}</h1>
      <p>Sign in to find local work or post a task for your community.</p>
      <form onSubmit={submit}>
        {mode === 'sign-up' && <label className="auth-label">Your name
          <input required autoComplete="name" minLength={2} maxLength={80} value={fullName} onChange={event => setFullName(event.target.value)} />
        </label>}
        <label className="auth-label">Email
          <input required type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} />
        </label>
        <label className="auth-label">Password
          <input required type="password" autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'} minLength={8} value={password} onChange={event => setPassword(event.target.value)} />
          {mode === 'sign-up' && <small>Use at least 8 characters.</small>}
        </label>
        {error && <div className="form-message error-message" role="alert">{error}</div>}
        {notice && <div className="form-message success-message" role="status">{notice}</div>}
        <button className="publish auth-submit" disabled={busy}>{busy ? 'Please wait…' : mode === 'sign-up' ? 'Create account' : 'Sign in'}</button>
      </form>
      <button className="auth-switch" onClick={() => { setMode(mode === 'sign-up' ? 'sign-in' : 'sign-up'); setError(''); setNotice(''); }}>
        {mode === 'sign-up' ? 'Already have an account? Sign in' : 'New to Rojgaar? Create an account'}
      </button>
    </section>
  </main>;
}

function TaskCard({ task, currentUserId, applied, onApply, busy }) {
  const ownerName = task.profiles?.full_name || 'Rojgaar member';
  const isOwner = task.user_id === currentUserId;
  return <article className="task-card">
    <div className="task-head">
      <span className={`avatar ${isOwner ? 'ink' : 'teal'}`}>{initials(ownerName)}</span>
      <div><strong>{ownerName}</strong><span className="task-meta">{formatPostedAt(task.created_at)} · <span className="verified"><ShieldCheck size={13}/> Rojgaar member</span></span></div>
    </div>
    <div className="task-body">
      <span className="category">{task.category}</span>
      <div className="task-location"><MapPin size={14}/>{task.city}{task.state ? `, ${task.state}` : ''}</div>
      <h2>{task.title}</h2>
      <p>{task.description}</p>
      {isOwner && task.task_interests?.length > 0 && <div className="applicant-list">
        <strong>{task.task_interests.length} interested {task.task_interests.length === 1 ? 'person' : 'people'}</strong>
        <span>{task.task_interests.map(application => application.profiles?.full_name || 'Rojgaar member').join(', ')}</span>
      </div>}
      <div className="reward-panel">
        <div><span>Task reward</span><strong>₹{Number(task.reward).toLocaleString('en-IN')}</strong></div>
        {isOwner
          ? <span className="task-owner-label">Your task</span>
          : <button disabled={busy || applied} onClick={() => onApply(task.id)}>{applied ? 'Interest sent' : busy ? 'Sending…' : "I'm interested"} <Send size={15}/></button>}
      </div>
    </div>
  </article>;
}

function App() {
  const [publicRole, setPublicRole] = useState(null);
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [appliedTaskIds, setAppliedTaskIds] = useState(new Set());
  const [search, setSearch] = useState('');
  const [activeNav, setActiveNav] = useState(() => new URLSearchParams(window.location.search).has('worker') ? 'Workers' : 'Home');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskReward, setTaskReward] = useState('');
  const [taskCategory, setTaskCategory] = useState(categories[0]);
  const [taskCity, setTaskCity] = useState('');
  const [taskState, setTaskState] = useState('');
  const [loading, setLoading] = useState(false);
  const [savingTask, setSavingTask] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [busyTaskId, setBusyTaskId] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js')
      .catch(registrationError => {
        console.error('Could not register the Rojgaar offline app shell', registrationError);
        setError('Offline app support could not be enabled in this browser.');
      });
  }, []);

  useEffect(() => {
    if (!configured) {
      setAuthLoading(false);
      return undefined;
    }

    let active = true;
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (active) {
        setSession(nextSession);
        setProfile(null);
        setAppliedTaskIds(new Set());
      }
    });

    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return;
      if (sessionError) setError(sessionError.message);
      setSession(data.session);
      setAuthLoading(false);
    }).catch(sessionError => {
      if (active) {
        setError(sessionError.message || 'Unable to restore your session.');
        setAuthLoading(false);
      }
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session?.user) {
      setProfile(null);
      setTasks([]);
      setLoading(false);
      return undefined;
    }

    let active = true;
    setLoading(true);
    setError('');
    Promise.all([
      supabase.from('profiles').select('id, full_name, city, state').eq('id', session.user.id).single(),
      supabase.from('tasks').select('id, user_id, title, description, category, reward, city, state, created_at, profiles(full_name), task_interests(id, user_id, created_at, profiles(full_name))').order('created_at', { ascending: false }).limit(100),
      supabase.from('task_interests').select('task_id').eq('user_id', session.user.id)
    ]).then(([profileResult, taskResult, interestResult]) => {
      if (!active) return;
      const requestError = profileResult.error || taskResult.error || interestResult.error;
      if (requestError) {
        setError(requestError.message);
        return;
      }
      setProfile(profileResult.data);
      setTasks(taskResult.data || []);
      setAppliedTaskIds(new Set((interestResult.data || []).map(item => item.task_id)));
      setTaskCity(profileResult.data.city || '');
      setTaskState(profileResult.data.state || '');
    }).catch(requestError => {
      if (active) setError(requestError.message || 'Could not load Rojgaar data.');
    }).finally(() => {
      if (active) setLoading(false);
    });

    return () => { active = false; };
  }, [session?.user?.id, refreshKey]);

  const visibleTasks = useMemo(() => {
    const query = search.trim().toLowerCase();
    return tasks.filter(task => {
      if (activeNav === 'My tasks' && task.user_id !== session?.user?.id) return false;
      if (!query) return true;
      return [task.title, task.description, task.category, task.city, task.state, task.profiles?.full_name]
        .filter(Boolean).join(' ').toLowerCase().includes(query);
    });
  }, [tasks, search, activeNav, session?.user?.id]);

  const publishTask = async event => {
    event.preventDefault();
    setError('');
    setNotice('');
    const reward = Number(taskReward);
    if (!Number.isFinite(reward) || reward <= 0) {
      setError('Enter a reward greater than ₹0.');
      return;
    }
    setSavingTask(true);
    try {
      const { error: insertError } = await supabase.from('tasks').insert({
        user_id: session.user.id,
        title: taskTitle.trim(),
        description: taskDescription.trim(),
        category: taskCategory,
        reward,
        city: taskCity.trim(),
        state: taskState.trim() || null
      });
      if (insertError) throw insertError;
      setShowTaskModal(false);
      setTaskTitle('');
      setTaskDescription('');
      setTaskReward('');
      setNotice('Your task is live and visible to the Rojgaar community.');
      setRefreshKey(value => value + 1);
    } catch (saveError) {
      setError(saveError.message || 'Could not publish your task.');
    } finally {
      setSavingTask(false);
    }
  };

  const applyForTask = async taskId => {
    setError('');
    setNotice('');
    setBusyTaskId(taskId);
    try {
      const { error: insertError } = await supabase.from('task_interests').insert({
        task_id: taskId,
        user_id: session.user.id
      });
      if (insertError) throw insertError;
      setAppliedTaskIds(current => new Set([...current, taskId]));
      setNotice('Your interest has been sent to the task owner.');
    } catch (applicationError) {
      if (applicationError.code === '23505') {
        setAppliedTaskIds(current => new Set([...current, taskId]));
      } else {
        setError(applicationError.message || 'Could not send your interest.');
      }
    } finally {
      setBusyTaskId(null);
    }
  };

  const saveProfile = async event => {
    event.preventDefault();
    setError('');
    setNotice('');
    setSavingProfile(true);
    try {
      const { data, error: updateError } = await supabase.from('profiles').update({
        full_name: profile.full_name.trim(),
        city: profile.city.trim(),
        state: profile.state.trim() || null
      }).eq('id', session.user.id).select('id, full_name, city, state').single();
      if (updateError) throw updateError;
      setProfile(data);
      setNotice('Profile saved.');
    } catch (profileError) {
      setError(profileError.message || 'Could not save your profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const signOut = async () => {
    setError('');
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) setError(signOutError.message);
  };

  if (!configured) return publicRole
    ? <RoleExperience
      role={publicRole}
      onBack={() => setPublicRole(null)}
      onSwitchRole={setPublicRole}
    />
    : <PublicLanding onChooseRole={setPublicRole}/>;
  if (authLoading) return <main className="auth-page"><p className="loading-message">Connecting to Rojgaar…</p></main>;
  if (!session) return <AuthScreen />;

  const nav = [[Home, 'Home'], [Compass, 'Explore'], [BriefcaseBusiness, 'My tasks'], [HardHat, 'Workers'], [Users, 'Profile']];
  const changeProfile = (key, value) => setProfile(current => ({ ...current, [key]: value }));

  return <>
    <header><div className="header-inner">
      <a className="brand" href="#top"><i>R</i><span><span>Rojgaar</span></span></a>
      <label className="search"><Search size={18}/><input aria-label="Search tasks" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search tasks, skills, or locations"/></label>
      <nav>{nav.map(([Icon, label]) => <button key={label} onClick={() => setActiveNav(label)} className={activeNav === label ? 'selected' : ''}><Icon size={20}/><span>{label}</span></button>)}</nav>
      <button className="premium-nav-button" onClick={() => setShowPremiumModal(true)}><Crown size={16}/> <span>Premium</span><strong>₹99</strong></button>
      <button className="account-button" onClick={signOut} title="Sign out"><span className="avatar ink">{initials(profile?.full_name)}</span><LogOut size={17}/></button>
    </div></header>
    {activeNav === 'Workers' ? <WorkerPlatform userId={session.user.id} onBack={() => setActiveNav('Home')}/> : <main id="top" className="home-layout real-app-layout">
      {activeNav === 'Profile' ? <section className="profile-editor">
        <span className="eyebrow"><Users size={14}/> YOUR ACCOUNT</span><h1>Your profile</h1>
        <p>These details are shown alongside your public task posts.</p>
        {error && <div className="form-message error-message" role="alert">{error}</div>}
        {notice && <div className="form-message success-message" role="status">{notice}</div>}
        {profile && <form onSubmit={saveProfile}>
          <label className="auth-label">Full name<input required minLength={2} maxLength={80} value={profile.full_name || ''} onChange={event => changeProfile('full_name', event.target.value)}/></label>
          <label className="auth-label">City<input required maxLength={100} value={profile.city || ''} onChange={event => changeProfile('city', event.target.value)}/></label>
          <label className="auth-label">State (optional)<input maxLength={100} value={profile.state || ''} onChange={event => changeProfile('state', event.target.value)}/></label>
          <button className="publish" disabled={savingProfile}>{savingProfile ? 'Saving…' : 'Save profile'}</button>
        </form>}
        <button className="logout-button" onClick={signOut}><LogOut size={16}/> Sign out</button>
      </section> : <section className="feed">
        {activeNav === 'Explore' ? <section className="explore-heading real-explore"><span className="eyebrow"><Compass size={14}/> COMMUNITY TASKS</span><h1>Explore useful work<br/><em>near you.</em></h1><p>Browse tasks posted by real Rojgaar members.</p></section> : <section className="hero"><div><span className="eyebrow"><ShieldCheck size={14}/> GET THINGS DONE, TOGETHER</span><h1>Small favours.<br/><em>Big possibilities.</em></h1><p>Post what you need. Someone nearby can make it happen.</p><button className="post-btn" onClick={() => { setError(''); setShowTaskModal(true); }}><Plus size={19}/>Post a task</button></div><div className="hero-orb"><span>✦</span><div className="orbit-card top">Need help?<b>Just ask.</b></div></div></section>}
        <div className="feed-title"><h2>{activeNav === 'My tasks' ? 'Tasks you posted' : 'Community tasks'}</h2><span>{visibleTasks.length} {visibleTasks.length === 1 ? 'task' : 'tasks'}</span></div>
        {error && <div className="form-message error-message" role="alert">{error}</div>}
        {notice && <div className="form-message success-message" role="status">{notice}</div>}
        {loading ? <div className="no-job-found">Loading tasks…</div> : visibleTasks.length
          ? visibleTasks.map(task => <TaskCard key={task.id} task={task} currentUserId={session.user.id} applied={appliedTaskIds.has(task.id)} busy={busyTaskId === task.id} onApply={applyForTask}/>)
          : <div className="no-job-found"><Search size={24}/><h3>{search ? 'No matching tasks' : activeNav === 'My tasks' ? 'You have not posted a task yet' : 'No tasks posted yet'}</h3><p>{search ? 'Try another skill or location.' : 'Be one of the first to share a real opportunity with the community.'}</p>{activeNav !== 'Explore' && <button className="post-btn" onClick={() => setShowTaskModal(true)}><Plus size={17}/>Post a task</button>}</div>}
      </section>}
      {activeNav !== 'Profile' && <aside className="right-rail">
        <div className="profile-card compact-profile"><div className="profile-gradient"></div><span className="avatar ink large">{initials(profile?.full_name)}</span><h3>{profile?.full_name || 'Rojgaar member'}</h3><p>{profile?.city || 'Add your location'}</p><button onClick={() => setActiveNav('Profile')}>Edit profile</button></div>
        <button className="premium-card" onClick={() => setShowPremiumModal(true)}><span className="premium-icon"><Crown size={20}/></span><span className="premium-card-copy"><small>ROJGAAR PREMIUM</small><strong>More ways to stand out</strong><span>₹99 <small>/ month</small></span></span><span className="premium-arrow">→</span></button>
        <div className="people"><div className="aside-title"><h3>Community guidelines</h3></div><p className="guideline-copy">Agree on the work, price, and timing directly before starting. Never share passwords or sensitive financial details.</p></div>
        <footer>Rojgaar · Real local opportunities<br/>Your account and tasks are managed securely.</footer>
      </aside>}
    </main>}
    {showTaskModal && <div className="modal-backdrop" onMouseDown={() => setShowTaskModal(false)}><form className="modal" onSubmit={publishTask} onMouseDown={event => event.stopPropagation()}>
      <button type="button" className="close" onClick={() => setShowTaskModal(false)} aria-label="Close"><X/></button>
      <span className="category">NEW TASK</span><h2>What do you need?</h2><p>Describe the work clearly and set a fair reward.</p>
      <label className="auth-label">Task title<input required autoFocus minLength={5} maxLength={120} value={taskTitle} onChange={event => setTaskTitle(event.target.value)} placeholder="e.g. Help me assemble a desk"/></label>
      <label className="auth-label">Details<textarea required minLength={10} maxLength={2000} value={taskDescription} onChange={event => setTaskDescription(event.target.value)} placeholder="Describe the work, timing, and anything a helper should know"/></label>
      <div className="modal-row"><label>Reward in rupees<input required type="number" min="1" step="1" value={taskReward} onChange={event => setTaskReward(event.target.value)} placeholder="e.g. 700"/></label><label>Category<select value={taskCategory} onChange={event => setTaskCategory(event.target.value)}>{categories.map(category => <option key={category}>{category}</option>)}</select></label></div>
      <div className="modal-row"><label>City<input required maxLength={100} value={taskCity} onChange={event => setTaskCity(event.target.value)} placeholder="Your city"/></label><label>State<input maxLength={100} value={taskState} onChange={event => setTaskState(event.target.value)} placeholder="State (optional)"/></label></div>
      {error && <div className="form-message error-message" role="alert">{error}</div>}
      <button className="publish" disabled={savingTask}><Plus size={17}/>{savingTask ? 'Publishing…' : 'Publish task'}</button>
    </form></div>}
    {showPremiumModal && <div className="modal-backdrop" onMouseDown={() => setShowPremiumModal(false)}><section className="modal premium-modal" onMouseDown={event => event.stopPropagation()}>
      <button className="close" onClick={() => setShowPremiumModal(false)} aria-label="Close"><X/></button>
      <span className="premium-modal-icon"><Crown size={25}/></span>
      <span className="premium-kicker">ROJGAAR PREMIUM</span>
      <h2>Make your next move count.</h2>
      <p>This monthly plan is a preview of proposed tools to help you make the most of every opportunity.</p>
      <div className="premium-benefits">
        <div><ShieldCheck size={17}/><span><strong>Premium profile badge</strong><small>Show clients you are serious about your work.</small></span></div>
        <div><Search size={17}/><span><strong>Stand out in discovery</strong><small>Get noticed by people looking for your skills.</small></span></div>
        <div><BriefcaseBusiness size={17}/><span><strong>More opportunity insights</strong><small>Keep your work and applications easy to track.</small></span></div>
      </div>
      <div className="premium-checkout"><div><small>MONTHLY PLAN</small><strong>₹99 <span>/ month</span></strong></div><button disabled title="Payment gateway is not connected">Payments coming soon</button></div>
      <p className="premium-note">Plan preview only. Payment setup is required before subscriptions can be purchased.</p>
    </section></div>}
  </>;
}

createRoot(document.getElementById('root')).render(<App/>);
