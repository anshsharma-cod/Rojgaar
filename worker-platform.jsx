import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { toPng } from 'html-to-image';
import {
  ArrowLeft, AudioLines, BadgeCheck, Camera, Check, ChevronRight, CircleAlert,
  Clock3, Globe2, Headphones, MapPin, MessageCircle, Mic, Navigation,
  Pause, Play, Plus, QrCode, Search, Send, Shield, UserRound, Wallet, X
} from 'lucide-react';
import { supabase } from './supabase.js';
import { validVerhoeff } from './supabase/functions/_shared/id-validation.js';

const skills = ['Plumber', 'Electrician', 'Carpenter', 'Cleaner', 'Cook', 'Tutor', 'Driver', 'Delivery helper', 'Mechanic', 'Gardener', 'Tailor', 'Web developer', 'Designer', 'Other'];
const draftKey = userId => `rojgaar-worker-draft:${userId}`;

const copy = {
  en: {
    directory: 'Find local help', enroll: 'Join as a worker', myId: 'My digital ID', myWork: 'My work',
    install: 'Install app', offline: 'Offline · safe draft saved',
    available: 'Available today', busy: 'Busy today', search: 'Skill, district or PIN code',
    category: 'Skill', district: 'District', maxRate: 'Max daily rate', availableOnly: 'Available today only',
    contact: 'Contact', verified: 'ID not verified', registered: 'Registered worker', experience: 'experience',
    perDay: '/ day', chat: 'Chat & negotiate', book: 'Book / pay', empty: 'No workers found yet',
    enrollTitle: 'Create your worker profile', secureNote: 'Your complete ID number is checked securely and discarded. Only its last 4 digits are retained. This is not identity verification.',
    mobileUnverified: 'Mobile number is not SMS-verified in this version. We only check that it is not already enrolled.',
    publicConsent: 'I agree to display my name, skill, work area, rate, and photo in the public worker directory.',
    next: 'Continue', back: 'Back', submit: 'Submit enrollment', submitted: 'Enrollment submitted',
    fullName: 'Full name', mobile: '10-digit mobile number', id: '12-digit ID number',
    skillRate: 'Skill / service', rate: 'Daily rate (₹)', years: 'Experience (years)',
    pincode: 'PIN code', districtName: 'District', state: 'State', upi: 'UPI ID',
    profilePhoto: 'Profile photo', capture: 'Take photo', upload: 'Upload photo', audioBio: '15-second voice introduction',
    record: 'Record introduction', stop: 'Stop recording', listen: 'Listen to this step',
    locating: 'Looking up PIN code…', useCamera: 'Start camera', usePhoto: 'Capture photo', cameraDenied: 'Camera permission is unavailable. Upload a photo instead.',
    status: 'Enrollment status', submittedStatus: 'Submitted — identity is unverified',
    cardDownload: 'Download ID card', print: 'Print ID card', changeAvailability: 'Set availability',
    choose: 'Choose', any: 'Any', experienceYears: 'years experience', lastFour: 'ID ending',
    makeOffer: 'Make an offer', offerAmount: 'Offer amount (₹)', jobDetails: 'What work needs doing?',
    sendOffer: 'Send offer', accept: 'Accept offer', counter: 'Counter offer', acceptCounter: 'Accept counter',
    counterAmount: 'Counter amount (₹)', deal: 'Deal locked', pay: 'Pay agreed amount', directUpi: 'Pay worker directly with UPI',
    tokenPay: 'Pay through Razorpay', noEscrow: 'Razorpay charges the agreed amount; this is not escrow and does not hold funds for later release.',
    whatsapp: 'Continue on WhatsApp', shareLocation: 'Share current location', voiceNote: 'Record voice note',
    enterMessage: 'Write a message…', send: 'Send', noMessages: 'Start a conversation and agree on the work.',
    completionCode: 'Issue completion code', enterCode: 'Enter the worker’s 6-digit completion code', verifyCode: 'Confirm work completed',
    paid: 'Payment confirmed', complete: 'Work completed', directWarning: 'Direct UPI payments cannot be verified or reversed by Rojgaar.',
    iHavePaid: 'I have sent the UPI payment',
    confirmReceived: 'Confirm UPI received',
    awaitingUpi: 'Waiting for the worker to confirm receipt. Do not mark as paid until funds arrive.',
    nameRequired: 'Enter your full name.', invalidMobile: 'Enter a valid Indian 10-digit mobile number.',
    invalidId: 'This number did not pass the ID format check. It is not proof of identity.',
    savedOffline: 'Draft saved on this device. Sensitive ID/mobile/UPI details are not saved offline.',
    syncing: 'Back online — syncing enrollment…', duplicate: 'That mobile number or ID is already enrolled.',
    profileMissing: 'Please finish your worker enrollment first.', networkError: 'Could not connect. Your non-sensitive draft is saved on this device.',
    registration: 'Registration ID', idDisclaimer: 'Registration ID only — not an Aadhaar card or government identity proof.',
  },
  hi: {
    directory: 'आस-पास कामगार खोजें', enroll: 'कामगार के रूप में जुड़ें', myId: 'मेरा डिजिटल आईडी', myWork: 'मेरा काम',
    install: 'ऐप इंस्टॉल करें', offline: 'ऑफ़लाइन · सुरक्षित ड्राफ़्ट सेव',
    available: 'आज उपलब्ध', busy: 'आज व्यस्त', search: 'कौशल, ज़िला या पिनकोड खोजें',
    category: 'कौशल', district: 'ज़िला', maxRate: 'अधिकतम दैनिक दर', availableOnly: 'केवल आज उपलब्ध',
    contact: 'संपर्क', verified: 'आईडी सत्यापित नहीं', registered: 'पंजीकृत कामगार', experience: 'अनुभव',
    perDay: '/ दिन', chat: 'बात करें और मोल-भाव करें', book: 'बुक / भुगतान', empty: 'अभी कोई कामगार नहीं मिला',
    enrollTitle: 'अपनी कामगार प्रोफ़ाइल बनाएँ', secureNote: 'आपका पूरा आईडी नंबर सुरक्षित रूप से जाँचकर तुरंत हटा दिया जाता है। केवल आख़िरी 4 अंक रखे जाते हैं। यह पहचान सत्यापन नहीं है।',
    mobileUnverified: 'इस संस्करण में मोबाइल नंबर SMS से सत्यापित नहीं है। केवल पहले से उपयोग हुआ नंबर जाँचा जाता है।',
    publicConsent: 'मैं अपना नाम, कौशल, काम की जगह, दर और फ़ोटो सार्वजनिक कामगार सूची में दिखाने के लिए सहमत हूँ।',
    next: 'आगे बढ़ें', back: 'वापस', submit: 'नामांकन भेजें', submitted: 'नामांकन भेज दिया गया',
    fullName: 'पूरा नाम', mobile: '10 अंकों का मोबाइल नंबर', id: '12 अंकों का आईडी नंबर',
    skillRate: 'कौशल / सेवा', rate: 'दैनिक दर (₹)', years: 'अनुभव (वर्ष)',
    pincode: 'पिनकोड', districtName: 'ज़िला', state: 'राज्य', upi: 'UPI आईडी',
    profilePhoto: 'प्रोफ़ाइल फ़ोटो', capture: 'फ़ोटो लें', upload: 'फ़ोटो अपलोड करें', audioBio: '15 सेकंड का परिचय',
    record: 'परिचय रिकॉर्ड करें', stop: 'रिकॉर्डिंग रोकें', listen: 'यह चरण सुनें',
    locating: 'पिनकोड खोज रहे हैं…', useCamera: 'कैमरा शुरू करें', usePhoto: 'फ़ोटो लें', cameraDenied: 'कैमरा उपलब्ध नहीं। कृपया फ़ोटो अपलोड करें।',
    status: 'नामांकन की स्थिति', submittedStatus: 'भेजा गया — पहचान सत्यापित नहीं',
    cardDownload: 'आईडी कार्ड डाउनलोड करें', print: 'आईडी कार्ड प्रिंट करें', changeAvailability: 'उपलब्धता बदलें',
    choose: 'चुनें', any: 'कोई भी', experienceYears: 'वर्ष का अनुभव', lastFour: 'आईडी के आख़िरी अंक',
    makeOffer: 'काम का प्रस्ताव दें', offerAmount: 'राशि (₹)', jobDetails: 'कौन-सा काम करवाना है?',
    sendOffer: 'प्रस्ताव भेजें', accept: 'प्रस्ताव स्वीकारें', counter: 'दूसरी राशि दें', acceptCounter: 'दूसरी राशि स्वीकारें',
    counterAmount: 'दूसरी राशि (₹)', deal: 'सहमति हो गई', pay: 'सहमति की राशि दें', directUpi: 'UPI से सीधे भुगतान करें',
    tokenPay: 'Razorpay से भुगतान करें', noEscrow: 'Razorpay पूरी सहमत राशि चार्ज करेगा; यह एस्क्रो नहीं है और राशि बाद में जारी करने के लिए नहीं रखी जाती।',
    whatsapp: 'WhatsApp पर जारी रखें', shareLocation: 'अपनी जगह भेजें', voiceNote: 'आवाज़ रिकॉर्ड करें',
    enterMessage: 'संदेश लिखें…', send: 'भेजें', noMessages: 'काम की बात शुरू करें और शर्तें तय करें।',
    completionCode: 'काम पूरा कोड बनाएँ', enterCode: 'कामगार का 6 अंकों का कोड डालें', verifyCode: 'काम पूरा होने की पुष्टि',
    paid: 'भुगतान की पुष्टि हुई', complete: 'काम पूरा हुआ', directWarning: 'सीधे UPI भुगतान की पुष्टि या वापसी Rojgaar नहीं कर सकता।',
    iHavePaid: 'मैंने UPI भुगतान भेज दिया',
    confirmReceived: 'UPI प्राप्त होने की पुष्टि करें',
    awaitingUpi: 'कामगार की पुष्टि का इंतज़ार है। राशि मिलने से पहले भुगतान की पुष्टि न करें।',
    nameRequired: 'पूरा नाम लिखें।', invalidMobile: 'सही 10 अंकों का भारतीय मोबाइल नंबर लिखें।',
    invalidId: 'आईडी नंबर का फ़ॉर्मैट सही नहीं है। यह पहचान का प्रमाण नहीं है।',
    savedOffline: 'ड्राफ़्ट इस डिवाइस पर सेव हुआ। संवेदनशील आईडी/मोबाइल/UPI सेव नहीं किए गए।',
    syncing: 'इंटरनेट लौट आया — नामांकन भेज रहे हैं…', duplicate: 'यह मोबाइल नंबर या आईडी पहले से नामांकित है।',
    profileMissing: 'पहले कामगार नामांकन पूरा करें।', networkError: 'कनेक्ट नहीं हुआ। गैर-संवेदनशील ड्राफ़्ट डिवाइस पर सेव है।',
    registration: 'पंजीकरण आईडी', idDisclaimer: 'यह केवल Rojgaar पंजीकरण आईडी है, सरकारी पहचान पत्र नहीं।',
  },
};

function useCopy(language) {
  return key => copy[language][key] || copy.en[key] || key;
}

function localSave(userId, values) {
  const { mobile, aadhaar, upi_id, photo, audio, photo_path, audio_path, ...safeDraft } = values;
  localStorage.setItem(draftKey(userId), JSON.stringify(safeDraft));
}

function savedString(value) {
  return typeof value === 'string' ? value : '';
}

function initials(name = '') {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0].toUpperCase()).join('') || 'R';
}

function mediaUrl(path) {
  if (!path) return '';
  return supabase.storage.from('worker-media').getPublicUrl(path).data.publicUrl;
}

async function functionError(data, error) {
  if (data?.error) return data.error;
  if (error?.context && typeof error.context.clone === 'function') {
    try {
      const body = await error.context.clone().json();
      if (body?.error) return body.error;
    } catch {
      return error.message || 'The server request failed.';
    }
  }
  return error?.message || 'The server request failed.';
}

function fileExtension(file) {
  const types = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'audio/webm': 'webm', 'audio/ogg': 'ogg', 'audio/mp4': 'm4a' };
  return types[file.type.split(';')[0]] || '';
}

function validUpload(file, kind) {
  const maxBytes = kind === 'photo' ? 5 * 1024 * 1024 : 10 * 1024 * 1024;
  const allowed = kind === 'photo' ? ['image/jpeg', 'image/png', 'image/webp'] : ['audio/webm', 'audio/ogg', 'audio/mp4'];
  return allowed.includes(file.type.split(';')[0]) && file.size <= maxBytes;
}

function getAudioDuration(file) {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    const objectUrl = URL.createObjectURL(file);
    const timeout = window.setTimeout(() => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Could not read the audio duration.'));
    }, 8000);
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => {
      window.clearTimeout(timeout);
      URL.revokeObjectURL(objectUrl);
      resolve(audio.duration);
    };
    audio.onerror = () => {
      window.clearTimeout(timeout);
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Could not read the audio file.'));
    };
    audio.src = objectUrl;
  });
}

function useRecorder(onStop, maxSeconds = 15) {
  const recorder = useRef(null);
  const chunks = useRef([]);
  const timer = useRef(null);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState('');
  const stop = useCallback(() => {
    if (recorder.current?.state === 'recording') recorder.current.stop();
    window.clearTimeout(timer.current);
    setRecording(false);
  }, []);
  const start = useCallback(async () => {
    setError('');
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setError('Audio recording is not supported in this browser.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const supportedType = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4']
        .find(type => MediaRecorder.isTypeSupported(type));
      const mediaRecorder = new MediaRecorder(stream, supportedType ? { mimeType: supportedType } : undefined);
      chunks.current = [];
      mediaRecorder.ondataavailable = event => { if (event.data.size) chunks.current.push(event.data); };
      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
        const type = (mediaRecorder.mimeType || 'audio/webm').split(';')[0];
        const blob = new Blob(chunks.current, { type });
        if (blob.size) onStop(new File([blob], `voice-${Date.now()}.${fileExtension(blob) || 'webm'}`, { type }));
      };
      recorder.current = mediaRecorder;
      mediaRecorder.start();
      setRecording(true);
      timer.current = window.setTimeout(() => {
        if (mediaRecorder.state === 'recording') mediaRecorder.stop();
        setRecording(false);
      }, maxSeconds * 1000);
    } catch (recordError) {
      setError(recordError.message || 'Microphone permission was denied.');
    }
  }, [maxSeconds, onStop]);
  useEffect(() => () => {
    window.clearTimeout(timer.current);
    if (recorder.current?.state === 'recording') recorder.current.stop();
  }, []);
  return { recording, error, start, stop };
}

function Enrollment({ userId, language, existing, onComplete, onCancel }) {
  const t = useCopy(language);
  const [step, setStep] = useState(0);
  const [values, setValues] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(draftKey(userId)) || '{}');
      return {
        full_name: savedString(saved.full_name),
        mobile: '',
        aadhaar: '',
        skill: savedString(saved.skill),
        daily_rate: savedString(saved.daily_rate),
        experience_years: savedString(saved.experience_years),
        pincode: savedString(saved.pincode),
        district: savedString(saved.district),
        state: savedString(saved.state),
        upi_id: '',
        photo: null,
        audio: null,
        photo_path: '',
        audio_path: '',
        publicConsent: Boolean(saved.publicConsent),
      };
    } catch {
      return { full_name: '', mobile: '', aadhaar: '', skill: '', daily_rate: '', experience_years: '', pincode: '', district: '', state: '', upi_id: '', photo: null, audio: null, photo_path: '', audio_path: '', publicConsent: false };
    }
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [pinBusy, setPinBusy] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [isOfflinePending, setIsOfflinePending] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const cameraStream = useRef(null);
  const filePhoto = useRef(null);
  const fileAudio = useRef(null);

  const set = useCallback((key, value) => setValues(current => ({ ...current, [key]: value })), []);
  useEffect(() => {
    try {
      localSave(userId, values);
    } catch (saveError) {
      setError(saveError.message || 'Could not save your offline draft.');
    }
  }, [values, userId]);

  const setVoice = useCallback(async file => {
    if (!validUpload(file, 'audio')) {
      setError('Use an OGG, WebM, or MP4 audio file up to 10 MB.');
      return;
    }
    try {
      if (await getAudioDuration(file) > 15.5) {
        setError('Voice bios must be 15 seconds or shorter.');
        return;
      }
    } catch (durationError) {
      setError(durationError.message);
      return;
    }
    set('audio', file);
  }, [set]);

  const voice = useRecorder(setVoice, 15);
  const photoPreview = useMemo(() => values.photo ? URL.createObjectURL(values.photo) : '', [values.photo]);
  const audioPreview = useMemo(() => values.audio ? URL.createObjectURL(values.audio) : '', [values.audio]);
  useEffect(() => () => {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    if (audioPreview) URL.revokeObjectURL(audioPreview);
  }, [photoPreview, audioPreview]);

  useEffect(() => {
    let active = true;
    if (values.pincode.length !== 6) return undefined;
    const timer = window.setTimeout(async () => {
      setPinBusy(true);
      try {
        const { data: postOffice, error: lookupError } = await supabase.functions.invoke('lookup-pincode', { body: { pincode: values.pincode } });
        if (lookupError || postOffice?.error) throw new Error(await functionError(postOffice, lookupError));
        if (active) setValues(current => {
          const next = { ...current, district: postOffice.district || '', state: postOffice.state || '' };
          return next;
        });
      } catch (lookupError) {
        if (active) setError(lookupError.message || 'Could not look up this pincode.');
      } finally {
        if (active) setPinBusy(false);
      }
    }, 350);
    return () => { active = false; window.clearTimeout(timer); };
  }, [values.pincode, userId]);

  useEffect(() => {
    const stream = cameraStream.current;
    return () => stream?.getTracks().forEach(track => track.stop());
  }, []);

  const startCamera = async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      cameraStream.current = stream;
      setCameraOpen(true);
      if (videoRef.current) videoRef.current.srcObject = stream;
      requestAnimationFrame(() => { if (videoRef.current) videoRef.current.srcObject = stream; });
    } catch {
      setError(t('cameraDenied'));
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !video.videoWidth) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    canvas.toBlob(blob => {
      if (!blob) {
        setError('Could not capture photo.');
        return;
      }
      const captured = new File([blob], `worker-${Date.now()}.jpg`, { type: 'image/jpeg' });
      set('photo', captured);
      cameraStream.current?.getTracks().forEach(track => track.stop());
      cameraStream.current = null;
      setCameraOpen(false);
    }, 'image/jpeg', 0.88);
  };

  const validateStep = () => {
    setError('');
    if (step === 0) {
      if (values.full_name.trim().length < 2) return setError(t('nameRequired')), false;
      if (!/^[6-9]\d{9}$/.test(values.mobile)) return setError(t('invalidMobile')), false;
      if (!validVerhoeff(values.aadhaar)) return setError(t('invalidId')), false;
      if (!values.skill || Number(values.daily_rate) <= 0 || Number(values.experience_years) < 0) return setError('Choose a skill and enter a valid rate and experience.'), false;
    }
    if (step === 1 && (!/^\d{6}$/.test(values.pincode) || !values.district.trim() || !values.state.trim() || !/^[A-Za-z0-9._-]{2,}@[A-Za-z0-9.-]{2,}$/.test(values.upi_id))) {
      setError('Enter a valid pincode, district, state, and UPI ID.');
      return false;
    }
    if (step === 2 && !values.photo) {
      setError('Add a profile photo to continue.');
      return false;
    }
    if (step === 2 && values.audio && !values.audioConsent) {
      setError(language === 'hi' ? 'सार्वजनिक ऑडियो के लिए सहमति ज़रूरी है।' : 'Consent is required to publish an audio bio.');
      return false;
    }
    if (step === 2 && !values.publicConsent) {
      setError(language === 'hi' ? 'सार्वजनिक प्रोफ़ाइल के लिए सहमति ज़रूरी है।' : 'Consent is required to publish your worker profile.');
      return false;
    }
    return true;
  };

  const submit = async () => {
    if (!validateStep()) return;
    setBusy(true);
    setError('');
    const uploadedPaths = [];
    try {
      const photoExt = fileExtension(values.photo);
      if (!photoExt) throw new Error('Photo must be JPEG, PNG, or WebP.');
      const photoPath = `${userId}/profile-${Date.now()}.${photoExt}`;
      const { error: photoError } = await supabase.storage.from('worker-media').upload(photoPath, values.photo, { upsert: false, contentType: values.photo.type });
      if (photoError) throw photoError;
      uploadedPaths.push(photoPath);
      let audioPath = '';
      if (values.audio) {
        const audioExt = fileExtension(values.audio);
        if (!audioExt) throw new Error('Voice bio format is not supported. Record it again or upload an OGG, WebM, or MP4 file.');
        audioPath = `${userId}/bio-${Date.now()}.${audioExt}`;
        const { error: audioError } = await supabase.storage.from('worker-media').upload(audioPath, values.audio, { upsert: false, contentType: values.audio.type });
        if (audioError) throw audioError;
        uploadedPaths.push(audioPath);
      }
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session) throw new Error('Please sign in again before submitting.');
      const { data, error: enrollmentError } = await supabase.functions.invoke('enroll-worker', {
        body: {
          full_name: values.full_name.trim(),
          mobile: values.mobile,
          aadhaar: values.aadhaar,
          upi_id: values.upi_id.trim(),
          skill: values.skill,
          daily_rate: Number(values.daily_rate),
          experience_years: Number(values.experience_years),
          pincode: values.pincode,
          district: values.district,
          state: values.state,
          photo_path: photoPath,
          audio_path: audioPath,
        },
        headers: { Authorization: `Bearer ${sessionData.session.access_token}` },
      });
      if (enrollmentError || data?.error) {
        const message = await functionError(data, enrollmentError);
        if (message.toLowerCase().includes('already enrolled')) throw new Error(t('duplicate'));
        throw new Error(message);
      }
      if (data.reused && uploadedPaths.length) {
        const { error: cleanupError } = await supabase.storage.from('worker-media').remove(uploadedPaths);
        if (cleanupError) console.error('Could not remove retried enrollment media', cleanupError.message);
      }
      localStorage.removeItem(draftKey(userId));
      setIsOfflinePending(false);
      onComplete(data.enrollment);
    } catch (submitError) {
      if (uploadedPaths.length) {
        const { error: cleanupError } = await supabase.storage.from('worker-media').remove(uploadedPaths);
        if (cleanupError) console.error('Could not remove incomplete enrollment media', cleanupError.message);
      }
      setError(navigator.onLine ? (submitError.message || 'Could not submit enrollment.') : t('networkError'));
      if (!navigator.onLine) setIsOfflinePending(true);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!isOfflinePending) return undefined;
    const retry = () => {
      if (navigator.onLine && values.aadhaar && values.mobile && values.upi_id && values.photo) submit();
    };
    window.addEventListener('online', retry);
    return () => window.removeEventListener('online', retry);
  }, [isOfflinePending, values]);

  const listen = () => {
    if (!window.speechSynthesis) {
      setError('Text-to-speech is not supported in this browser.');
      return;
    }
    const text = language === 'hi'
      ? 'अपना कौशल, अनुभव और काम की जगह भरें। पूरा आधार नंबर सेव नहीं किया जाता।'
      : 'Enter your skill, experience, and work location. Your full ID number is never stored.';
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language === 'hi' ? 'hi-IN' : 'en-IN';
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  if (existing) return <section className="worker-panel">
    <div className="worker-panel-heading"><button className="text-back" onClick={onCancel}><ArrowLeft size={17}/> {t('directory')}</button><h1>{t('status')}</h1></div>
    <p className="form-message success-message">{t('submittedStatus')}: <strong>{existing.enrollment_status.replaceAll('_', ' ')}</strong></p>
    <DigitalId worker={existing} language={language} onAvailability={async value => {
      const { error: updateError } = await supabase.from('worker_directory').update({ is_available: value }).eq('user_id', userId);
      if (updateError) setError(updateError.message);
      else onComplete({ ...existing, is_available: value });
    }} />
  </section>;

  return <section className="worker-panel enrollment-panel">
    <div className="worker-panel-heading">
      <button className="text-back" onClick={onCancel}><ArrowLeft size={17}/> {t('directory')}</button>
      <button className="listen-button" onClick={listen}><Headphones size={16}/> {t('listen')}</button>
    </div>
    <div className="enrollment-title"><span className="eyebrow"><Shield size={14}/> {t('enroll')}</span><h1>{t('enrollTitle')}</h1><p>{t('secureNote')}</p></div>
    <div className="step-indicator"><span className={step >= 0 ? 'current' : ''}>1</span><i/><span className={step >= 1 ? 'current' : ''}>2</span><i/><span className={step >= 2 ? 'current' : ''}>3</span></div>
    <p className="offline-save-note"><Clock3 size={15}/>{isOfflinePending ? t('syncing') : t('savedOffline')}</p>
    {error && <div className="form-message error-message" role="alert"><CircleAlert size={16}/>{error}</div>}
    {step === 0 && <div className="enrollment-grid">
      <label className="auth-label">{t('fullName')}<input required maxLength={80} value={values.full_name} onChange={event => set('full_name', event.target.value)}/></label>
      <label className="auth-label">{t('mobile')}<input required inputMode="numeric" autoComplete="tel-national" maxLength={10} value={values.mobile} onChange={event => set('mobile', event.target.value.replace(/\D/g, '').slice(0, 10))}/><small>{t('mobileUnverified')}</small></label>
      <label className="auth-label id-field">{t('id')}<input required type="password" inputMode="numeric" autoComplete="off" maxLength={12} value={values.aadhaar} onChange={event => set('aadhaar', event.target.value.replace(/\D/g, '').slice(0, 12))}/><small>{t('secureNote')}</small></label>
      <label className="auth-label">{t('skillRate')}<select value={values.skill} onChange={event => set('skill', event.target.value)}><option value="">{t('choose')}</option>{skills.map(skill => <option key={skill}>{skill}</option>)}</select></label>
      <label className="auth-label">{t('rate')}<input required type="number" min="1" step="1" value={values.daily_rate} onChange={event => set('daily_rate', event.target.value)}/></label>
      <label className="auth-label">{t('years')}<input required type="number" min="0" max="80" step="0.5" value={values.experience_years} onChange={event => set('experience_years', event.target.value)}/></label>
    </div>}
    {step === 1 && <div className="enrollment-grid">
      <label className="auth-label">{t('pincode')}<input required inputMode="numeric" maxLength={6} value={values.pincode} onChange={event => set('pincode', event.target.value.replace(/\D/g, '').slice(0, 6))}/>{pinBusy && <small>{t('locating')}</small>}</label>
      <label className="auth-label">{t('districtName')}<input required value={values.district} onChange={event => set('district', event.target.value)}/></label>
      <label className="auth-label">{t('state')}<input required value={values.state} onChange={event => set('state', event.target.value)}/></label>
      <label className="auth-label">{t('upi')}<input required autoComplete="off" placeholder="name@bank" value={values.upi_id} onChange={event => set('upi_id', event.target.value)}/><small>Your UPI ID is private; shown only to the customer after an accepted booking.</small></label>
    </div>}
    {step === 2 && <div className="enrollment-grid media-enrollment">
      <div className="auth-label media-field"><span>{t('profilePhoto')}</span>
        {values.photo && <img className="photo-preview" src={photoPreview} alt="Profile preview"/>}
        {cameraOpen ? <div className="camera-view"><video ref={videoRef} autoPlay playsInline/><button type="button" className="publish" onClick={capturePhoto}><Camera size={16}/>{t('usePhoto')}</button></div> : <div className="media-actions"><button type="button" className="secondary-button" onClick={startCamera}><Camera size={16}/>{t('capture')}</button><button type="button" className="secondary-button" onClick={() => filePhoto.current?.click()}><Plus size={16}/>{t('upload')}</button><input ref={filePhoto} hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={event => { const file = event.target.files?.[0]; if (!file) return; if (!validUpload(file, 'photo')) return setError('Upload a JPEG, PNG, or WebP image up to 5 MB.'); set('photo', file); }}/></div>}
        <canvas ref={canvasRef} hidden/>
      </div>
      <div className="auth-label media-field"><span>{t('audioBio')}</span><p className="audio-hint"><AudioLines size={17}/> Optional. Speak in Hindi or English; audio can be heard by anyone viewing your public worker card.</p>
        <div className="media-actions"><button type="button" className="secondary-button" onClick={voice.recording ? voice.stop : voice.start}>{voice.recording ? <Pause size={16}/> : <Mic size={16}/>} {voice.recording ? t('stop') : t('record')}</button><button type="button" className="secondary-button" onClick={() => fileAudio.current?.click()}>Upload audio</button><input ref={fileAudio} hidden type="file" accept="audio/webm,audio/ogg,audio/mp4" onChange={event => { const file = event.target.files?.[0]; if (file) setVoice(file); }}/></div>
        {values.audio && <audio controls src={audioPreview}/>}
        {values.audio && <label className="public-audio-consent"><input type="checkbox" checked={values.audioConsent || false} onChange={event => set('audioConsent', event.target.checked)}/>{language === 'hi' ? 'मैं इस ऑडियो को सार्वजनिक रूप से साझा करने की सहमति देता/देती हूँ।' : 'I agree to make this audio bio publicly accessible.'}</label>}
        {voice.error && <small className="field-error">{voice.error}</small>}
      </div>
      <label className="public-audio-consent"><input type="checkbox" checked={values.publicConsent || false} onChange={event => set('publicConsent', event.target.checked)}/>{t('publicConsent')}</label>
    </div>}
    <div className="enrollment-actions">
      {step > 0 && <button className="secondary-button" onClick={() => { setError(''); setStep(current => current - 1); }}>{t('back')}</button>}
      {step < 2 ? <button className="publish" onClick={() => { if (validateStep()) setStep(current => current + 1); }}>{t('next')}<ChevronRight size={17}/></button>
        : <button className="publish" disabled={busy} onClick={submit}><Check size={17}/>{busy ? '…' : t('submit')}</button>}
    </div>
    <p className="id-privacy-note"><Shield size={14}/>{language === 'hi' ? 'पूरा आईडी नंबर सिर्फ सुरक्षित सर्वर तक भेजा जाता है, HMAC डुप्लीकेट जाँच के बाद हटा दिया जाता है। डेटाबेस में केवल HMAC और आख़िरी 4 अंक रखे जाते हैं।' : 'The full ID travels only to the secure server and is discarded after keyed-HMAC duplicate checking. The database retains only the HMAC and last four digits.'}</p>
  </section>;
}

function DigitalId({ worker, language, onAvailability }) {
  const t = useCopy(language);
  const cardRef = useRef(null);
  const [error, setError] = useState('');
  const download = async () => {
    if (!cardRef.current) return;
    try {
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 2, cacheBust: true });
      const anchor = document.createElement('a');
      anchor.download = `${worker.registration_id}.png`;
      anchor.href = dataUrl;
      anchor.click();
    } catch (downloadError) {
      setError(downloadError.message || 'Could not download ID card.');
    }
  };
  const verificationLabel = language === 'hi' ? 'आईडी सत्यापित नहीं' : 'ID unverified';
  return <div className="digital-id-wrap">
    <div className="digital-id" ref={cardRef}>
      <div className="id-card-top"><div className="id-brand"><i>R</i><span>ROJGAAR <small>WORKER ID</small></span></div><span className="id-unverified"><Shield size={13}/>{verificationLabel}</span></div>
      <div className="id-card-main">
        {worker.photo_path ? <img className="id-photo" src={mediaUrl(worker.photo_path)} alt="Worker"/> : <span className="id-photo id-avatar">{initials(worker.full_name)}</span>}
        <div className="id-card-person"><span className="id-registration">{worker.registration_id}</span><h2>{worker.full_name}</h2><strong>{worker.skill}</strong><span>{worker.district}, {worker.state}</span><span>₹{Number(worker.daily_rate).toLocaleString('en-IN')} / {language === 'hi' ? 'दिन' : 'day'}</span><small>{worker.experience_years} {language === 'hi' ? 'वर्ष अनुभव' : 'years experience'}</small></div>
        <div className="id-qr"><QRCodeSVG value={`${window.location.origin}/?worker=${encodeURIComponent(worker.user_id)}`} size={86} level="M" includeMargin/></div>
      </div>
      <div className="id-card-footer"><span>rojgaar · local work community</span><span>{verificationLabel.toUpperCase()}</span></div>
    </div>
    <p className="id-disclaimer"><Shield size={15}/>{t('idDisclaimer')}</p>
    {error && <div className="form-message error-message">{error}</div>}
    <div className="digital-id-actions"><button className="publish" onClick={download}><QrCode size={16}/>{t('cardDownload')}</button><button className="secondary-button" onClick={() => window.print()}>{t('print')}</button></div>
    <div className="enrollment-status"><span>{t('status')}</span><strong><Clock3 size={15}/>{worker.enrollment_status.replaceAll('_', ' ')}</strong></div>
    <button className={`availability-switch ${worker.is_available ? 'on' : ''}`} onClick={() => onAvailability(!worker.is_available)}><span className="availability-dot"/>{worker.is_available ? t('available') : t('busy')}</button>
  </div>;
}

function WorkerCard({ worker, language, onChat }) {
  const t = useCopy(language);
  return <article className="worker-card" id={`worker-${worker.user_id}`}>
    <div className="worker-card-head">
      {worker.photo_path ? <img className="worker-avatar" src={mediaUrl(worker.photo_path)} alt=""/> : <span className="worker-avatar worker-avatar-fallback">{initials(worker.full_name)}</span>}
      <div className="worker-card-name"><h3>{worker.full_name}</h3><span><BadgeCheck size={14}/>{t('registered')}</span></div>
      <span className={`available-status ${worker.is_available ? 'available' : ''}`}><i/>{worker.is_available ? t('available') : t('busy')}</span>
    </div>
    <div className="worker-card-info"><strong>{worker.skill}</strong><span>{worker.district}, {worker.state} · {worker.pincode}</span><span>{worker.experience_years} {t('experience')}</span></div>
    {worker.audio_path && <audio className="worker-bio-player" controls preload="none" src={mediaUrl(worker.audio_path)} aria-label={t('audioBio')}/>}
    <div className="worker-card-bottom"><span className="worker-rate">₹{Number(worker.daily_rate).toLocaleString('en-IN')} <small>{t('perDay')}</small></span><span className="masked-contact">{worker.masked_mobile}</span></div>
    <div className="worker-card-actions"><button className="secondary-button" onClick={() => onChat(worker)}><MessageCircle size={16}/>{t('chat')}</button><button className="publish" onClick={() => onChat(worker)}><Wallet size={16}/>{t('book')}</button></div>
  </article>;
}

function Directory({ userId, language, onEnroll, onChat }) {
  const t = useCopy(language);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [skill, setSkill] = useState('');
  const [district, setDistrict] = useState('');
  const [maxRate, setMaxRate] = useState('');
  const [availableOnly, setAvailableOnly] = useState(false);
  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    const { data, error: queryError } = await supabase.from('worker_directory')
      .select('user_id, registration_id, full_name, masked_mobile, skill, daily_rate, experience_years, pincode, district, state, photo_path, audio_path, is_available, enrollment_status')
      .in('enrollment_status', ['submitted', 'under_review', 'approved'])
      .order('created_at', { ascending: false }).limit(200);
    if (queryError) setError(queryError.message);
    else setWorkers(data || []);
    setLoading(false);
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    const target = new URLSearchParams(window.location.search).get('worker');
    if (!target || loading) return;
    window.setTimeout(() => document.getElementById(`worker-${target}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
  }, [loading, workers]);

  const filtered = useMemo(() => workers.filter(worker => worker.user_id !== userId).filter(worker => {
    const term = search.trim().toLowerCase();
    const matchesText = !term || `${worker.full_name} ${worker.skill} ${worker.district} ${worker.state} ${worker.pincode}`.toLowerCase().includes(term);
    return matchesText
      && (!skill || worker.skill === skill)
      && (!district || `${worker.district}, ${worker.state}` === district)
      && (!maxRate || Number(worker.daily_rate) <= Number(maxRate))
      && (!availableOnly || worker.is_available);
  }), [workers, search, skill, district, maxRate, availableOnly, userId]);
  const districts = [...new Set(workers.map(worker => `${worker.district}, ${worker.state}`))].sort();
  const uniqueSkills = [...new Set(workers.map(worker => worker.skill))].sort();

  return <section className="worker-panel directory-panel">
    <div className="worker-panel-heading"><div><span className="eyebrow"><Globe2 size={14}/> ROJGAAR WORKERS</span><h1>{t('directory')}</h1></div><button className="publish" onClick={onEnroll}><Plus size={17}/>{t('enroll')}</button></div>
    <div className="directory-filters">
      <label className="search worker-search"><Search size={16}/><input aria-label={t('search')} placeholder={t('search')} value={search} onChange={event => setSearch(event.target.value)}/></label>
      <select aria-label={t('category')} value={skill} onChange={event => setSkill(event.target.value)}><option value="">{t('any')} {t('category')}</option>{uniqueSkills.map(value => <option key={value}>{value}</option>)}</select>
      <select aria-label={t('district')} value={district} onChange={event => setDistrict(event.target.value)}><option value="">{t('any')} {t('district')}</option>{districts.map(value => <option key={value}>{value}</option>)}</select>
      <label className="rate-filter"><span>{t('maxRate')}</span><input type="number" min="1" value={maxRate} onChange={event => setMaxRate(event.target.value)}/></label>
      <label className="availability-filter"><input type="checkbox" checked={availableOnly} onChange={event => setAvailableOnly(event.target.checked)}/>{t('availableOnly')}</label>
    </div>
    {error && <div className="form-message error-message" role="alert">{error}</div>}
    {loading ? <div className="no-job-found">Loading workers…</div> : filtered.length ? <div className="worker-grid">{filtered.map(worker => <WorkerCard key={worker.user_id} worker={worker} language={language} onChat={onChat}/>)}</div>
      : <div className="no-job-found"><UserRound size={25}/><h3>{t('empty')}</h3><p>{language === 'hi' ? 'फ़िल्टर बदलें या कामगार के रूप में सबसे पहले जुड़ें।' : 'Adjust your filters or be the first to enroll.'}</p><button className="publish" onClick={onEnroll}><Plus size={16}/>{t('enroll')}</button></div>}
  </section>;
}

async function loadRazorpay() {
  if (window.Razorpay) return true;
  return new Promise(resolve => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(Boolean(window.Razorpay));
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function Chat({ worker, userId, language, onClose, initialConversation = null }) {
  const t = useCopy(language);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [message, setMessage] = useState('');
  const [offer, setOffer] = useState('');
  const [description, setDescription] = useState('');
  const [counterBooking, setCounterBooking] = useState(null);
  const [counterAmount, setCounterAmount] = useState('');
  const [completionBooking, setCompletionBooking] = useState(null);
  const [completionCode, setCompletionCode] = useState('');
  const [issuedCode, setIssuedCode] = useState('');
  const [upi, setUpi] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [voiceFile, setVoiceFile] = useState(null);
  const listRef = useRef(null);
  const voice = useRecorder(setVoiceFile, 30);
  const channelRef = useRef(null);

  const refresh = useCallback(async id => {
    const [messageResult, bookingResult] = await Promise.all([
      supabase.from('messages').select('*').eq('conversation_id', id).order('created_at'),
      supabase.from('bookings').select('*').eq('conversation_id', id).order('created_at', { ascending: false }),
    ]);
    if (messageResult.error || bookingResult.error) {
      setError(messageResult.error?.message || bookingResult.error?.message || 'Could not refresh chat.');
      return;
    }
    setMessages(messageResult.data || []);
    setBookings(bookingResult.data || []);
  }, []);

  useEffect(() => {
    let active = true;
    const opening = initialConversation
      ? Promise.resolve({ data: initialConversation, error: null })
      : supabase.rpc('start_worker_conversation', { p_worker_id: worker.user_id });
    opening.then(async ({ data, error: startError }) => {
      if (!active) return;
      if (startError) {
        setError(startError.message);
        return;
      }
      setConversation(data);
      await refresh(data.id);
      const channel = supabase.channel(`conversation:${data.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `conversation_id=eq.${data.id}` }, () => refresh(data.id))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings', filter: `conversation_id=eq.${data.id}` }, () => refresh(data.id))
        .subscribe();
      channelRef.current = channel;
    });
    return () => {
      active = false;
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [worker.user_id, refresh]);

  useEffect(() => { if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight; }, [messages, bookings]);

  const sendMessage = async (content, type = 'text', metadata = {}) => {
    if (!conversation || (!content.trim() && type === 'text')) return;
    setBusy(true);
    setError('');
    const { error: sendError } = await supabase.from('messages').insert({
      conversation_id: conversation.id, sender_id: userId, message_type: type, content, metadata,
    });
    if (sendError) setError(sendError.message);
    else {
      setMessage('');
      setVoiceFile(null);
      await refresh(conversation.id);
    }
    setBusy(false);
  };

  const sendOffer = async event => {
    event.preventDefault();
    if (!conversation) return;
    setBusy(true);
    setError('');
    const { data, error: offerError } = await supabase.rpc('start_booking_offer', {
      p_conversation_id: conversation.id, p_amount: Number(offer), p_description: description.trim(),
    });
    if (offerError) setError(offerError.message);
    else {
      await sendMessage(`${t('makeOffer')}: ₹${Number(data.offer_amount).toLocaleString('en-IN')} — ${data.task_description}`, 'offer', { booking_id: data.id, amount: data.offer_amount, status: data.status });
      setOffer('');
      setDescription('');
    }
    setBusy(false);
  };

  const respond = async (booking, action, amount = null) => {
    setBusy(true);
    const { data, error: responseError } = await supabase.rpc('respond_to_booking_offer', {
      p_booking_id: booking.id, p_action: action, p_counter_amount: amount,
    });
    if (responseError) setError(responseError.message);
    else {
      await sendMessage(action === 'accept' ? t('deal') : `${t('counter')}: ₹${Number(data.counter_amount).toLocaleString('en-IN')}`, 'text', { booking_id: booking.id, status: data.status, amount: data.counter_amount });
      setCounterBooking(null);
      await refresh(conversation.id);
    }
    setBusy(false);
  };

  const acceptCounter = async booking => {
    setBusy(true);
    const { error: acceptError } = await supabase.rpc('accept_booking_counter', { p_booking_id: booking.id });
    if (acceptError) setError(acceptError.message);
    else {
      await sendMessage(t('deal'), 'text', { booking_id: booking.id, status: 'accepted' });
      await refresh(conversation.id);
    }
    setBusy(false);
  };

  const payRazorpay = async booking => {
    setBusy(true);
    setError('');
    const ready = await loadRazorpay();
    if (!ready) {
      setBusy(false);
      setError('Razorpay Checkout could not be loaded. Check your connection and try again.');
      return;
    }
    const { data: order, error: orderError } = await supabase.functions.invoke('razorpay-order', { body: { booking_id: booking.id } });
    if (orderError || order?.error) {
      setBusy(false);
      setError(await functionError(order, orderError));
      return;
    }
    const checkout = new window.Razorpay({
      key: order.key_id,
      order_id: order.order_id,
      amount: order.amount,
      currency: order.currency,
      name: 'Rojgaar',
      description: order.description,
      handler: async response => {
        const { data, error: verifyError } = await supabase.functions.invoke('razorpay-verify', { body: { booking_id: booking.id, ...response } });
        if (verifyError || data?.error) setError(await functionError(data, verifyError));
        else {
          setNotice(t('paid'));
          await refresh(conversation.id);
        }
        setBusy(false);
      },
      modal: { ondismiss: () => setBusy(false) },
      theme: { color: '#e34250' },
    });
    checkout.on('payment.failed', response => {
      setError(response.error?.description || 'Payment was not completed.');
      setBusy(false);
    });
    checkout.open();
  };

  const directUpi = async booking => {
    setBusy(true);
    setError('');
    const { error: selectError } = await supabase.rpc('select_direct_upi_payment', { p_booking_id: booking.id });
    if (selectError) {
      setError(selectError.message);
      setBusy(false);
      return;
    }
    const { data, error: upiError } = await supabase.functions.invoke('booking-upi', { body: { booking_id: booking.id } });
    if (upiError || data?.error) {
      setError(await functionError(data, upiError));
      setBusy(false);
      return;
    }
    const uri = new URLSearchParams({
      pa: data.upi_id,
      pn: worker.full_name,
      am: Number(booking.offer_amount).toFixed(2),
      cu: 'INR',
      tn: `Rojgaar ${booking.id.slice(0, 8)}`,
    });
    setUpi({ uri: `upi://pay?${uri.toString()}`, amount: booking.offer_amount, worker: worker.full_name, booking });
    setBusy(false);
  };

  const claimUpiPayment = async booking => {
    setBusy(true);
    const { error: claimError } = await supabase.rpc('claim_direct_upi_payment', { p_booking_id: booking.id });
    if (claimError) setError(claimError.message);
    else {
      setNotice(t('awaitingUpi'));
      setUpi(null);
      await refresh(conversation.id);
    }
    setBusy(false);
  };

  const confirmUpiPayment = async booking => {
    setBusy(true);
    const { error: confirmError } = await supabase.rpc('confirm_direct_upi_payment', { p_booking_id: booking.id });
    if (confirmError) setError(confirmError.message);
    else {
      setNotice(t('paid'));
      await refresh(conversation.id);
    }
    setBusy(false);
  };

  const shareLocation = () => {
    if (!navigator.geolocation) {
      setError('Location sharing is not available in this browser.');
      return;
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(async position => {
      const { latitude, longitude } = position.coords;
      await sendMessage(`https://maps.google.com/?q=${latitude},${longitude}`, 'location', { latitude, longitude });
    }, geoError => {
      setError(geoError.message || 'Location permission was denied.');
      setBusy(false);
    }, { enableHighAccuracy: false, timeout: 10000 });
  };

  const whatsapp = async booking => {
    const whatsappWindow = window.open('about:blank', '_blank');
    if (!whatsappWindow) {
      setError('Allow pop-ups to continue to WhatsApp.');
      return;
    }
    setBusy(true);
    const { data, error: contactError } = await supabase.functions.invoke('booking-upi', { body: { booking_id: booking.id } });
    setBusy(false);
    if (contactError || data?.error) {
      whatsappWindow.close();
      setError(await functionError(data, contactError));
      return;
    }
    const messageText = `Hi ${worker.full_name}, I found your Rojgaar profile. Work: ${booking.task_description}. Agreed amount: ₹${booking.offer_amount}.`;
    whatsappWindow.opener = null;
    whatsappWindow.location.href = `https://wa.me/91${data.mobile}?text=${encodeURIComponent(messageText)}`;
  };

  const issueCode = async booking => {
    setBusy(true);
    setError('');
    const { data, error: issueError } = await supabase.functions.invoke('issue-completion-code', { body: { booking_id: booking.id } });
    if (issueError || data?.error) setError(await functionError(data, issueError));
    else setIssuedCode(data.code);
    setBusy(false);
  };

  const completeBooking = async event => {
    event.preventDefault();
    setBusy(true);
    const { data, error: completeError } = await supabase.functions.invoke('complete-booking', {
      body: { booking_id: completionBooking.id, code: completionCode },
    });
    if (completeError || data?.error) setError(await functionError(data, completeError));
    else {
      setNotice(t('complete'));
      setCompletionBooking(null);
      setCompletionCode('');
      await refresh(conversation.id);
    }
    setBusy(false);
  };

  const acceptedBooking = bookings.find(item => item.customer_id === userId && item.status === 'accepted');
  const chatIsWorker = conversation?.worker_id === userId;

  return <div className="chat-backdrop" onMouseDown={onClose}><section className="chat-drawer" onMouseDown={event => event.stopPropagation()}>
    <header className="chat-drawer-header"><div className="chat-worker">
      {worker.photo_path ? <img src={mediaUrl(worker.photo_path)} alt=""/> : <span>{initials(worker.full_name)}</span>}
      <div><strong>{worker.full_name}</strong><small>{worker.skill}{worker.district ? ` · ${worker.district}` : ""}</small></div>
    </div><button className="icon-button" onClick={onClose} aria-label="Close"><X size={20}/></button></header>
    <div className="chat-system-note"><Shield size={14}/>{language === 'hi' ? 'व्यक्तिगत जानकारी और भुगतान केवल सहमति के बाद साझा करें।' : 'Share personal details and payment only after you agree on the work.'}</div>
    {error && <div className="form-message error-message" role="alert">{error}</div>}
    {notice && <div className="form-message success-message" role="status">{notice}</div>}
    <div className="chat-messages" ref={listRef}>
      {!messages.length && <div className="chat-empty">{t('noMessages')}</div>}
      {messages.map(item => {
        const offerBooking = item.message_type === 'offer' ? bookings.find(booking => booking.id === item.metadata.booking_id) : null;
        return <article key={item.id} className={`chat-message ${item.sender_id === userId ? 'mine' : ''} ${item.message_type}`}>
          {item.message_type === 'voice' ? <audio controls src={mediaUrl(item.metadata.path)}/>
            : item.message_type === 'location' ? <a href={item.content} target="_blank" rel="noreferrer"><MapPin size={15}/> {language === 'hi' ? 'साझा की गई जगह खोलें' : 'Open shared location'}</a>
              : <span>{item.content}</span>}
          {offerBooking && <div className="offer-actions">
            {offerBooking.status === 'offered' && conversation?.worker_id === userId && <><button onClick={() => respond(offerBooking, 'accept')} disabled={busy}>{t('accept')}</button><button onClick={() => { setCounterBooking(offerBooking); setCounterAmount(''); }}>{t('counter')}</button></>}
            {offerBooking.status === 'countered' && conversation?.customer_id === userId && <button onClick={() => acceptCounter(offerBooking)} disabled={busy}>{t('acceptCounter')}</button>}
          </div>}
        </article>;
      })}
      {bookings.map(booking => <article key={booking.id} className="booking-strip">
        <strong>{booking.status === 'paid' ? t('paid') : booking.status === 'completed' ? t('complete') : booking.status === 'accepted' ? t('deal') : booking.status}</strong>
        <span>₹{Number(booking.offer_amount).toLocaleString('en-IN')} · {booking.task_description}</span>
        {booking.status === 'countered' && booking.counter_amount && <span>{t('counterAmount')}: ₹{Number(booking.counter_amount).toLocaleString('en-IN')}</span>}
        {booking.status === 'offered' && booking.worker_id === userId && <div className="offer-actions"><button onClick={() => respond(booking, 'accept')} disabled={busy}>{t('accept')}</button><button onClick={() => { setCounterBooking(booking); setCounterAmount(''); }}>{t('counter')}</button></div>}
        {booking.status === 'countered' && booking.customer_id === userId && <button onClick={() => acceptCounter(booking)} disabled={busy}>{t('acceptCounter')}</button>}
        {booking.status === 'accepted' && booking.customer_id === userId && booking.payment_method !== 'upi' && <div className="booking-actions"><button onClick={() => directUpi(booking)} disabled={busy}>{t('directUpi')}</button><button onClick={() => payRazorpay(booking)} disabled={busy}>{t('tokenPay')}</button><button onClick={() => whatsapp(booking)} disabled={busy}>{t('whatsapp')}</button></div>}
        {booking.status === 'accepted' && booking.payment_method === 'upi' && booking.customer_id === userId && !booking.payment_claimed_at && <button onClick={() => claimUpiPayment(booking)} disabled={busy}>{t('iHavePaid')}</button>}
        {booking.status === 'accepted' && booking.payment_method === 'upi' && booking.customer_id === userId && booking.payment_claimed_at && <small className="payment-disclaimer">{t('awaitingUpi')}</small>}
        {booking.status === 'accepted' && booking.payment_method === 'upi' && booking.payment_claimed_at && booking.worker_id === userId && <button onClick={() => confirmUpiPayment(booking)} disabled={busy}>{t('confirmReceived')}</button>}
        {booking.status === 'paid' && booking.worker_id === userId && <button onClick={() => issueCode(booking)} disabled={busy}>{t('completionCode')}</button>}
        {booking.status === 'paid' && booking.customer_id === userId && <button onClick={() => { setCompletionBooking(booking); setCompletionCode(''); }}>{t('verifyCode')}</button>}
        {['accepted', 'paid'].includes(booking.status) && booking.customer_id === userId && <small className="payment-disclaimer">{t('noEscrow')}</small>}
        {booking.status === 'completed' && <span className="form-message success-message">{t('complete')}</span>}
      </article>)}
    </div>
    {issuedCode && <div className="completion-code-card"><span>{language === 'hi' ? 'ग्राहक को यह कोड काम पूरा होने पर दें' : 'Share this code with the customer when the work is finished'}</span><strong>{issuedCode}</strong><small>Expires in 30 minutes. SMS delivery is not configured.</small><button onClick={() => setIssuedCode('')}>Hide</button></div>}
    {upi && <div className="upi-modal-shade" onMouseDown={() => setUpi(null)}><section className="upi-modal" onMouseDown={event => event.stopPropagation()}><button className="icon-button" onClick={() => setUpi(null)}><X size={18}/></button><h3>{t('directUpi')}</h3><QRCodeSVG value={upi.uri} size={190} level="M" includeMargin/><strong>₹{Number(upi.amount).toLocaleString('en-IN')}</strong><a className="publish" href={upi.uri}>{language === 'hi' ? 'UPI ऐप खोलें' : 'Open UPI app'}</a><button className="secondary-button" onClick={() => claimUpiPayment(upi.booking)}>{t('iHavePaid')}</button><p>{t('directWarning')}</p></section></div>}
    {counterBooking && <div className="upi-modal-shade"><form className="upi-modal counter-modal" onSubmit={event => { event.preventDefault(); respond(counterBooking, 'counter', Number(counterAmount)); }}><button type="button" className="icon-button" onClick={() => setCounterBooking(null)}><X size={18}/></button><h3>{t('counter')}</h3><label className="auth-label">{t('counterAmount')}<input type="number" min="1" required value={counterAmount} onChange={event => setCounterAmount(event.target.value)}/></label><button className="publish" disabled={busy}>{t('send')}</button></form></div>}
    {completionBooking && <div className="upi-modal-shade"><form className="upi-modal counter-modal" onSubmit={completeBooking}><button type="button" className="icon-button" onClick={() => setCompletionBooking(null)}><X size={18}/></button><h3>{t('verifyCode')}</h3><label className="auth-label">{t('enterCode')}<input inputMode="numeric" maxLength={6} required value={completionCode} onChange={event => setCompletionCode(event.target.value.replace(/\D/g, '').slice(0, 6))}/></label><button className="publish" disabled={busy}>{t('verifyCode')}</button></form></div>}
    {acceptedBooking && <div className="chat-payment-note">{t('noEscrow')}</div>}
    <form className="chat-composer" onSubmit={event => { event.preventDefault(); sendMessage(message); }}>
      <button type="button" className="icon-button" title={t('shareLocation')} onClick={shareLocation}><Navigation size={18}/></button>
      <button type="button" className={`icon-button ${voice.recording ? 'recording' : ''}`} title={t('voiceNote')} onClick={voice.recording ? voice.stop : voice.start}><Mic size={18}/></button>
      {voiceFile && <button type="button" className="secondary-button chat-voice-send" onClick={async () => {
        if (!validUpload(voiceFile, 'audio')) return setError('Use an OGG, WebM, or MP4 audio file up to 10 MB.');
        const ext = fileExtension(voiceFile);
        if (!ext) return setError('Unsupported voice note format.');
        const path = `${userId}/chat-${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from('worker-media').upload(path, voiceFile, { contentType: voiceFile.type });
        if (uploadError) return setError(uploadError.message);
        sendMessage('', 'voice', { path });
      }}><Send size={14}/></button>}
      {voice.error && <small className="field-error">{voice.error}</small>}
      <input value={message} onChange={event => setMessage(event.target.value)} placeholder={t('enterMessage')}/>
      <button className="publish" disabled={!conversation || busy || (!message.trim() && !voiceFile)}><Send size={16}/>{t('send')}</button>
    </form>
    {!chatIsWorker && <form className="offer-composer" onSubmit={sendOffer}>
      <div><label>{t('offerAmount')}<input required type="number" min="1" value={offer} onChange={event => setOffer(event.target.value)}/></label><label>{t('jobDetails')}<input required minLength={3} maxLength={1000} value={description} onChange={event => setDescription(event.target.value)}/></label></div>
      <button className="secondary-button" disabled={!conversation || busy}><Plus size={15}/>{t('makeOffer')}</button>
    </form>}
  </section></div>;
}

function Inbox({ userId, language, onOpen }) {
  const t = useCopy(language);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    supabase.from('conversations')
      .select('id, customer_id, worker_id, created_at, customer:profiles!conversations_customer_id_fkey(full_name)')
      .eq('worker_id', userId).order('created_at', { ascending: false }).limit(100)
      .then(({ data, error: queryError }) => {
        if (!active) return;
        if (queryError) setError(queryError.message);
        else setItems(data || []);
        setLoading(false);
      });
    return () => { active = false; };
  }, [userId]);
  return <section className="worker-panel directory-panel">
    <div className="worker-panel-heading"><div><span className="eyebrow"><MessageCircle size={14}/> ROJGAAR</span><h1>{t('myWork')}</h1></div></div>
    {error && <div className="form-message error-message" role="alert">{error}</div>}
    {loading ? <div className="no-job-found">Loading…</div> : items.length ? <div className="worker-grid">{items.map(item => <article className="worker-card" key={item.id}>
      <div className="worker-card-head"><span className="worker-avatar worker-avatar-fallback">{initials(item.customer?.full_name)}</span><div className="worker-card-name"><h3>{item.customer?.full_name || 'Rojgaar member'}</h3></div></div>
      <div className="worker-card-actions"><button className="publish" onClick={() => onOpen(item)}><MessageCircle size={16}/>{t('chat')}</button></div>
    </article>)}</div>
      : <div className="no-job-found"><MessageCircle size={25}/><h3>{language === 'hi' ? 'अभी कोई बातचीत नहीं' : 'No customer chats yet'}</h3><p>{language === 'hi' ? 'जब कोई ग्राहक आपसे संपर्क करेगा, वह यहाँ दिखेगा।' : 'When a customer contacts you, the conversation appears here.'}</p></div>}
  </section>;
}

export default function WorkerPlatform({ userId, onBack }) {
  const [language, setLanguage] = useState(() => localStorage.getItem('rojgaar-language') === 'hi' ? 'hi' : 'en');
  const [view, setView] = useState('directory');
  const [enrollment, setEnrollment] = useState(null);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [error, setError] = useState('');
  const [online, setOnline] = useState(navigator.onLine);
  const [installEvent, setInstallEvent] = useState(null);
  const t = useCopy(language);

  const loadEnrollment = useCallback(async () => {
    const { data, error: queryError } = await supabase.from('worker_directory').select('*').eq('user_id', userId).maybeSingle();
    if (queryError) setError(queryError.message);
    else setEnrollment(data);
  }, [userId]);
  useEffect(() => { loadEnrollment(); }, [loadEnrollment]);
  useEffect(() => {
    const updateOnline = () => setOnline(navigator.onLine);
    const captureInstall = event => {
      event.preventDefault();
      setInstallEvent(event);
    };
    window.addEventListener('online', updateOnline);
    window.addEventListener('offline', updateOnline);
    window.addEventListener('beforeinstallprompt', captureInstall);
    return () => {
      window.removeEventListener('online', updateOnline);
      window.removeEventListener('offline', updateOnline);
      window.removeEventListener('beforeinstallprompt', captureInstall);
    };
  }, []);
  const installApp = async () => {
    if (!installEvent) return;
    try {
      await installEvent.prompt();
      await installEvent.userChoice;
      setInstallEvent(null);
    } catch (installError) {
      setError(installError.message || 'Could not start installation.');
    }
  };
  const changeLanguage = value => {
    localStorage.setItem('rojgaar-language', value);
    setLanguage(value);
  };
  const openChat = worker => setSelectedWorker(worker);

  return <main className="worker-app-layout">
    <div className="worker-app-toolbar">
      <button className="text-back" onClick={onBack}><ArrowLeft size={17}/> Rojgaar</button>
      <div className="worker-nav">
        <button className={view === 'directory' ? 'selected' : ''} onClick={() => setView('directory')}>{t('directory')}</button>
        <button className={view === 'enroll' ? 'selected' : ''} onClick={() => setView(enrollment ? 'myId' : 'enroll')}>{enrollment ? t('myId') : t('enroll')}</button>
        {enrollment && <button className={view === 'myId' ? 'selected' : ''} onClick={() => setView('myId')}>{t('myId')}</button>}
        {enrollment && <button className={view === 'inbox' ? 'selected' : ''} onClick={() => setView('inbox')}>{t('myWork')}</button>}
      </div>
      {!online && <span className="offline-indicator">{t('offline')}</span>}
      {installEvent && <button className="secondary-button install-app" onClick={installApp}>{t('install')}</button>}
      <button className="language-toggle" onClick={() => changeLanguage(language === 'hi' ? 'en' : 'hi')}><Globe2 size={16}/>{language === 'hi' ? 'English' : 'हिंदी'}</button>
    </div>
    {error && <div className="form-message error-message">{error}</div>}
    {view === 'directory' && <Directory userId={userId} language={language} onEnroll={() => setView(enrollment ? 'myId' : 'enroll')} onChat={openChat}/>}
    {view === 'enroll' && <Enrollment userId={userId} language={language} existing={enrollment} onCancel={() => setView('directory')} onComplete={result => { setEnrollment(result); setView('myId'); }}/>}
    {view === 'myId' && enrollment && <Enrollment userId={userId} language={language} existing={enrollment} onCancel={() => setView('directory')} onComplete={result => setEnrollment(result)}/>}
    {view === 'myId' && !enrollment && <section className="worker-panel"><p>{t('profileMissing')}</p><button className="publish" onClick={() => setView('enroll')}>{t('enroll')}</button></section>}
    {view === 'inbox' && enrollment && <Inbox userId={userId} language={language} onOpen={item => setSelectedWorker({ user_id: item.customer_id, full_name: item.customer?.full_name || 'Rojgaar member', skill: language === 'hi' ? 'ग्राहक' : 'Customer', district: '', photo_path: '', initialConversation: item })}/>}
    {selectedWorker && <Chat key={selectedWorker.initialConversation?.id || selectedWorker.user_id} worker={selectedWorker} initialConversation={selectedWorker.initialConversation || null} userId={userId} language={language} onClose={() => setSelectedWorker(null)}/>}
  </main>;
}
