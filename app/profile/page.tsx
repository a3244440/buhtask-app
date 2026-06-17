'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Camera, Save, ArrowLeft, User, Phone, MapPin, Briefcase, FileText, ShieldCheck, BadgeCheck, Upload, CheckCircle2, Clock, CreditCard } from 'lucide-react';
import DashboardHeader from '../components/DashboardHeader';

const CITIES = ['Астана','Алматы','Шымкент','Актобе','Тараз','Павлодар','Усть-Каменогорск','Семей','Атырау','Костанай','Кызылорда','Уральск','Петропавловск','Актау','Темиртау','Туркестан','Кокшетау','Талдыкорган'];
const SPECS = ['ИП','ТОО','НДС','КПН','ИПН','Зарплата','1С','Аудит','Налоги','МСФО'];
const inp = "w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm bg-white transition-all";

export default function ProfilePage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [userId, setUserId] = useState('');
  const [profile, setProfile] = useState({
    full_name: '', phone: '', city: 'Астана', role: 'client',
    bio: '', avatar_url: '', experience_years: 0, min_price: 0,
    specialization: [] as string[], email: '',
    iin: '', id_card_url: '', selfie_url: '',
    diploma_urls: [] as string[], certificate_urls: [] as string[],
    identity_verified: false, documents_verified: false, experience_verified: false,
    verification_status: 'not_verified', completed_tasks: 0, rating: 0,
  });

  useEffect(() => { load(); }, []);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/auth'); return; }
    setUserId(user.id);
    const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
    if (p) {
      setProfile(prev => ({
        ...prev,
        ...p,
        email: user.email || '',
        specialization: p.specialization || [],
        diploma_urls: p.diploma_urls || [],
        certificate_urls: p.certificate_urls || [],
        iin: p.iin || '',
        id_card_url: p.id_card_url || '',
        selfie_url: p.selfie_url || '',
        bio: p.bio || '',
        verification_status: p.verification_status || 'not_verified',
        identity_verified: p.identity_verified || false,
        documents_verified: p.documents_verified || false,
        experience_verified: p.experience_verified || false,
        rating: p.rating || 0,
        completed_tasks: p.completed_tasks || 0,
        experience_years: p.experience_years || 0,
        min_price: p.min_price || 0,
      }));
    } else {
      // Профиль не существует — создаём базовый
      await supabase.from('profiles').insert({
        id: user.id, email: user.email, role: 'client',
        rating: 0, completed_tasks: 0, verification_status: 'not_verified',
      });
      setProfile(prev => ({ ...prev, email: user.email || '' }));
    }
    setLoading(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setError('Файл слишком большой. Максимум 2MB'); return; }
    setUploading(true);
    setError('');
    try {
      // Конвертируем в base64 и пробуем загрузить в Storage
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64 = ev.target?.result as string;
        // Пробуем Storage, если не получится — сохраняем base64 в profiles
        try {
          const ext = file.name.split('.').pop() || 'jpg';
          const path = `${userId}/avatar.${ext}`;
          const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
          if (upErr) throw upErr;
          const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
          setProfile(p => ({ ...p, avatar_url: publicUrl }));
        } catch {
          // Fallback: сохраняем base64 прямо в profile
          setProfile(p => ({ ...p, avatar_url: base64 }));
        }
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch { setError('Ошибка загрузки фото'); setUploading(false); }
  };

  const uploadDoc = async (file: File, field: 'id_card_url' | 'selfie_url' | 'diploma_urls' | 'certificate_urls') => {
    if (!userId) return;
    if (file.size > 10 * 1024 * 1024) { setError('Файл слишком большой (макс 10MB)'); return; }
    setUploading(true);
    setError('');
    try {
      const safeId = `${Date.now()}${Math.random().toString(36).slice(2)}`;
      const path = `${userId}/${field}_${safeId}.dat`;
      const blob = new Blob([file], { type: 'application/octet-stream' });
      const { error: upErr } = await supabase.storage.from('verification-docs').upload(path, blob);
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from('verification-docs').getPublicUrl(path);
      if (field === 'diploma_urls' || field === 'certificate_urls') {
        setProfile(p => ({ ...p, [field]: [...(p[field] || []), publicUrl] }));
      } else {
        setProfile(p => ({ ...p, [field]: publicUrl }));
      }
    } catch (err: any) {
      setError('Ошибка загрузки: ' + (err?.message || 'попробуйте снова'));
    } finally {
      setUploading(false);
    }
  };

  const toggleSpec = (s: string) => setProfile(p => ({
    ...p, specialization: (p.specialization || []).includes(s) ? (p.specialization || []).filter(x => x !== s) : [...(p.specialization || []), s],
  }));

  const handleSave = async () => {
    setSaving(true); setError(''); setSuccess('');
    try {
      const update: any = { full_name: profile.full_name, phone: profile.phone, city: profile.city, avatar_url: profile.avatar_url };
      if (profile.role === 'accountant') {
        update.bio = profile.bio;
        update.experience_years = profile.experience_years;
        update.min_price = profile.min_price;
        update.specialization = profile.specialization;
        update.iin = profile.iin;
        update.id_card_url = profile.id_card_url;
        update.selfie_url = profile.selfie_url;
        update.diploma_urls = profile.diploma_urls;
        update.certificate_urls = profile.certificate_urls;
        // Если загружены документы — статус "на проверке"
        const hasDocss = profile.id_card_url && profile.iin;
        if (hasDocss && profile.verification_status === 'not_verified') {
          update.verification_status = 'pending';
        }
      }
      const { error: e } = await supabase.from('profiles').update(update).eq('id', userId);
      if (e) throw e;
      setSuccess('Профиль успешно сохранён!');
      if (profile.role === 'accountant' && profile.id_card_url && profile.iin && profile.verification_status === 'not_verified') {
        setProfile(p => ({ ...p, verification_status: 'pending' }));
      }
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) { setError(err.message || 'Ошибка сохранения'); }
    finally { setSaving(false); }
  };

  const dashHref = profile.role === 'accountant' ? '/dashboard/accountant' : '/dashboard/client';
  const initials = profile.full_name ? profile.full_name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : profile.email[0]?.toUpperCase() || '?';

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC]" style={{ fontFamily: 'Inter, sans-serif' }}>
      <DashboardHeader title="Мой профиль" />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <button onClick={() => router.push(dashHref)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6">
          <ArrowLeft className="w-4 h-4" /> Назад в кабинет
        </button>

        {/* Avatar */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-5">
          <h2 className="font-semibold text-gray-900 mb-4">Фото профиля</h2>
          <div className="flex items-center gap-5">
            <div className="relative">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="avatar" className="w-20 h-20 rounded-2xl object-cover border border-gray-100" />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-blue-600 flex items-center justify-center text-white text-2xl font-bold">{initials}</div>
              )}
              {uploading && <div className="absolute inset-0 rounded-2xl bg-black/40 flex items-center justify-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white" /></div>}
            </div>
            <div>
              <button onClick={() => fileRef.current?.click()} disabled={uploading}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-sm font-medium transition-colors">
                <Camera className="w-4 h-4" /> {uploading ? 'Загружаем...' : 'Выбрать фото'}
              </button>
              <p className="text-xs text-gray-400 mt-1.5">JPG, PNG до 2MB</p>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatarUpload} />
            </div>
          </div>
        </div>

        {/* Main info */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-5 space-y-4">
          <h2 className="font-semibold text-gray-900">Основная информация</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Имя / Название компании</label>
            <input type="text" value={profile.full_name} onChange={e => setProfile(p => ({ ...p, full_name: e.target.value }))} placeholder="Иванов Иван Иванович" className={inp} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Телефон</label>
            <input type="tel" value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} placeholder="+7 777 000 00 00" className={inp} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Город</label>
            <select value={profile.city} onChange={e => setProfile(p => ({ ...p, city: e.target.value }))} className={inp}>
              {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
            <input type="email" value={profile.email} disabled className={inp + ' bg-gray-50 text-gray-400 cursor-not-allowed'} />
            <p className="text-xs text-gray-400 mt-1">Email нельзя изменить</p>
          </div>
        </div>

        {/* Accountant extras */}
        {profile.role === 'accountant' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-5 space-y-4">
            <h2 className="font-semibold text-gray-900">Профессиональная информация</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">О себе</label>
              <textarea rows={4} value={profile.bio} onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))}
                placeholder="Расскажите об опыте, специализации и преимуществах..." className={inp + ' resize-none'} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Опыт (лет)</label>
                <input type="number" min="0" max="50" value={profile.experience_years} onChange={e => setProfile(p => ({ ...p, experience_years: parseInt(e.target.value) || 0 }))} className={inp} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Ставка от (₸)</label>
                <input type="number" min="0" value={profile.min_price} onChange={e => setProfile(p => ({ ...p, min_price: parseInt(e.target.value) || 0 }))} placeholder="5000" className={inp} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Специализация</label>
              <div className="flex flex-wrap gap-2">
                {SPECS.map(s => (
                  <button key={s} type="button" onClick={() => toggleSpec(s)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${(profile.specialization || []).includes(s) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* VERIFICATION SECTION - only accountants */}
        {profile.role === 'accountant' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-5">
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="w-5 h-5 text-blue-600" />
              <h2 className="font-semibold text-gray-900">Верификация</h2>
            </div>
            <p className="text-xs text-gray-500 mb-5">Подтвердите личность и квалификацию — это повышает доверие клиентов</p>

            {/* Status badge */}
            <div className={`rounded-xl p-4 mb-5 flex items-center gap-3 ${
              profile.verification_status === 'verified' ? 'bg-emerald-50 border border-emerald-200' :
              profile.verification_status === 'pending' ? 'bg-amber-50 border border-amber-200' :
              'bg-gray-50 border border-gray-200'
            }`}>
              {profile.verification_status === 'verified' ? (
                <><BadgeCheck className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                  <div><p className="font-semibold text-emerald-800 text-sm">Верифицированный бухгалтер</p>
                  <p className="text-xs text-emerald-600">Личность и документы подтверждены</p></div></>
              ) : profile.verification_status === 'pending' ? (
                <><Clock className="w-6 h-6 text-amber-600 flex-shrink-0" />
                  <div><p className="font-semibold text-amber-800 text-sm">На проверке</p>
                  <p className="text-xs text-amber-600">Документы загружены, ожидают проверки администратором</p></div></>
              ) : (
                <><Clock className="w-6 h-6 text-gray-400 flex-shrink-0" />
                  <div><p className="font-semibold text-gray-700 text-sm">Не верифицирован</p>
                  <p className="text-xs text-gray-500">Загрузите документы для проверки</p></div></>
              )}
            </div>

            {/* Verification checklist */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-5">
              {[
                { label: 'Личность подтверждена', done: profile.identity_verified },
                { label: 'Документы проверены', done: profile.documents_verified },
                { label: 'Опыт подтверждён', done: profile.experience_verified },
                { label: `Рейтинг ${(profile.rating || 0).toFixed(1)} · ${profile.completed_tasks || 0} задач`, done: true },
              ].map(item => (
                <div key={item.label} className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${item.done ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-50 text-gray-400'}`}>
                  <CheckCircle2 className={`w-4 h-4 ${item.done ? 'text-emerald-500' : 'text-gray-300'}`} />
                  {item.label}
                </div>
              ))}
            </div>

            {/* IIN */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                <CreditCard className="w-4 h-4 inline mr-1.5 text-gray-400" />ИИН
              </label>
              <input type="text" value={profile.iin} onChange={e => setProfile(p => ({ ...p, iin: e.target.value }))}
                placeholder="123456789012" maxLength={12} className={inp} />
            </div>

            {/* Document uploads */}
            <div className="space-y-3">
              <DocUpload label="Удостоверение личности" done={!!profile.id_card_url} uploading={uploading}
                onFile={(f) => uploadDoc(f, 'id_card_url')} />
              <DocUpload label="Селфи с удостоверением" done={!!profile.selfie_url} uploading={uploading}
                onFile={(f) => uploadDoc(f, 'selfie_url')} />
              <DocUpload label="Дипломы" done={(profile.diploma_urls?.length || 0) > 0} count={(profile.diploma_urls?.length || 0)} uploading={uploading}
                onFile={(f) => uploadDoc(f, 'diploma_urls')} multi />
              <DocUpload label="Сертификаты" done={(profile.certificate_urls?.length || 0) > 0} count={(profile.certificate_urls?.length || 0)} uploading={uploading}
                onFile={(f) => uploadDoc(f, 'certificate_urls')} multi />
            </div>

            <p className="text-xs text-gray-400 mt-4">🔒 Документы видны только администраторам платформы для проверки</p>
          </div>
        )}

        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-4">{error}</div>}
        {success && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm mb-4">{success}</div>}

        <button onClick={handleSave} disabled={saving}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white py-3.5 rounded-xl font-semibold text-sm transition-colors">
          <Save className="w-4 h-4" /> {saving ? 'Сохраняем...' : 'Сохранить изменения'}
        </button>
      </main>
    </div>
  );
}

function DocUpload({ label, done, count, uploading, onFile, multi }: {
  label: string; done: boolean; count?: number; uploading: boolean;
  onFile: (f: File) => void; multi?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="flex items-center justify-between gap-3 p-3 border border-gray-200 rounded-xl">
      <div className="flex items-center gap-3 min-w-0">
        {done ? <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" /> : <FileText className="w-5 h-5 text-gray-300 flex-shrink-0" />}
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-700 truncate">{label}</p>
          {done && <p className="text-xs text-emerald-600">{multi && count ? `Загружено: ${count}` : 'Загружено ✓'}</p>}
        </div>
      </div>
      <button onClick={() => ref.current?.click()} disabled={uploading}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-medium transition-colors flex-shrink-0">
        <Upload className="w-3.5 h-3.5" /> {done && !multi ? 'Заменить' : 'Загрузить'}
      </button>
      <input ref={ref} type="file" className="hidden" accept="image/*,.pdf"
        onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); if (ref.current) ref.current.value = ''; }} />
    </div>
  );
}
export const dynamic = 'force-dynamic';
