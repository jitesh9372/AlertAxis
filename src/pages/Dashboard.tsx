import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Shield, 
  AlertCircle, 
  MapPin, 
  Users, 
  History, 
  Settings, 
  LogOut, 
  User as UserIcon,
  Phone,
  CheckCircle2,
  ChevronRight,
  Bell,
  X,
  Camera,
  Trash2,
  Loader2,
  Video,
  Mic,
  Navigation
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../supabaseClient';
import { APP_CONFIG } from '../constants';
import { cn } from '../lib/utils';
import { uploadFile, getSignedUrl, deleteFile } from '../lib/storage';
import { v4 as uuidv4 } from 'uuid';

import { translations, Language } from '../i18n/translations';

export default function Dashboard({ currentLanguage = 'en' }: { currentLanguage?: Language }) {
  const [user, setUser] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<any>(null);
  const [hasPermissions, setHasPermissions] = useState<boolean | null>(null);
  const [profileData, setProfileData] = useState({ name: '', phone: '' });
  const [profileUpdateStatus, setProfileUpdateStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const [isSOSActive, setIsSOSActive] = useState(false);
  const [isScreenFlashOn, setIsScreenFlashOn] = useState(false);

  const videoTrackRef = useRef<MediaStreamTrack | null>(null);
  const flashIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const sirenIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);

  const stopSOS = useCallback(() => {
    if (flashIntervalRef.current) {
      clearInterval(flashIntervalRef.current);
      flashIntervalRef.current = null;
    }
    if (sirenIntervalRef.current) {
      clearInterval(sirenIntervalRef.current);
      sirenIntervalRef.current = null;
    }
    if (oscillatorRef.current) {
      try { oscillatorRef.current.stop(); } catch (e) {}
      oscillatorRef.current.disconnect();
      oscillatorRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(console.error);
      audioCtxRef.current = null;
    }
    if (videoTrackRef.current) {
      try {
        videoTrackRef.current.applyConstraints({
          advanced: [{ torch: false }]
        }).catch(console.error);
      } catch (e) {
        console.error('Error turning off flashlight', e);
      }
      setTimeout(() => {
        if (videoTrackRef.current) {
          videoTrackRef.current.stop();
          videoTrackRef.current = null;
        }
      }, 100);
    }
    if (videoElementRef.current) {
      videoElementRef.current.srcObject = null;
    }
    setIsSOSActive(false);
    setIsScreenFlashOn(false);
  }, []);

  useEffect(() => {
    return () => {
      stopSOS();
    };
  }, [stopSOS]);

  const t = translations[currentLanguage];

  useEffect(() => {
    const checkPermissions = async () => {
      try {
        const micPermission = await navigator.permissions.query({ name: 'microphone' as any });
        const camPermission = await navigator.permissions.query({ name: 'camera' as any });
        
        const updateStatus = () => {
          setHasPermissions(micPermission.state === 'granted' && camPermission.state === 'granted');
        };

        micPermission.onchange = updateStatus;
        camPermission.onchange = updateStatus;
        updateStatus();
      } catch (e) {
        // Fallback for browsers that don't support permission query for cam/mic
        setHasPermissions(null);
      }
    };
    checkPermissions();
  }, []);

  const requestPermissions = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      stream.getTracks().forEach(track => track.stop());
      setHasPermissions(true);
    } catch (err) {
      setHasPermissions(false);
      alert("Please enable camera and microphone permissions in your browser settings to use emergency recording features.");
    }
  };
  const [contactFormData, setContactFormData] = useState({ name: '', relation: '', phone: '', photo_path: '' });
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarPath, setAvatarPath] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingContactPhoto, setIsUploadingContactPhoto] = useState(false);
  const [contactPhotoUrl, setContactPhotoUrl] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserAndData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/signin');
        return;
      }
      setUser(session.user);

      // Fetch profile data
      const { data: profileRecord } = await supabase
        .from('users_detail')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('feature_type', 'profile')
        .single();
      
      if (profileRecord) {
        setProfileData({ name: profileRecord.name || '', phone: profileRecord.phone || '' });
      }

      // Fetch avatar
      const { data: avatarData } = await supabase
        .from('users_detail')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('feature_type', 'profile_avatar')
        .single();
      
      if (avatarData?.message) {
        setAvatarPath(avatarData.message);
        const url = await getSignedUrl(avatarData.message);
        setAvatarUrl(url);
      }

      // Fetch activities (alerts and updates)
      const { data: activitiesData, error: activitiesError } = await supabase
        .from('users_detail')
        .select('*')
        .eq('user_id', session.user.id)
        .in('feature_type', ['alert', 'alert_update'])
        .order('created_at', { ascending: false });

      if (activitiesError) console.error('Error fetching activities:', activitiesError);
      else {
        const activitiesWithUrls = await Promise.all((activitiesData || []).map(async (act) => {
          if (act.status === 'evidence_uploaded' && act.message) {
            try {
              const url = await getSignedUrl(act.message);
              return { ...act, evidence_url: url };
            } catch (e) {
              return act;
            }
          }
          return act;
        }));
        setActivities(activitiesWithUrls);
      }

      // Fetch contacts
      const { data: contactsData, error: contactsError } = await supabase
        .from('users_detail')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('feature_type', 'contact')
        .order('created_at', { ascending: true });
      
      if (contactsError) console.error('Error fetching contacts:', contactsError);
      else {
        const contactsWithUrls = await Promise.all((contactsData || []).map(async (c) => {
          if (c.message && c.message.startsWith(session.user.id)) {
            try {
              const url = await getSignedUrl(c.message);
              return { ...c, photo_url: url };
            } catch (e) {
              return c;
            }
          }
          return c;
        }));
        setContacts(contactsWithUrls);
      }
      
      setLoading(false);
    };

    fetchUserAndData();
  }, [navigate]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setProfileUpdateStatus('loading');

    try {
      const { data: existingProfile } = await supabase
        .from('users_detail')
        .select('id')
        .eq('user_id', user.id)
        .eq('feature_type', 'profile')
        .single();

      if (existingProfile) {
        await supabase
          .from('users_detail')
          .update({ name: profileData.name, phone: profileData.phone })
          .eq('id', existingProfile.id);
      } else {
        await supabase
          .from('users_detail')
          .insert([{
            user_id: user.id,
            feature_type: 'profile',
            name: profileData.name,
            phone: profileData.phone
          }]);
      }
      
      setProfileUpdateStatus('success');
      setTimeout(() => {
        setProfileUpdateStatus('idle');
        setIsProfileModalOpen(false);
      }, 2000);
    } catch (err) {
      console.error('Error updating profile:', err);
      setProfileUpdateStatus('idle');
    }
  };

  const fetchContacts = React.useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('users_detail')
      .select('*')
      .eq('user_id', user.id)
      .eq('feature_type', 'contact')
      .order('created_at', { ascending: true });
    
    if (error) console.error('Error fetching contacts:', error);
    else {
      const contactsWithUrls = await Promise.all((data || []).map(async (c) => {
        if (c.message && c.message.startsWith(user.id)) {
          try {
            const url = await getSignedUrl(c.message);
            return { ...c, photo_url: url };
          } catch (e) {
            return c;
          }
        }
        return c;
      }));
      setContacts(contactsWithUrls);
    }
  }, [user]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsUploadingAvatar(true);
    try {
      // Delete old avatar if exists
      if (avatarPath) {
        await deleteFile(avatarPath);
      }

      const path = await uploadFile({
        featureName: 'profile',
        itemId: 'avatar',
        file,
        userId: user.id
      });

      // Update or insert avatar record
      const { data: existingAvatar } = await supabase
        .from('users_detail')
        .select('id')
        .eq('user_id', user.id)
        .eq('feature_type', 'profile_avatar')
        .single();

      if (existingAvatar) {
        await supabase
          .from('users_detail')
          .update({ message: path })
          .eq('id', existingAvatar.id);
      } else {
        await supabase
          .from('users_detail')
          .insert([{
            user_id: user.id,
            feature_type: 'profile_avatar',
            message: path
          }]);
      }

      setAvatarPath(path);
      const url = await getSignedUrl(path);
      setAvatarUrl(url);
    } catch (err) {
      console.error('Error uploading avatar:', err);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleContactPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsUploadingContactPhoto(true);
    try {
      // If editing and has old photo, we'll delete it on save or now?
      // Let's just upload and set path in form data
      const path = await uploadFile({
        featureName: 'contacts',
        itemId: editingContact?.id || 'new',
        file,
        userId: user.id
      });

      setContactFormData(prev => ({ ...prev, photo_path: path }));
      const url = await getSignedUrl(path);
      setContactPhotoUrl(url);
    } catch (err) {
      console.error('Error uploading contact photo:', err);
    } finally {
      setIsUploadingContactPhoto(false);
    }
  };

  const handleAddOrUpdateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const contactData = {
      name: contactFormData.name,
      relation: contactFormData.relation,
      phone: contactFormData.phone,
      message: contactFormData.photo_path, // Storing photo path in message field
      user_id: user.id,
      feature_type: 'contact'
    };

    try {
      if (editingContact) {
        // If photo changed, delete old one
        if (editingContact.message && editingContact.message !== contactFormData.photo_path) {
          await deleteFile(editingContact.message);
        }

        const { error } = await supabase
          .from('users_detail')
          .update(contactData)
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
      setContactFormData({ name: '', relation: '', phone: '', photo_path: '' });
      setContactPhotoUrl(null);
      fetchContacts();
    } catch (err) {
      console.error('Error saving contact:', err);
    }
  };

  const handleDeleteContact = async (contact: any) => {
    try {
      if (contact.message) {
        await deleteFile(contact.message);
      }

      const { error } = await supabase
        .from('users_detail')
        .delete()
        .eq('id', contact.id);
      
      if (error) throw error;
      fetchContacts();
    } catch (err) {
      console.error('Error deleting contact:', err);
    }
  };

  const openContactModal = async (contact: any = null) => {
    if (contact) {
      setEditingContact(contact);
      setContactFormData({ 
        name: contact.name, 
        relation: contact.relation, 
        phone: contact.phone,
        photo_path: contact.message || ''
      });
      if (contact.message) {
        const url = await getSignedUrl(contact.message);
        setContactPhotoUrl(url);
      } else {
        setContactPhotoUrl(null);
      }
    } else {
      setEditingContact(null);
      setContactFormData({ name: '', relation: '', phone: '', photo_path: '' });
      setContactPhotoUrl(null);
    }
    setIsContactModalOpen(true);
  };

  const handleSignOut = React.useCallback(async () => {
    await supabase.auth.signOut();
    navigate('/signin');
  }, [navigate]);

  const handleSOS = useCallback(async () => {
    setIsSOSActive(true);
    
    // Start Audio Siren
    try {
      const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextCtor();
      audioCtxRef.current = ctx;
      
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc.type = 'square';
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      gainNode.gain.value = 0.5;
      osc.start();
      oscillatorRef.current = osc;

      let isHigh = false;
      sirenIntervalRef.current = setInterval(() => {
        if (oscillatorRef.current) {
          oscillatorRef.current.frequency.setValueAtTime(isHigh ? 900 : 500, ctx.currentTime);
          isHigh = !isHigh;
        }
      }, 250);
    } catch (e) {
      console.error('Audio siren not supported', e);
    }

    let hasTorch = false;
    try {
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { exact: 'environment' } }
        });
      } catch (e) {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });
      }
      
      if (videoElementRef.current) {
        videoElementRef.current.srcObject = stream;
        videoElementRef.current.play().catch(console.error);
      }

      const track = stream.getVideoTracks()[0];
      videoTrackRef.current = track;
      
      try {
        await track.applyConstraints({ advanced: [{ torch: true }] });
        hasTorch = true;
      } catch (e) {
        console.log('Torch initial activation failed', e);
        const capabilities = track.getCapabilities ? track.getCapabilities() : {} as any;
        if (capabilities.torch) {
          hasTorch = true;
        } else {
          track.stop();
        }
      }
    } catch (err) {
      console.error('Error accessing flashlight hardware:', err);
    }

    let isFlashOn = true;
    setIsScreenFlashOn(true);

    flashIntervalRef.current = setInterval(() => {
      isFlashOn = !isFlashOn;
      setIsScreenFlashOn(isFlashOn);
      
      if (hasTorch && videoTrackRef.current) {
        videoTrackRef.current.applyConstraints({
          advanced: [{ torch: isFlashOn }]
        }).catch(console.error);
      }
    }, 200); // Fast strobe effect
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pt-20 pb-12 px-4 sm:px-6 lg:px-8 transition-colors">
      <video ref={videoElementRef} autoPlay playsInline muted className="hidden" />
      {/* Screen Flash Overlay */}
      {isScreenFlashOn && (
        <div className="pointer-events-none fixed inset-0 z-[100] bg-red-600/40 border-[8px] sm:border-[16px] border-red-600 transition-none" />
      )}
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">{t.userDashboard}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">{t.welcomeBack}, {profileData.name || user?.email}</p>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="relative">
              <button 
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-primary transition-all relative"
              >
                <Bell className="w-5 h-5" />
                {activities.length > 0 && (
                  <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full"></span>
                )}
              </button>
              
              <AnimatePresence>
                {isNotificationsOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-[calc(100vw-2rem)] sm:w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl z-50 overflow-hidden"
                  >
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                      <h3 className="font-bold text-slate-900 dark:text-white">{t.notifications}</h3>
                      <button onClick={() => setIsNotificationsOpen(false)}><X className="w-4 h-4 text-slate-400" /></button>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {activities.length > 0 ? (
                        activities.slice(0, 5).map((activity) => (
                          <div key={activity.id} className="p-4 border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                            <div className="flex gap-3">
                              <div className="w-8 h-8 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center shrink-0">
                                <AlertCircle className="w-4 h-4 text-primary" />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-slate-900 dark:text-white capitalize">{activity.feature_type.replace('_', ' ')}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{activity.status || 'New activity recorded'}</p>
                                <p className="text-[10px] text-slate-400 mt-1">{new Date(activity.created_at).toLocaleString()}</p>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-8 text-center">
                          <Bell className="w-8 h-8 text-slate-200 dark:text-slate-800 mx-auto mb-2" />
                          <p className="text-sm text-slate-500 dark:text-slate-400">{t.noNotifications}</p>
                        </div>
                      )}
                    </div>
                    {activities.length > 0 && (
                      <button className="w-full p-3 text-xs font-bold text-primary hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                        {t.viewAll}
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <button 
              onClick={handleSignOut}
              className="flex items-center gap-2 px-5 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-600 dark:text-slate-400 hover:text-red-500 transition-all font-bold"
            >
              <LogOut className="w-5 h-5" />
              {t.signOut}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Profile & Quick Actions */}
          <div className="space-y-8">
            {/* Permission Warning */}
            {hasPermissions === false && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-2xl flex items-start gap-3"
              >
                <AlertCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">Permissions Required</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 mb-3">
                    Camera and microphone access are needed for emergency evidence recording.
                  </p>
                  <button 
                    onClick={requestPermissions}
                    className="text-xs font-black text-primary hover:underline flex items-center gap-1"
                  >
                    Enable Now <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* Profile Card */}
            <div className="glass-card p-6 rounded-[32px]">
              <div className="flex items-center gap-4 mb-6">
                <div className="relative group">
                  <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-center justify-center overflow-hidden border-2 border-transparent group-hover:border-primary transition-all">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <UserIcon className="text-primary w-8 h-8" />
                    )}
                    {isUploadingAvatar && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <Loader2 className="w-6 h-6 text-white animate-spin" />
                      </div>
                    )}
                  </div>
                  <label className="absolute -bottom-2 -right-2 w-8 h-8 bg-white dark:bg-slate-800 rounded-full shadow-lg flex items-center justify-center cursor-pointer hover:bg-primary hover:text-white transition-all border border-slate-100 dark:border-slate-700">
                    <Camera className="w-4 h-4" />
                    <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} disabled={isUploadingAvatar} />
                  </label>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t.profileInfo}</h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">{t.verifiedUser}</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                  <p className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mb-1">{t.emailLabel}</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{user?.email}</p>
                </div>
                {profileData.name && (
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                    <p className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mb-1">{t.fullNameLabel}</p>
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{profileData.name}</p>
                  </div>
                )}
                {profileData.phone && (
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                    <p className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mb-1">{t.phoneLabel}</p>
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{profileData.phone}</p>
                  </div>
                )}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                  <p className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mb-1">{t.memberSince}</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {new Date(user?.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsProfileModalOpen(true)}
                className="w-full mt-6 py-4 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
              >
                <Settings className="w-5 h-5" />
                {t.editProfile}
              </button>
            </div>

            {/* Live Mapping Card */}
            <div className="glass-card p-6 rounded-[32px] border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
                  <MapPin className="text-primary w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t.liveMapping}</h3>
                  <p className="text-xs text-slate-500">Real-time location system</p>
                </div>
              </div>
              <button 
                onClick={() => navigate('/map')}
                className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-lg shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
              >
                <Navigation className="w-6 h-6" />
                {t.openLiveMap}
              </button>
            </div>

            {/* Quick SOS Card */}
            <div className={`p-8 rounded-[32px] text-white shadow-2xl relative overflow-hidden transition-colors ${
              isSOSActive ? 'bg-red-600 animate-pulse shadow-red-500/50' : 'bg-primary shadow-red-200 dark:shadow-none'
            }`}>
              <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
              <h3 className="text-2xl font-bold mb-2">
                {isSOSActive ? 'SOS ACTIVE' : t.emergencySOS}
              </h3>
              <p className="text-white/70 text-sm mb-6">
                {isSOSActive 
                  ? 'Flashlight and siren activated. Help is on the way.' 
                  : 'Instantly trigger a loud siren and flashlight.'}
              </p>
              
              {isSOSActive ? (
                <div className="flex flex-col gap-3">
                  <a 
                    href={`tel:${APP_CONFIG.EMERGENCY_NUMBERS.GENERAL}`}
                    className="w-full py-4 bg-white text-red-600 rounded-2xl font-black text-lg shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                  >
                    <Phone className="w-6 h-6" />
                    Call Now
                  </a>
                  <button 
                    onClick={stopSOS}
                    className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black text-lg shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 border border-emerald-400"
                  >
                    <CheckCircle2 className="w-6 h-6" />
                    I am safe
                  </button>
                </div>
              ) : (
                <button 
                  onClick={handleSOS}
                  className="w-full py-4 bg-white text-primary rounded-2xl font-black text-lg shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                >
                  <Shield className="w-6 h-6" />
                  {t.triggerSOS}
                </button>
              )}
            </div>
          </div>

          {/* Middle Column: Recent Alerts */}
          <div className="lg:col-span-2 space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="glass-card p-6 rounded-3xl">
                <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center mb-4">
                  <History className="text-blue-500 w-5 h-5" />
                </div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{activities.length}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{t.totalActivities}</p>
              </div>
              <div className="glass-card p-6 rounded-3xl">
                <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl flex items-center justify-center mb-4">
                  <CheckCircle2 className="text-emerald-500 w-5 h-5" />
                </div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {activities.filter(a => a.status === 'resolved').length}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{t.resolved}</p>
              </div>
              <div className="glass-card p-6 rounded-3xl">
                <div className="w-10 h-10 bg-red-50 dark:bg-red-900/20 rounded-xl flex items-center justify-center mb-4">
                  <AlertCircle className="text-primary w-5 h-5" />
                </div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {activities.filter(a => a.status === 'active').length}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{t.activeAlerts}</p>
              </div>
            </div>

            {/* Activities List */}
            <div className="glass-card p-8 rounded-[32px]">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <History className="w-6 h-6 text-primary" />
                  {t.recentActivity}
                </h3>
                <button className="text-sm font-bold text-primary hover:underline">{t.viewAll}</button>
              </div>

              <div className="space-y-4">
                {activities.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                      <History className="text-slate-400 w-8 h-8" />
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">{t.noActivity}</p>
                  </div>
                ) : (
                  activities.slice(0, 5).map((activity) => (
                    <div key={activity.id} className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between group hover:border-primary/30 transition-all">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-12 h-12 rounded-xl flex items-center justify-center",
                          activity.status === 'active' ? "bg-red-50 dark:bg-red-900/20 text-primary" : "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500"
                        )}>
                          {activity.status === 'active' ? <AlertCircle className="w-6 h-6" /> : <CheckCircle2 className="w-6 h-6" />}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 dark:text-white truncate max-w-[200px] sm:max-w-md">
                            {activity.status === 'evidence_uploaded' ? 'Evidence Recording' : activity.message}
                          </h4>
                          <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                            {new Date(activity.created_at).toLocaleString()}
                          </p>
                          {activity.evidence_url && (
                            <div className="mt-3">
                              <video 
                                src={activity.evidence_url} 
                                controls 
                                className="w-full max-w-xs rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-primary transition-colors" />
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Emergency Contacts (ICE) */}
            <div className="glass-card p-8 rounded-[32px]">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="w-6 h-6 text-primary" />
                  {t.iceContactsTitle}
                </h3>
                <button 
                  onClick={() => openContactModal()}
                  className="text-sm font-bold text-primary hover:underline"
                >
                  {t.manage}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {contacts.length === 0 ? (
                  <div className="col-span-full text-center py-8 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                    <p className="text-slate-500 dark:text-slate-400 text-sm">{t.noContacts}</p>
                  </div>
                ) : (
                  contacts.map((contact) => (
                    <div key={contact.id} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center font-bold text-slate-600 dark:text-slate-400 overflow-hidden">
                          {contact.photo_url ? (
                            <img src={contact.photo_url} alt={contact.name} className="w-full h-full object-cover" />
                          ) : (
                            contact.name[0]
                          )}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 dark:text-white text-sm">{contact.name}</h4>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">{contact.relation}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => openContactModal(contact)}
                          className="w-8 h-8 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center text-slate-400 hover:text-primary transition-all"
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteContact(contact)}
                          className="w-8 h-8 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center text-slate-400 hover:text-red-500 transition-all"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        <a href={`tel:${contact.phone}`} className="w-8 h-8 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center text-slate-400 hover:text-primary transition-all">
                          <Phone className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  ))
                )}
                <button 
                  onClick={() => openContactModal()}
                  className="border-2 border-dashed border-slate-200 dark:border-slate-800 p-4 rounded-2xl text-slate-400 dark:text-slate-500 font-bold hover:border-primary hover:text-primary transition-all flex items-center justify-center gap-2 text-sm"
                >
                  <Users className="w-4 h-4" />
                  {t.addNew}
                </button>
              </div>
            </div>

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
                        {editingContact ? 'Edit Contact' : 'Add Contact'}
                      </h3>
                      <button onClick={() => setIsContactModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                        <X className="w-6 h-6" />
                      </button>
                    </div>

                    <form onSubmit={handleAddOrUpdateContact} className="space-y-6">
                      <div className="flex flex-col items-center mb-6">
                        <div className="relative group">
                          <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center overflow-hidden border-4 border-white dark:border-slate-900 shadow-xl">
                            {contactPhotoUrl ? (
                              <img src={contactPhotoUrl} alt="Contact" className="w-full h-full object-cover" />
                            ) : (
                              <UserIcon className="w-10 h-10 text-slate-400" />
                            )}
                            {isUploadingContactPhoto && (
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                <Loader2 className="w-6 h-6 text-white animate-spin" />
                              </div>
                            )}
                          </div>
                          <label className="absolute bottom-0 right-0 w-8 h-8 bg-primary text-white rounded-full shadow-lg flex items-center justify-center cursor-pointer hover:bg-primary-dark transition-all">
                            <Camera className="w-4 h-4" />
                            <input type="file" className="hidden" accept="image/*" onChange={handleContactPhotoUpload} disabled={isUploadingContactPhoto} />
                          </label>
                          {contactPhotoUrl && (
                            <button 
                              type="button"
                              onClick={async () => {
                                if (contactFormData.photo_path) {
                                  await deleteFile(contactFormData.photo_path);
                                  setContactFormData(prev => ({ ...prev, photo_path: '' }));
                                  setContactPhotoUrl(null);
                                }
                              }}
                              className="absolute top-0 right-0 w-8 h-8 bg-white dark:bg-slate-800 text-red-500 rounded-full shadow-lg flex items-center justify-center hover:bg-red-50 transition-all border border-slate-100 dark:border-slate-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-3">Contact Photo</p>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Name</label>
                        <input 
                          type="text" required value={contactFormData.name}
                          onChange={(e) => setContactFormData({...contactFormData, name: e.target.value})}
                          placeholder="Mom"
                          className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all dark:text-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Relation</label>
                        <input 
                          type="text" required value={contactFormData.relation}
                          onChange={(e) => setContactFormData({...contactFormData, relation: e.target.value})}
                          placeholder="Mother"
                          className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all dark:text-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Phone Number</label>
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
                        {editingContact ? 'Update Contact' : 'Save Contact'}
                      </button>
                    </form>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
        {/* Edit Profile Modal */}
        <AnimatePresence>
          {isProfileModalOpen && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsProfileModalOpen(false)}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl overflow-hidden"
              >
                <div className="p-8">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white">{t.updateProfile}</h2>
                    <button onClick={() => setIsProfileModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                      <X className="w-6 h-6 text-slate-400" />
                    </button>
                  </div>

                  <form onSubmit={handleUpdateProfile} className="space-y-6">
                    <div>
                      <label className="block text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">{t.fullNameLabel}</label>
                      <input 
                        type="text" 
                        required
                        value={profileData.name}
                        onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                        className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-primary rounded-2xl outline-none transition-all text-slate-900 dark:text-white font-medium"
                        placeholder="John Doe"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">{t.phoneLabel}</label>
                      <input 
                        type="tel" 
                        required
                        value={profileData.phone}
                        onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                        className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-primary rounded-2xl outline-none transition-all text-slate-900 dark:text-white font-medium"
                        placeholder="+91 98765 43210"
                      />
                    </div>

                    <button 
                      type="submit"
                      disabled={profileUpdateStatus === 'loading'}
                      className="w-full py-5 bg-primary text-white rounded-2xl font-black uppercase tracking-widest hover:bg-primary-dark transition-all shadow-xl shadow-red-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {profileUpdateStatus === 'loading' ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : profileUpdateStatus === 'success' ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : null}
                      {profileUpdateStatus === 'success' ? t.profileUpdated : t.saveChanges}
                    </button>
                  </form>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
