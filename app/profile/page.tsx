'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Camera, Save, ArrowLeft, User, Phone, MapPin, Briefcase, FileText } from 'lucide-react';
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
  });

  useEffect(() => { load(); }, []);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/auth'); return; }
    setUserId(user.id);
    const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (p) setProfile({ ...p, email: user.email || '', specialization: p.specialization || [] });
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

  const toggleSpec = (s: string) => setProfile(p => ({
    ...p, specialization: p.specialization.includes(s) ? p.specialization.filter(x => x !== s) : [...p.specialization, s],
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
      }
      const { error: e } = await supabase.from('profiles').update(update).eq('id', userId);
      if (e) throw e;
      setSuccess('Профиль успешно сохранён!');
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
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${profile.specialization.includes(s) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
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
export const dynamic = 'force-dynamic';
