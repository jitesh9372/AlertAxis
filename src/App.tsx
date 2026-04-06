/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  BrowserRouter as Router, 
  Routes, 
  Route, 
  Link, 
  useNavigate,
  useLocation
} from 'react-router-dom';
import { 
  Phone, 
  Shield, 
  MapPin, 
  Users, 
  Video, 
  Info, 
  ChevronDown, 
  AlertCircle, 
  CheckCircle2, 
  Menu, 
  X,
  Volume2,
  Zap,
  Mic,
  Languages,
  Smartphone,
  Moon,
  Sun,
  LogOut,
  User,
  LayoutDashboard,
  Instagram
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { APP_CONFIG } from './constants';
import { supabase, signInWithGoogle } from './supabaseClient';
import { uploadFile } from './lib/storage';
import { v4 as uuidv4 } from 'uuid';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import Dashboard from './pages/Dashboard';
import LiveMap from './pages/LiveMap';
import InstagramReportPage from './pages/InstagramReport';import { cn } from './lib/utils';
import { translations, Language } from './i18n/translations';
import { Chatbot } from './components/Chatbot';

// --- Components ---

const Navbar = ({ darkMode, toggleDarkMode, user, currentLanguage, setLanguage }: { darkMode: boolean, toggleDarkMode: () => void, user: any, currentLanguage: Language, setLanguage: (lang: Language) => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const t = translations[currentLanguage];

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/signin');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Shield className="text-white w-5 h-5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">{APP_CONFIG.APP_NAME}</span>
          </Link>
          
          <div className="hidden md:flex items-center gap-6">
            {/* Language Selector */}
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              {(['en', 'hi', 'mr'] as Language[]).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  className={cn(
                    "px-2 py-1 text-xs font-bold rounded-lg transition-all uppercase",
                    currentLanguage === lang 
                      ? "bg-white dark:bg-slate-700 text-primary shadow-sm" 
                      : "text-slate-500 hover:text-primary"
                  )}
                >
                  {lang}
                </button>
              ))}
            </div>

            <button 
              onClick={toggleDarkMode}
              className="relative p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-primary transition-all group overflow-hidden"
              aria-label="Toggle Dark Mode"
            >
              <div className="relative z-10 flex items-center justify-center">
                {darkMode ? (
                  <Sun className="w-5 h-5 animate-in zoom-in spin-in-90 duration-500" />
                ) : (
                  <Moon className="w-5 h-5 animate-in zoom-in spin-in-90 duration-500" />
                )}
              </div>
              <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/5 transition-colors" />
            </button>
            
            <Link to="/" className={cn("text-sm font-medium transition-colors", isActive('/') ? "text-primary" : "text-slate-600 dark:text-slate-400 hover:text-primary")}>{t.home}</Link>
            <Link to="/instagram-report" className={cn("text-sm font-medium transition-colors flex items-center gap-1", isActive('/instagram-report') ? "text-primary" : "text-slate-600 dark:text-slate-400 hover:text-primary")}>
              <Instagram className="w-4 h-4" />
              {t.instagramReports}
            </Link>            
            {user ? (
              <div className="flex items-center gap-4">
                <Link to="/dashboard" className={cn("text-sm font-medium transition-colors flex items-center gap-1", isActive('/dashboard') ? "text-primary" : "text-slate-600 dark:text-slate-400 hover:text-primary")}>
                  <LayoutDashboard className="w-4 h-4" />
                  {t.dashboard}
                </Link>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-full">
                  <User className="w-4 h-4 text-slate-500" />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate max-w-[100px]">{user.email}</span>
                </div>
                <button 
                  onClick={handleSignOut}
                  className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-primary flex items-center gap-1"
                >
                  <LogOut className="w-4 h-4" />
                  {t.signOut}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <Link to="/signin" className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-primary transition-colors">{t.signIn}</Link>
                <Link to="/signup" className="bg-primary text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-primary-dark transition-all shadow-lg shadow-red-200 dark:shadow-none">
                  {t.signUp}
                </Link>
              </div>
            )}
          </div>

          <div className="md:hidden flex items-center gap-4">
            <button 
              onClick={toggleDarkMode}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 active:scale-95 transition-all"
              aria-label="Toggle Dark Mode"
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button 
              onClick={() => setIsOpen(!isOpen)} 
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 active:scale-95 transition-all"
              aria-label="Toggle Menu"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 overflow-hidden"
          >
            <div className="px-4 pt-2 pb-6 space-y-2">
              <Link to="/" onClick={() => setIsOpen(false)} className={cn("block px-4 py-3 rounded-2xl text-base font-bold transition-colors", isActive('/') ? "bg-primary/10 text-primary" : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800")}>{t.home}</Link>
              <Link to="/instagram-report" onClick={() => setIsOpen(false)} className={cn("block px-4 py-3 rounded-2xl text-base font-bold transition-colors flex items-center gap-2", isActive('/instagram-report') ? "bg-primary/10 text-primary" : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800")}>
                <Instagram className="w-5 h-5" />
                {t.instagramReports}
              </Link>
              {user ? (
                <>
                  <Link to="/dashboard" onClick={() => setIsOpen(false)} className={cn("block px-4 py-3 rounded-2xl text-base font-bold transition-colors flex items-center gap-2", isActive('/dashboard') ? "bg-primary/10 text-primary" : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800")}>
                    <LayoutDashboard className="w-5 h-5" />
                    {t.dashboard}
                  </Link>
                  <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 mt-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Language</p>
                    <div className="grid grid-cols-3 gap-2">
                      {(['en', 'hi', 'mr'] as Language[]).map((lang) => (
                        <button
                          key={lang}
                          onClick={() => {
                            setLanguage(lang);
                            setIsOpen(false);
                          }}
                          className={cn(
                            "py-2 rounded-xl text-xs font-bold transition-all uppercase",
                            currentLanguage === lang ? "bg-primary text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                          )}
                        >
                          {lang}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      handleSignOut();
                      setIsOpen(false);
                    }} 
                    className="w-full text-left px-4 py-3 text-base font-bold text-red-500 flex items-center gap-2 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-2xl transition-colors"
                  >
                    <LogOut className="w-5 h-5" />
                    {t.signOut}
                  </button>
                </>
              ) : (
                <div className="pt-4 space-y-3">
                  <Link to="/signin" onClick={() => setIsOpen(false)} className="block w-full px-4 py-3 text-center text-base font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl transition-colors">{t.signIn}</Link>
                  <Link to="/signup" onClick={() => setIsOpen(false)} className="block w-full py-4 bg-primary text-white text-center rounded-2xl font-black text-lg shadow-lg shadow-red-200 dark:shadow-none">
                    {t.signUp}
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

const FeatureCard = React.memo(({ icon: Icon, title, description, active, onClick }: { icon: any, title: string, description: string, active?: boolean, onClick?: () => void }) => (
  <button 
    onClick={onClick}
    className={cn(
      "glass-card p-6 rounded-3xl transition-all duration-300 text-left w-full group relative overflow-hidden",
      active 
        ? "border-primary ring-4 ring-primary/10 bg-red-50/80 dark:bg-red-900/20" 
        : "hover:scale-[1.02] hover:shadow-2xl hover:shadow-slate-200/60 dark:hover:shadow-black/40"
    )}
  >
    {active && (
      <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-primary/10 px-2 py-1 rounded-full">
        <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
        <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Active</span>
      </div>
    )}
    <div className={cn(
      "w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-all duration-300",
      active 
        ? "bg-primary text-white shadow-lg shadow-red-500/40" 
        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 group-hover:bg-primary group-hover:text-white group-hover:shadow-lg group-hover:shadow-red-500/30"
    )}>
      <Icon className="w-6 h-6" />
    </div>
    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 group-hover:text-primary transition-colors">{title}</h3>
    <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">{description}</p>
  </button>
));

const EmergencyButton = React.memo(({ number, label, icon: Icon }: { number: string, label: string, icon: any }) => (
  <motion.a 
    href={`tel:${number}`}
    whileHover={{ scale: 1.05, y: -5 }}
    whileTap={{ scale: 0.95 }}
    className="flex flex-col items-center justify-center p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[32px] hover:border-primary hover:shadow-2xl hover:shadow-red-500/10 transition-all group relative overflow-hidden"
  >
    <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full -mr-12 -mt-12 group-hover:bg-red-500/10 transition-colors" />
    <div className="w-14 h-14 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-3 group-hover:bg-primary group-hover:text-white transition-all duration-300 shadow-sm group-hover:shadow-lg group-hover:shadow-red-500/40">
      <Icon className="text-slate-600 dark:text-slate-400 w-7 h-7 group-hover:text-white transition-colors" />
    </div>
    <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-1">{label}</span>
    <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">{number}</span>
    <div className="mt-2 w-8 h-1 bg-slate-200 dark:bg-slate-800 rounded-full group-hover:w-12 group-hover:bg-primary transition-all" />
  </motion.a>
));

const Home = ({ 
  user, 
  currentLanguage,
  activeAlertId,
  handleSOS,
  handleMarkSafe,
  isRecording,
  isLiveLocationActive,
  isSirenActive,
  isFlashActive,
  handleSiren,
  handleFlash,
  location,
  startRecording,
  stopRecording
}: { 
  user: any, 
  currentLanguage: Language,
  activeAlertId: string | null,
  handleSOS: () => Promise<void>,
  handleMarkSafe: () => Promise<void>,
  isRecording: boolean,
  isLiveLocationActive: boolean,
  isSirenActive: boolean,
  isFlashActive: boolean,
  handleSiren: () => void,
  handleFlash: () => void,
  location: { lat: number, lng: number } | null,
  startRecording: (alertId?: string) => Promise<boolean>,
  stopRecording: () => void
}) => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [contacts, setContacts] = useState<any[]>([]);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<any>(null);
  const [contactFormData, setContactFormData] = useState({ name: '', relation: '', phone: '' });

  const t = translations[currentLanguage];

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    type: 'General',
    notes: ''
  });

  useEffect(() => {
    if (user) {
      fetchContacts();
    }
  }, [user]);

  const fetchContacts = async () => {
    const { data, error } = await supabase
      .from('users_detail')
      .select('*')
      .eq('user_id', user.id)
      .eq('feature_type', 'contact')
      .order('created_at', { ascending: true });
    
    if (error) console.error('Error fetching contacts:', error);
    else setContacts(data || []);
  };

  const handleAddOrUpdateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const contactData = {
      ...contactFormData,
      user_id: user.id,
      feature_type: 'contact'
    };

    try {
      if (editingContact) {
        const { error } = await supabase
          .from('users_detail')
          .update(contactFormData)
          .eq('id', editingContact.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('users_detail')
          .insert([contactData]);
        if (error) throw error;
      }
      
      setIsContactModalOpen(false);
      setEditingContact(null);
      setContactFormData({ name: '', relation: '', phone: '' });
      fetchContacts();
    } catch (err) {
      console.error('Error saving contact:', err);
    }
  };

  const handleDeleteContact = async (id: string) => {
    const { error } = await supabase
      .from('users_detail')
      .delete()
      .eq('id', id);
    
    if (error) console.error('Error deleting contact:', error);
    else fetchContacts();
  };

  const openContactModal = (contact: any = null) => {
    if (contact) {
      setEditingContact(contact);
      setContactFormData({ name: contact.name, relation: contact.relation, phone: contact.phone });
    } else {
      setEditingContact(null);
      setContactFormData({ name: '', relation: '', phone: '' });
    }
    setIsContactModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) return;

    setIsSubmitting(true);
    setStatus('idle');

    try {
      const { error } = await supabase
        .from('users_detail')
        .insert([
          {
            feature_type: 'alert',
            status: 'active',
            message: formData.notes,
            name: formData.name,
            phone: formData.phone,
            created_at: new Date().toISOString(),
            user_id: user?.id || null,
            location: location ? `(${location.lat}, ${location.lng})` : null
          }
        ]);

      if (error) throw error;
      setStatus('success');
      setFormData({ name: '', phone: '', type: 'General', notes: '' });
    } catch (err) {
      console.error(err);
      setStatus('error');
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setStatus('idle'), 5000);
    }
  };

  return (
    <>
      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 relative overflow-hidden transition-colors">
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-[500px] h-[500px] bg-red-500/5 dark:bg-red-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/4 w-[500px] h-[500px] bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block px-4 py-1.5 bg-red-50 dark:bg-red-900/20 text-primary text-xs font-bold uppercase tracking-widest rounded-full mb-6">
              {t.emergencyAssistance || "Emergency Assistance Available 24/7"}
            </span>
            <h1 className="text-5xl md:text-7xl font-black text-slate-900 dark:text-white tracking-tight mb-6 leading-tight">
              {t.heroTagline}
            </h1>
            <p className="text-lg text-slate-500 dark:text-slate-400 mb-12 max-w-2xl mx-auto leading-relaxed">
              {t.heroDescription}
            </p>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-12 flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              {user && (
                <Link 
                  to="/dashboard"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-900 dark:text-white font-bold hover:border-primary transition-all shadow-lg hover:shadow-xl"
                >
                  <LayoutDashboard className="w-5 h-5 text-primary" />
                  Go to Personal Dashboard
                </Link>
              )}
              <Link 
                to="/map"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 bg-primary text-white rounded-2xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-red-200 dark:shadow-none hover:shadow-xl"
              >
                <MapPin className="w-5 h-5" />
                {t.openLiveMap}
              </Link>
              <Link 
                to="/instagram-report"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-900 dark:text-white font-bold hover:border-pink-500 transition-all shadow-lg hover:shadow-xl"
              >
                <Instagram className="w-5 h-5 text-pink-500" />
                {t.instagramReports}
              </Link>
            </motion.div>
          </motion.div>

          {/* SOS Button */}
          <div className="flex flex-col items-center gap-8 mb-16">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={activeAlertId ? handleMarkSafe : handleSOS}
              className={cn(
                "w-48 h-48 md:w-64 md:h-64 rounded-full text-white flex flex-col items-center justify-center shadow-2xl relative z-10 transition-all duration-500 border-8",
                activeAlertId 
                  ? "bg-emerald-500 border-emerald-400/50 shadow-emerald-500/20" 
                  : "bg-primary border-red-500/50 shadow-red-500/40 animate-sos sos-glow"
              )}
            >
              <div className="absolute inset-0 rounded-full bg-white/10 animate-pulse pointer-events-none" />
              {activeAlertId ? (
                <>
                  <CheckCircle2 className="w-12 h-12 md:w-16 md:h-16 mb-2" />
                  <span className="text-2xl md:text-3xl font-black tracking-tighter">{t.imSafe}</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest opacity-80 mt-1">{t.stopAlerts}</span>
                </>
              ) : (
                <>
                  <Shield className="w-12 h-12 md:w-16 md:h-16 mb-2" />
                  <span className="text-3xl md:text-4xl font-black tracking-tighter">{t.sosButton}</span>
                  <span className="text-xs font-bold uppercase tracking-widest opacity-80 mt-1">{t.sosTap}</span>
                </>
              )}
            </motion.button>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-4 w-full max-w-sm mx-auto">
              <motion.button 
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSiren}
                className={cn(
                  "px-4 py-4 rounded-2xl border transition-all flex flex-col items-center justify-center gap-2 shadow-sm",
                  isSirenActive 
                    ? "bg-primary text-white border-primary animate-pulse shadow-red-500/20" 
                    : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-primary/50"
                )}
              >
                <div className={cn("p-2 rounded-xl transition-colors", isSirenActive ? "bg-white/20" : "bg-slate-50 dark:bg-slate-800")}>
                  <Volume2 className={cn("w-5 h-5", isSirenActive ? "animate-bounce" : "")} />
                </div>
                <span className="font-bold uppercase tracking-widest text-[10px]">Siren</span>
              </motion.button>
              <motion.button 
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleFlash}
                className={cn(
                  "px-4 py-4 rounded-2xl border transition-all flex flex-col items-center justify-center gap-2 shadow-sm",
                  isFlashActive 
                    ? "bg-yellow-400 text-white border-yellow-400 shadow-yellow-400/20" 
                    : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-yellow-400/50"
                )}
              >
                <div className={cn("p-2 rounded-xl transition-colors", isFlashActive ? "bg-white/20" : "bg-slate-50 dark:bg-slate-800")}>
                  <Zap className={cn("w-5 h-5", isFlashActive ? "animate-pulse" : "")} />
                </div>
                <span className="font-bold uppercase tracking-widest text-[10px]">Flash</span>
              </motion.button>
            </div>
          </div>

          {/* Emergency Numbers Grid */}
          <div className="max-w-4xl mx-auto w-full">
            <div className="flex items-center gap-4 mb-8">
              <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
              <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">Quick Dial Services</h3>
              <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <EmergencyButton number={APP_CONFIG.EMERGENCY_NUMBERS.GENERAL} label="General" icon={Phone} />
              <EmergencyButton number={APP_CONFIG.EMERGENCY_NUMBERS.POLICE} label="Police" icon={Shield} />
              <EmergencyButton number={APP_CONFIG.EMERGENCY_NUMBERS.AMBULANCE} label="Ambulance" icon={AlertCircle} />
              <EmergencyButton number={APP_CONFIG.EMERGENCY_NUMBERS.FIRE} label="Fire" icon={Zap} />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-4 transition-colors">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">{t.safetyFeatures}</h2>
            <p className="text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">{t.safetySubtitle}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureCard 
              icon={MapPin} 
              title="Live Mapping" 
              description="Real-time interactive map system powered by Google Maps." 
              onClick={() => navigate('/map')}
            />
            <FeatureCard 
              icon={Zap} 
              title={t.oneTapSOS} 
              description={t.oneTapDesc} 
              onClick={handleSOS}
              active={!!activeAlertId}
            />
            <FeatureCard 
              icon={Users} 
              title={t.iceContacts} 
              description={t.iceContactsDesc} 
              onClick={() => {
                const element = document.getElementById('ice-contacts');
                element?.scrollIntoView({ behavior: 'smooth' });
              }}
            />
            <FeatureCard 
              icon={Video} 
              title={t.recording} 
              description={t.recordingDesc} 
              active={isRecording}
              onClick={() => isRecording ? stopRecording() : startRecording()}
            />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 px-4 transition-colors">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-8">{t.howItWorks}</h2>
              <div className="space-y-8">
                {[
                  { step: "01", title: t.step1Title, desc: t.step1Desc },
                  { step: "02", title: t.step2Title, desc: t.step2Desc },
                  { step: "03", title: t.step3Title, desc: t.step3Desc }
                ].map((item, i) => (
                  <div key={i} className="flex gap-6">
                    <div className="text-4xl font-black text-red-100 dark:text-red-900/20 leading-none">{item.step}</div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{item.title}</h3>
                      <p className="text-slate-500 dark:text-slate-400 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="aspect-square bg-linear-to-tr from-red-500 to-orange-400 rounded-[40px] shadow-2xl overflow-hidden flex items-center justify-center p-12">
                <Smartphone className="text-white w-full h-full opacity-20 absolute" />
                <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-xl w-full max-w-xs relative z-10">
                  <div className="w-12 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full mx-auto mb-8" />
                  <div className="w-16 h-16 bg-primary rounded-full mx-auto mb-6 animate-sos" />
                  <div className="space-y-3">
                    <div className="h-4 bg-slate-100 dark:bg-slate-700 rounded-full w-3/4 mx-auto" />
                    <div className="h-4 bg-slate-100 dark:bg-slate-700 rounded-full w-1/2 mx-auto" />
                  </div>
                  <div className="mt-12 grid grid-cols-2 gap-3">
                    <div className="h-10 bg-slate-50 dark:bg-slate-700 rounded-xl" />
                    <div className="h-10 bg-slate-50 dark:bg-slate-700 rounded-xl" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Emergency Form */}
      <section id="emergency-form" className="py-24 px-4 transition-colors">
        <div className="max-w-3xl mx-auto">
          <div className="glass-card p-8 md:p-12 rounded-[40px] border-primary/10">
            <div className="text-center mb-10">
              <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="text-primary w-8 h-8" />
              </div>
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">{t.triggerAlert}</h2>
              <p className="text-slate-500 dark:text-slate-400">{t.triggerDesc}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">{t.fullName}</label>
                  <input 
                    type="text" required value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="John Doe"
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all dark:text-white"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">{t.phoneNumber}</label>
                  <input 
                    type="tel" required value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    placeholder="+91 00000 00000"
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all dark:text-white"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">{t.emergencyType}</label>
                <select 
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
                  className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none dark:text-white"
                >
                  <option>General</option>
                  <option>Police</option>
                  <option>Ambulance</option>
                  <option>Fire</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">{t.additionalNotes}</label>
                <textarea 
                  rows={4} value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Describe your situation (optional)..."
                  className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none dark:text-white"
                />
              </div>

              <button 
                type="submit" disabled={isSubmitting}
                className={cn(
                  "w-full py-5 rounded-2xl text-white font-bold text-lg shadow-xl shadow-red-200 dark:shadow-none transition-all flex items-center justify-center gap-3",
                  isSubmitting ? "bg-slate-400 cursor-not-allowed" : "bg-primary hover:bg-primary-dark active:scale-[0.98]"
                )}
              >
                {isSubmitting ? t.sendingAlert : t.sendAlertNow}
                {!isSubmitting && <Shield className="w-5 h-5" />}
              </button>

              <AnimatePresence>
                {status === 'success' && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-4 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-2xl flex items-center gap-3 border border-emerald-100 dark:border-emerald-900/30">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="text-sm font-bold">{t.alertSuccess}</span>
                  </motion.div>
                )}
                {status === 'error' && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-2xl flex items-center gap-3 border border-red-100 dark:border-red-900/30">
                    <AlertCircle className="w-5 h-5" />
                    <span className="text-sm font-bold">{t.alertError}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </form>
          </div>
        </div>
      </section>

      {/* ICE Contacts Section */}
      <section id="ice-contacts" className="py-24 px-4 transition-colors">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">{t.iceContacts}</h2>
            <p className="text-slate-500 dark:text-slate-400">{t.iceContactsDesc}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {user ? (
              <>
                {contacts.map((contact) => (
                  <div key={contact.id} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center font-bold text-slate-600 dark:text-slate-400">
                        {contact.name[0]}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white">{contact.name}</h4>
                        <p className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">{contact.relation}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => openContactModal(contact)}
                        className="w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400 hover:text-primary hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                      >
                        <Info className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => handleDeleteContact(contact.id)}
                        className="w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                      >
                        <X className="w-5 h-5" />
                      </button>
                      <a href={`tel:${contact.phone}`} className="w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400 hover:text-primary hover:bg-red-50 dark:hover:bg-red-900/20 transition-all">
                        <Phone className="w-5 h-5" />
                      </a>
                    </div>
                  </div>
                ))}
                <button 
                  onClick={() => openContactModal()}
                  className="border-2 border-dashed border-slate-200 dark:border-slate-800 p-6 rounded-3xl text-slate-400 dark:text-slate-500 font-bold hover:border-primary hover:text-primary transition-all flex items-center justify-center gap-2"
                >
                  <Users className="w-5 h-5" />
                  Add New Contact
                </button>
              </>
            ) : (
              <div className="col-span-full text-center py-12 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
                <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{t.manageContacts}</h3>
                <p className="text-slate-500 dark:text-slate-400 mb-6">{t.manageContactsDesc}</p>
                <Link to="/signin" className="bg-primary text-white px-8 py-3 rounded-full font-bold hover:bg-primary-dark transition-all">
                  {t.signInNow}
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Contact Modal */}
      <AnimatePresence>
        {isContactModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-[40px] p-8 max-w-md w-full shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                  {editingContact ? t.editContact : t.addContact}
                </h3>
                <button onClick={() => setIsContactModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleAddOrUpdateContact} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">{t.name}</label>
                  <input 
                    type="text" required value={contactFormData.name}
                    onChange={(e) => setContactFormData({...contactFormData, name: e.target.value})}
                    placeholder="Mom"
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all dark:text-white"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">{t.relation}</label>
                  <input 
                    type="text" required value={contactFormData.relation}
                    onChange={(e) => setContactFormData({...contactFormData, relation: e.target.value})}
                    placeholder="Mother"
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all dark:text-white"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">{t.phoneNumber}</label>
                  <input 
                    type="tel" required value={contactFormData.phone}
                    onChange={(e) => setContactFormData({...contactFormData, phone: e.target.value})}
                    placeholder="+91 00000 00000"
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all dark:text-white"
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full py-5 rounded-2xl bg-primary text-white font-bold text-lg shadow-xl shadow-red-200 dark:shadow-none hover:bg-primary-dark transition-all"
                >
                  {editingContact ? t.updateContact : t.saveContact}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FAQ Section */}
      <section className="py-24 px-4 transition-colors">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-12 text-center">{t.faqTitle}</h2>
          <div className="space-y-4">
            {[
              { q: t.faq1Q, a: t.faq1A },
              { q: t.faq2Q, a: t.faq2A },
              { q: t.faq3Q, a: t.faq3A }
            ].map((item, i) => (
              <details key={i} className="group glass-card rounded-2xl overflow-hidden">
                <summary className="flex items-center justify-between p-6 cursor-pointer list-none">
                  <span className="font-bold text-slate-900 dark:text-white">{item.q}</span>
                  <ChevronDown className="w-5 h-5 text-slate-400 group-open:rotate-180 transition-transform" />
                </summary>
                <div className="px-6 pb-6 text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                  {item.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>
      {/* Contact Management Modal */}
      <AnimatePresence>
        {isContactModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white dark:bg-slate-900 rounded-[32px] w-full max-w-md p-8 shadow-2xl border border-slate-100 dark:border-slate-800"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  {editingContact ? 'Edit Contact' : 'Add Emergency Contact'}
                </h3>
                <button 
                  onClick={() => setIsContactModalOpen(false)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleAddOrUpdateContact} className="space-y-4">
                <div>
                  <label className="block text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={contactFormData.name}
                    onChange={(e) => setContactFormData({ ...contactFormData, name: e.target.value })}
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-primary focus:bg-white dark:focus:bg-slate-800 rounded-2xl transition-all outline-hidden text-slate-900 dark:text-white font-medium"
                    placeholder="e.g. John Doe"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">Relation</label>
                  <input
                    type="text"
                    required
                    value={contactFormData.relation}
                    onChange={(e) => setContactFormData({ ...contactFormData, relation: e.target.value })}
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-primary focus:bg-white dark:focus:bg-slate-800 rounded-2xl transition-all outline-hidden text-slate-900 dark:text-white font-medium"
                    placeholder="e.g. Father, Spouse, Friend"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={contactFormData.phone}
                    onChange={(e) => setContactFormData({ ...contactFormData, phone: e.target.value })}
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-primary focus:bg-white dark:focus:bg-slate-800 rounded-2xl transition-all outline-hidden text-slate-900 dark:text-white font-medium"
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-red-200 dark:shadow-none hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all mt-4"
                >
                  {editingContact ? 'Update Contact' : 'Save Contact'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default function App() {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });
  const [user, setUser] = useState<any>(null);
  const [language, setLanguage] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('language') as Language) || 'en';
    }
    return 'en';
  });

  // Global SOS States
  const [activeAlertId, setActiveAlertId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isLiveLocationActive, setIsLiveLocationActive] = useState(false);
  const [isSirenActive, setIsSirenActive] = useState(false);
  const [isFlashActive, setIsFlashActive] = useState(false);
  const [location, setLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [isScreenFlashOn, setIsScreenFlashOn] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const watchIdRef = useRef<number | null>(null);

  // Siren and Flash Refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const sirenIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const videoTrackRef = useRef<MediaStreamTrack | null>(null);
  const flashIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  // Siren Logic
  useEffect(() => {
    if (isSirenActive || activeAlertId) {
      try {
        if (!audioCtxRef.current) {
          const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
          audioCtxRef.current = new AudioContextCtor();
        }
        
        const osc = audioCtxRef.current.createOscillator();
        const gainNode = audioCtxRef.current.createGain();
        
        osc.type = 'square';
        osc.connect(gainNode);
        gainNode.connect(audioCtxRef.current.destination);
        
        gainNode.gain.value = 1.0;
        osc.start();
        oscillatorRef.current = osc;

        let isHigh = false;
        sirenIntervalRef.current = setInterval(() => {
          if (oscillatorRef.current && audioCtxRef.current) {
            oscillatorRef.current.frequency.setValueAtTime(isHigh ? 900 : 500, audioCtxRef.current.currentTime);
            isHigh = !isHigh;
          }
        }, 250);
      } catch (e) {
        console.error('Audio siren not supported', e);
      }
    } else {
      if (sirenIntervalRef.current) {
        clearInterval(sirenIntervalRef.current);
        sirenIntervalRef.current = null;
      }
      if (oscillatorRef.current) {
        try { oscillatorRef.current.stop(); } catch (e) {}
        oscillatorRef.current.disconnect();
        oscillatorRef.current = null;
      }
    }
  }, [isSirenActive, activeAlertId]);

  // Flashlight & Screen Flash Logic
  useEffect(() => {
    const startFlash = async () => {
      let isTorchOn = false;
      let hasHardwareTorch = false;
      
      if (isFlashActive || activeAlertId) {
        try {
          if (!streamRef.current) {
            const constraints = {
              video: { facingMode: { ideal: 'environment' } },
              audio: activeAlertId ? true : false // Request audio if SOS is active for recording
            };
            
            try {
              streamRef.current = await navigator.mediaDevices.getUserMedia(constraints);
            } catch (e) {
              // Fallback to basic video if ideal environment fails
              streamRef.current = await navigator.mediaDevices.getUserMedia({ video: true });
            }
          }

          if (streamRef.current && videoRef.current) {
            videoRef.current.srcObject = streamRef.current;
            await videoRef.current.play().catch(() => {});
            
            videoTrackRef.current = streamRef.current.getVideoTracks()[0];
            const capabilities = videoTrackRef.current.getCapabilities ? videoTrackRef.current.getCapabilities() : {} as any;
            hasHardwareTorch = !!capabilities.torch;
          }
        } catch (e) {
          console.error('Camera/Flashlight access error:', e);
        }

        if (activeAlertId || isFlashActive) {
          if (flashIntervalRef.current) clearInterval(flashIntervalRef.current);
          flashIntervalRef.current = setInterval(async () => {
            isTorchOn = !isTorchOn;
            setIsScreenFlashOn(isTorchOn);
            if (hasHardwareTorch && videoTrackRef.current) {
              try {
                await videoTrackRef.current.applyConstraints({
                  advanced: [{ torch: isTorchOn }]
                } as any);
              } catch (e) {
                // If it fails once, it might be a transient error or hardware limitation
              }
            }
          }, 200);
        } else {
          setIsScreenFlashOn(true);
          if (hasHardwareTorch && videoTrackRef.current) {
            try {
              await videoTrackRef.current.applyConstraints({
                advanced: [{ torch: true }]
              } as any);
            } catch (e) {}
          }
        }
      } else {
        if (flashIntervalRef.current) {
          clearInterval(flashIntervalRef.current);
          flashIntervalRef.current = null;
        }
        setIsScreenFlashOn(false);
        if (videoTrackRef.current) {
          try {
            await videoTrackRef.current.applyConstraints({
              advanced: [{ torch: false }]
            } as any);
          } catch (e) {}
          videoTrackRef.current.stop();
          videoTrackRef.current = null;
        }
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(t => t.stop());
          streamRef.current = null;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
      }
    };
    
    startFlash();

    return () => {
      if (flashIntervalRef.current) {
        clearInterval(flashIntervalRef.current);
      }
    };
  }, [isFlashActive, activeAlertId]);

  // Check for active SOS on mount or user change
  useEffect(() => {
    const checkActiveAlert = async () => {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('users_detail')
        .select('id')
        .eq('user_id', user.id)
        .eq('feature_type', 'alert')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (data && data[0]) {
        const alertId = data[0].id;
        setActiveAlertId(alertId);
        startLiveLocation(alertId);
      }
    };

    if (user) {
      checkActiveAlert();
    } else {
      setActiveAlertId(null);
      stopLiveLocation();
    }
  }, [user]);

  // Initial location fetch
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => {
          const errorMsg = err.code === 1 ? "Permission denied" : err.code === 2 ? "Position unavailable" : err.code === 3 ? "Timeout" : "Unknown error";
          console.error(`Location error: ${errorMsg} (${err.message})`);
        }
      );
    }
  }, []);

  const startLiveLocation = (alertId: string) => {
    if (!navigator.geolocation) return;
    setIsLiveLocationActive(true);
    
    watchIdRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const newLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setLocation(newLoc);
        
        let address = `(${newLoc.lat}, ${newLoc.lng})`;
        const apiKey = (import.meta as any).env.VITE_GOOGLE_MAPS_API_KEY;
        
        if (apiKey) {
          try {
            const response = await fetch(
              `https://maps.googleapis.com/maps/api/geocode/json?latlng=${newLoc.lat},${newLoc.lng}&key=${apiKey}`
            );
            const data = await response.json();
            if (data.status === 'OK' && data.results[0]) {
              address = data.results[0].formatted_address;
            }
          } catch (err) {
            console.error("Geocoding error:", err);
          }
        }

        await supabase
          .from('users_detail')
          .update({ 
            location: `(${newLoc.lat}, ${newLoc.lng})`,
            message: `Emergency SOS Triggered. Current Location: ${address}`
          })
          .eq('id', alertId);

        await supabase
          .from('users_detail')
          .insert([{
            feature_type: 'location_log',
            user_id: user?.id || null,
            location: `(${newLoc.lat}, ${newLoc.lng})`,
            message: address,
            status: 'active',
            relation: alertId
          }]);
      },
      (err) => console.error("Watch error:", err),
      { enableHighAccuracy: true }
    );
  };

  const stopLiveLocation = () => {
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsLiveLocationActive(false);
  };

  const startRecording = async (alertId?: string) => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert("Your browser does not support media recording. Please use a modern browser.");
      return false;
    }

    try {
      // If we already have a stream (e.g. from the SOS Flash), reuse it to avoid hardware conflict
      const stream = streamRef.current || await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstart = () => setIsRecording(true);
      recorder.onstop = async () => {
        setIsRecording(false);
        // Only stop tracks if we aren't using the shared SOS stream
        if (!activeAlertId) {
          stream.getTracks().forEach(track => track.stop());
        }

        if (audioChunksRef.current.length > 0 && user) {
          const blob = new Blob(audioChunksRef.current, { type: 'video/webm' });
          try {
            const path = await uploadFile({
              featureName: 'evidence',
              itemId: alertId || activeAlertId || 'standalone',
              file: blob,
              userId: user.id
            });

            await supabase.from('users_detail').insert([{
              feature_type: 'alert_update',
              user_id: user.id,
              message: path,
              status: 'evidence_uploaded',
              relation: alertId || activeAlertId
            }]);
          } catch (err) {
            console.error("Error uploading evidence:", err);
          }
        }
      };
      
      recorder.start();
      
      if (alertId || activeAlertId) {
        await supabase.from('users_detail').insert([{
          feature_type: 'alert_update',
          user_id: user?.id || null,
          message: 'Media recording started for evidence.',
          status: 'recording',
          relation: alertId || activeAlertId
        }]);
      }
      return true;
    } catch (err: any) {
      console.error("Recording error:", err);
      const isPermissionError = err.name === 'NotAllowedError' || 
                               err.name === 'PermissionDeniedError' || 
                               err.message?.includes('Permission dismissed') ||
                               err.message?.includes('denied');
      
      if (isPermissionError) {
        alert("Camera and Microphone permissions are required for emergency evidence recording. Please enable them in your browser settings and try again.");
      } else {
        alert("Could not start recording. Please check your device settings.");
      }
      return false;
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const handleMarkSafe = async () => {
    if (!activeAlertId) return;
    
    try {
      await supabase
        .from('users_detail')
        .update({ status: 'resolved' })
        .eq('id', activeAlertId);
        
      stopLiveLocation();
      stopRecording();
      setActiveAlertId(null);
      setIsSirenActive(false);
      setIsFlashActive(false);
    } catch (err) {
      console.error("Mark safe error:", err);
    }
  };

  const handleSOS = async () => {
    try {
      const { data, error } = await supabase
        .from('users_detail')
        .insert([
          {
            feature_type: 'alert',
            status: 'active',
            message: 'Emergency SOS Triggered via Panic Button',
            name: user?.email || 'Anonymous User',
            phone: 'N/A',
            created_at: new Date().toISOString(),
            user_id: user?.id || null,
            location: location ? `(${location.lat}, ${location.lng})` : 'Location not available'
          }
        ])
        .select();

      if (error) throw error;
      
      if (data && data[0]) {
        const alertId = data[0].id;
        setActiveAlertId(alertId);
        startLiveLocation(alertId);
        setIsSirenActive(true);
        setIsFlashActive(true); // Automatically enable flash on SOS
        
        // Fetch contacts and notify them
        const { data: contacts } = await supabase
          .from('users_detail')
          .select('*')
          .eq('user_id', user?.id)
          .eq('feature_type', 'contact');
        
        if (contacts && contacts.length > 0) {
          const logs = contacts.map(contact => ({
            feature_type: 'alert_update',
            user_id: user?.id || null,
            message: `Emergency SMS notification sent to ${contact.name} (${contact.phone})`,
            status: 'notified',
            relation: alertId
          }));
          await supabase.from('users_detail').insert(logs);
        }
        
        await startRecording(alertId);
      }
    } catch (err) {
      console.error("Failed to log SOS alert:", err);
    }
  };

  const handleSiren = React.useCallback(() => setIsSirenActive(prev => !prev), []);
  const handleFlash = React.useCallback(() => setIsFlashActive(prev => !prev), []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  const toggleDarkMode = () => setDarkMode(!darkMode);

  const t = translations[language];

  return (
    <Router>
      <div className="min-h-screen transition-colors">
        <video ref={videoRef} autoPlay playsInline muted className="hidden" />
        <Navbar 
          darkMode={darkMode} 
          toggleDarkMode={toggleDarkMode} 
          user={user} 
          currentLanguage={language}
          setLanguage={setLanguage}
        />

        {/* Screen Flash Overlay */}
        {isScreenFlashOn && (
          <div className="pointer-events-none fixed inset-0 z-[100] bg-red-600/40 border-[8px] sm:border-[16px] border-red-600 transition-none" />
        )}
        
        <Chatbot currentLanguage={language} />
        
        {/* Global SOS Banner */}
        <AnimatePresence>
          {activeAlertId && (
            <motion.div
              initial={{ y: -100 }}
              animate={{ y: 0 }}
              exit={{ y: -100 }}
              className="fixed top-20 left-0 right-0 z-50 px-4 pointer-events-none"
            >
              <div className="max-w-md mx-auto bg-red-600 text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between pointer-events-auto border-2 border-red-400">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center animate-pulse">
                    <Shield className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-black uppercase tracking-tighter text-sm">Emergency Active</p>
                    <p className="text-[10px] opacity-80 font-bold uppercase tracking-widest">Help is on the way</p>
                  </div>
                </div>
                <button 
                  onClick={handleMarkSafe}
                  className="bg-white text-red-600 px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-red-50 transition-colors"
                >
                  I am Safe
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <Routes>
          <Route path="/" element={
            <Home 
              user={user} 
              currentLanguage={language} 
              activeAlertId={activeAlertId}
              handleSOS={handleSOS}
              handleMarkSafe={handleMarkSafe}
              isRecording={isRecording}
              isLiveLocationActive={isLiveLocationActive}
              isSirenActive={isSirenActive}
              isFlashActive={isFlashActive}
              handleSiren={handleSiren}
              handleFlash={handleFlash}
              location={location}
              startRecording={startRecording}
              stopRecording={stopRecording}
            />
          } />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/dashboard" element={<Dashboard currentLanguage={language} />} />
          <Route path="/map" element={<LiveMap />} />
          <Route path="/instagram-report" element={<InstagramReportPage user={user} />} />
        </Routes>

        {/* Footer */}
        <footer className="py-12 px-4 bg-slate-900 text-white transition-colors">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-2">
              <Shield className="text-primary w-6 h-6" />
              <span className="text-xl font-bold tracking-tight">{APP_CONFIG.APP_NAME}</span>
            </div>
            
            <p className="text-slate-400 text-sm text-center md:text-left max-w-md">
              {t.footerNote}
            </p>

            <div className="flex gap-6">
              <a href="#" className="text-slate-400 hover:text-white transition-colors"><Languages className="w-5 h-5" /></a>
              <a href="#" className="text-slate-400 hover:text-white transition-colors"><Smartphone className="w-5 h-5" /></a>
            </div>
          </div>
          <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-slate-800 text-center text-slate-500 text-xs">
            {t.copyright}
          </div>
        </footer>

        {/* Floating SOS (Mobile Only) */}
        <div className="fixed bottom-6 right-6 md:hidden z-40">
          <button 
            onClick={() => window.location.href = `tel:${APP_CONFIG.EMERGENCY_NUMBERS.GENERAL}`}
            className="w-16 h-16 bg-primary rounded-full shadow-2xl flex items-center justify-center text-white animate-sos"
          >
            <Shield className="w-8 h-8" />
          </button>
        </div>
      </div>
    </Router>
  );
}
