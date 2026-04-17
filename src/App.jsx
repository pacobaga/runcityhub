import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Calendar as CalendarIcon, MapPin, Clock, Info, Users, PlusCircle, ChevronRight, 
  Instagram, ExternalLink, Filter, ArrowLeft, CheckCircle2, 
  AlertTriangle, Trophy, ChevronDown, Search, Bell, Loader2, X, Check, Trash2, Lock,
  Globe, CalendarDays, Zap, Settings, Map, Store, Menu as MenuIcon, ChevronLeft, Send, Briefcase, EyeOff, Play, Pause, Edit2, MessageCircle, Mail, Smartphone, LogIn, Share2, Download, Copy, Upload
} from 'lucide-react';
import html2canvas from 'https://esm.sh/html2canvas@1.4.1';

// --- FIREBASE IMPORTS ---
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';

// --- CONFIGURACIÓN DE FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyCZIaz2nRIarTQ0ZHWadqBFUTwpG9H_j6s",
  authDomain: "city-run-hub.firebaseapp.com",
  projectId: "city-run-hub",
  storageBucket: "city-run-hub.firebasestorage.app",
  messagingSenderId: "75213815459",
  appId: "1:75213815459:web:6e90ba0a4e729f9d14c916",
  measurementId: "G-3F4MW7LRWP"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const FIREBASE_APP_ID = 'city-run-hub-prod';

// --- ROLES DE ADMINISTRADOR ---
const ADMIN_ROLES = {
  'admin@runcityhub.com': { role: 'master', city: 'ALL' },
  'pacobaga@gmail.com': { role: 'master', city: 'ALL' },
  'pachuca@runcityhub.com': { role: 'city_manager', city: 'Pachuca' },
  'qro@runcityhub.com': { role: 'city_manager', city: 'Querétaro' },
  'mty@runcityhub.com': { role: 'city_manager', city: 'Monterrey' },
  'gdl@runcityhub.com': { role: 'city_manager', city: 'Guadalajara' }
};

// --- DATOS MAESTROS ---
const HARDCODED_CITIES = [
  { id: 'default-cdmx', name: 'CDMX' },
  { id: 'default-pac', name: 'Pachuca' },
  { id: 'default-qro', name: 'Querétaro' },
  { id: 'default-gdl', name: 'Guadalajara' },
  { id: 'default-mty', name: 'Monterrey' }
];

const HARDCODED_ZONES = [
  { name: "POLANCO", city: "CDMX" }, { name: "ROMA", city: "CDMX" }, 
  { name: "CONDESA", city: "CDMX" }, { name: "CHAPULTEPEC I", city: "CDMX" }, 
  { name: "CHAPULTEPEC II", city: "CDMX" }, { name: "REFORMA", city: "CDMX" }, 
  { name: "ESTELA DE LUZ", city: "CDMX" }, { name: "C.U.", city: "CDMX" }, 
  { name: "COYOACÁN", city: "CDMX" }, { name: "TLALPAN", city: "CDMX" }, 
  { name: "SANTA FE", city: "CDMX" },
  { name: "Revolución", city: "Pachuca" }, { name: "Parque Cultural Hidalguense", city: "Pachuca" },
  { name: "Río de las Avenidas", city: "Pachuca" }
];

const RUN_TYPES = {
  SR: { label: "Social Run", color: "bg-palemint text-petrol border-turquoise", desc: "Suave / Recreativo" },
  LD: { label: "Long Distance", color: "bg-amber-50 text-amber-700 border-amber-200", desc: "Fondos y Distancia" },
  T: { label: "Técnica", color: "bg-emerald-50 text-emerald-700 border-emerald-100", desc: "Velocidad / Series" },
  TR: { label: "Trail Run", color: "bg-orange-50 text-orange-800 border-orange-200", desc: "Montaña / Desnivel" },
  EE: { label: "Evento Especial", color: "bg-blue-50 text-blue-700 border-blue-200", desc: "Pop-ups y Marcas" }
};

const EVENT_CATEGORIES = [
  "Entrenamiento",
  "Carrera Local",
  "Evento Social",
  "Pop-up / Marca"
];

const dayNames = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

const getMonday = (d) => {
  d = new Date(d);
  const day = d.getDay(), diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
};

// Función global para subir logos a Firestore en Base64
const handleLogoUpload = async (e, clubId) => {
  const file = e.target.files[0];
  if(!file) return;
  if(file.size > 500000) {
    return alert("La imagen es muy pesada. Por favor usa una imagen menor a 500KB.");
  }
  const reader = new FileReader();
  reader.onloadend = async () => {
    try {
      await updateDoc(doc(db, 'artifacts', FIREBASE_APP_ID, 'public', 'data', 'clubs', clubId), { logoUrl: reader.result });
      alert("Logo actualizado correctamente.");
    } catch(err) {
      alert("Error al subir el logo: " + err.message);
    }
  };
  reader.readAsDataURL(file);
};

// ==========================================
// COMPONENTE: PANEL DE CLUBES
// ==========================================
const ClubPanel = ({ user, club, events, races, allZones, onClose }) => {
  const [activeTab, setActiveTab] = useState('events');
  const [newEvent, setNewEvent] = useState({ 
    day: 'Lunes', specificDate: '', time: '07:00', 
    zone: '', type: 'SR', category: 'Entrenamiento', location: '', isRecurring: true 
  });
  
  const [newRace, setNewRace] = useState({ name: '', date: '', distance: '', zone: '', link: '', city: club.city });

  // Estados para el Generador de Flyers
  const [selectedFlyerEvent, setSelectedFlyerEvent] = useState(null);
  const flyerRef = useRef(null);

  const myEvents = useMemo(() => {
    return events.filter(e => e.clubId === club.id || e.organizerEmail === club.email)
                 .sort((a,b) => (b.createdAt ? new Date(b.createdAt).getTime() : 0) - (a.createdAt ? new Date(a.createdAt).getTime() : 0));
  }, [events, club]);

  const myRaces = useMemo(() => {
    return races.filter(r => r.clubId === club.id)
                .sort((a,b) => new Date(a.date) - new Date(b.date));
  }, [races, club]);

  const clubZones = useMemo(() => allZones.filter(z => z.city === club.city), [allZones, club.city]);

  const handleToggleEvent = async (ev) => {
    const newStatus = ev.status === 'paused' ? 'active' : 'paused';
    await updateDoc(doc(db, 'artifacts', FIREBASE_APP_ID, 'public', 'data', 'events', ev.id), { status: newStatus });
  };

  const handleAddEvent = async (e) => {
    e.preventDefault();
    if(!newEvent.zone) return alert("Selecciona una zona.");
    if(!newEvent.isRecurring && !newEvent.specificDate) return alert("Selecciona una fecha específica.");

    try {
      const eventData = { 
        ...newEvent, 
        clubId: club.id,
        organizerName: club.name,
        organizerEmail: club.email,
        city: club.city,
        status: 'active', 
        createdAt: new Date().toISOString() 
      };
      
      if(eventData.isRecurring) delete eventData.specificDate;
      else delete eventData.day;

      await addDoc(collection(db, 'artifacts', FIREBASE_APP_ID, 'public', 'data', 'events'), eventData);
      alert("Evento publicado exitosamente.");
      setNewEvent({ day: 'Lunes', specificDate: '', time: '07:00', zone: '', type: 'SR', category: 'Entrenamiento', location: '', isRecurring: true });
    } catch (error) {
      alert("Error al publicar evento: " + error.message);
    }
  };

  const handleAddRace = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'artifacts', FIREBASE_APP_ID, 'public', 'data', 'races'), {
        ...newRace,
        clubId: club.id,
        organizerName: club.name
      });
      alert("Carrera publicada.");
      setNewRace({ name: '', date: '', distance: '', zone: '', link: '', city: club.city });
    } catch (error) {
      alert("Error al publicar carrera: " + error.message);
    }
  };

  const downloadFlyer = async () => {
    if (!flyerRef.current) return;
    try {
      const canvas = await html2canvas(flyerRef.current, { scale: 2, backgroundColor: '#1B4353', useCORS: true });
      const image = canvas.toDataURL("image/png");
      const link = document.createElement('a');
      link.href = image;
      link.download = `Flyer_${selectedFlyerEvent.organizerName}_${selectedFlyerEvent.zone}.png`;
      link.click();
    } catch (error) {
      console.error("Error generating flyer", error);
      alert("Hubo un error al generar la imagen.");
    }
  };

  const copyCaption = () => {
    const text = `¡Nos vemos en la pista! ⚡\nÚnete a nuestra próxima sesión.\n\n📍 Toda la info y más eventos en @runcityhub.mx\n\n#RunCityHub #RunningMexico #SocialRun`;
    navigator.clipboard.writeText(text);
    alert("Texto copiado. ¡Listo para pegarlo en tu Historia o Post de Instagram!");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-left font-black relative">
      <nav className="bg-petrol text-white p-6 flex flex-col md:flex-row justify-between items-center shadow-2xl px-12 gap-6 sticky top-0 z-50">
        <div>
          <h2 className="text-2xl font-black uppercase italic tracking-tighter leading-none">PORTAL <span className="text-turquoise">ORGANIZADOR</span></h2>
          <p className="text-[10px] text-mustard uppercase tracking-widest mt-1">{club.name} • {club.city}</p>
        </div>
        <div className="flex flex-wrap justify-center gap-2 items-center">
          <button onClick={() => setActiveTab('events')} className={`px-6 py-2 rounded-full text-[10px] uppercase ${activeTab === 'events' ? 'bg-turquoise text-white shadow-lg' : 'bg-white/10'}`}>Mis Sesiones</button>
          <button onClick={() => setActiveTab('races')} className={`px-6 py-2 rounded-full text-[10px] uppercase ${activeTab === 'races' ? 'bg-turquoise text-white shadow-lg' : 'bg-white/10'}`}>Mis Carreras</button>
          <button onClick={() => setActiveTab('profile')} className={`px-6 py-2 rounded-full text-[10px] uppercase ${activeTab === 'profile' ? 'bg-turquoise text-white shadow-lg' : 'bg-white/10'}`}>Mi Perfil</button>
          <button onClick={async () => { await signOut(auth); onClose(); }} className="ml-4 px-6 py-2 bg-red-500 text-white rounded-full font-black text-[10px] uppercase hover:bg-red-600 transition-colors">Salir</button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-12 w-full font-black text-petrol">
        
        {activeTab === 'events' && (
          <div className="grid md:grid-cols-12 gap-12 text-left font-black">
            <div className="md:col-span-7 space-y-6">
              <h3 className="text-2xl font-black uppercase italic border-b-4 border-turquoise pb-2 inline-block">Mis Sesiones Activas</h3>
              <div className="grid gap-4 max-h-[70vh] overflow-y-auto no-scrollbar pr-4">
                {myEvents.map(ev => (
                  <div key={ev.id} className={`bg-white p-6 rounded-[2.5rem] shadow-sm flex justify-between items-center border border-gray-100 ${ev.status === 'paused' ? 'opacity-50 grayscale bg-gray-50' : ''}`}>
                    <div className="flex items-center gap-5">
                      <div className="p-4 bg-gray-50 rounded-2xl text-petrol">{ev.isRecurring ? <CalendarDays size={20}/> : <Zap size={20}/>}</div>
                      <div>
                        <h4 className="font-black text-lg uppercase italic leading-none">{ev.category || 'Evento'}</h4>
                        <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">
                          {ev.isRecurring ? `TODOS LOS ${ev.day}` : ev.specificDate} • {ev.time} hrs • {ev.zone}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setSelectedFlyerEvent(ev)} className="p-3 bg-blue-50 text-blue-500 rounded-2xl hover:bg-blue-100 transition-colors" title="Generar Flyer IG"><Share2 size={20}/></button>
                      <button onClick={() => handleToggleEvent(ev)} className={`p-3 rounded-2xl ${ev.status === 'paused' ? 'bg-emerald-50 text-emerald-500' : 'bg-amber-50 text-amber-500'}`}>{ev.status === 'paused' ? <Play size={20}/> : <Pause size={20}/>}</button>
                      <button onClick={async () => { if(confirm("¿Eliminar este evento permanentemente?")) await deleteDoc(doc(db, 'artifacts', FIREBASE_APP_ID, 'public', 'data', 'events', ev.id)) }} className="p-3 bg-red-50 text-red-300 rounded-2xl hover:bg-red-100 transition-colors"><Trash2 size={20}/></button>
                    </div>
                  </div>
                ))}
                {myEvents.length === 0 && <p className="text-gray-400 italic">No tienes sesiones registradas aún.</p>}
              </div>
            </div>

            <div className="md:col-span-5">
               <div className="bg-white p-8 rounded-6xl shadow-xl border border-gray-100 sticky top-32">
                 <h3 className="text-xl font-black mb-6 uppercase italic text-petrol flex items-center gap-3"><PlusCircle className="text-turquoise"/> Nueva Sesión</h3>
                 
                 <div className="flex bg-gray-50 p-2 rounded-3xl mb-6">
                    <button type="button" onClick={() => setNewEvent({...newEvent, isRecurring: true})} className={`flex-1 py-3 text-[10px] uppercase font-black rounded-2xl transition-all ${newEvent.isRecurring ? 'bg-petrol text-mustard shadow-md' : 'text-gray-400'}`}>Semanal</button>
                    <button type="button" onClick={() => setNewEvent({...newEvent, isRecurring: false})} className={`flex-1 py-3 text-[10px] uppercase font-black rounded-2xl transition-all ${!newEvent.isRecurring ? 'bg-petrol text-mustard shadow-md' : 'text-gray-400'}`}>Evento Único</button>
                 </div>

                 <form onSubmit={handleAddEvent} className="space-y-4 font-black">
                   
                   <div className="grid grid-cols-2 gap-2">
                     <select className="w-full p-4 bg-gray-50 rounded-2xl font-black outline-none text-xs" value={newEvent.category} onChange={e => setNewEvent({...newEvent, category: e.target.value})}>
                       {EVENT_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                     </select>
                     <select className="w-full p-4 bg-gray-50 rounded-2xl font-black outline-none text-xs" value={newEvent.type} onChange={e => setNewEvent({...newEvent, type: e.target.value})}>
                       {Object.entries(RUN_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                     </select>
                   </div>
                   
                   <div className="grid grid-cols-2 gap-2">
                     {newEvent.isRecurring ? (
                       <select className="p-4 bg-gray-50 rounded-2xl font-black outline-none text-xs" value={newEvent.day} onChange={e => setNewEvent({...newEvent, day: e.target.value})}>
                          {dayNames.map(d => <option key={d}>{d}</option>)}
                       </select>
                     ) : (
                       <input required type="date" className="p-4 bg-gray-50 rounded-2xl font-black outline-none text-xs text-gray-500" value={newEvent.specificDate} onChange={e => setNewEvent({...newEvent, specificDate: e.target.value})} />
                     )}
                     <input required type="time" className="p-4 bg-gray-50 rounded-2xl font-black outline-none" value={newEvent.time} onChange={e => setNewEvent({...newEvent, time: e.target.value})} />
                   </div>
                   
                   <select required className="w-full p-4 bg-gray-50 rounded-2xl font-black outline-none text-xs" value={newEvent.zone} onChange={e => setNewEvent({...newEvent, zone: e.target.value})}>
                      <option value="">Selecciona tu zona...</option>
                      {clubZones.map(z => <option key={z.id || z.name} value={z.name}>{z.name}</option>)}
                   </select>
                   
                   <input required placeholder="Punto de encuentro (Ej. Fuente de Cibeles)" className="w-full p-4 bg-gray-50 rounded-2xl font-black outline-none shadow-inner" value={newEvent.location} onChange={e => setNewEvent({...newEvent, location: e.target.value})} />
                   
                   <button className="w-full bg-turquoise text-white py-5 rounded-4xl font-black text-xs uppercase italic hover:bg-teal-500 transition-colors shadow-lg active:scale-95">Publicar Sesión</button>
                 </form>
               </div>
            </div>
          </div>
        )}

        {/* TAB: CARRERAS CLUB */}
        {activeTab === 'races' && (
          <div className="grid md:grid-cols-2 gap-12 text-left font-black font-black">
            <div className="bg-white p-10 rounded-6xl shadow-xl border border-gray-100 font-black">
              <h3 className="text-2xl font-black mb-8 uppercase italic flex items-center gap-3 text-petrol font-black"><Trophy className="text-mustard"/> Publicar Carrera</h3>
              <form onSubmit={handleAddRace} className="space-y-6">
                <input required placeholder="Nombre de la Carrera" className="w-full p-6 bg-gray-50 rounded-3xl font-black outline-none border-none shadow-inner" value={newRace.name} onChange={e => setNewRace({...newRace, name: e.target.value})} />
                <div className="grid grid-cols-2 gap-4 font-black">
                  <input required type="date" className="w-full p-6 bg-gray-50 rounded-3xl font-black outline-none border-none shadow-inner text-gray-500" value={newRace.date} onChange={e => setNewRace({...newRace, date: e.target.value})} />
                  <input required placeholder="Distancia (Ej. 5k, 10k)" className="w-full p-6 bg-gray-50 rounded-3xl font-black outline-none border-none shadow-inner" value={newRace.distance} onChange={e => setNewRace({...newRace, distance: e.target.value})} />
                </div>
                
                <select required className="w-full p-6 bg-gray-50 rounded-3xl font-black outline-none border-none text-xs" value={newRace.zone} onChange={e => setNewRace({...newRace, zone: e.target.value})}>
                  <option value="">Selecciona la zona...</option>
                  {clubZones.map(z => <option key={z.id || z.name} value={z.name}>{z.name}</option>)}
                </select>

                <input required placeholder="URL Inscripción" className="w-full p-6 bg-gray-50 rounded-3xl font-black outline-none border-none shadow-inner" value={newRace.link} onChange={e => setNewRace({...newRace, link: e.target.value})} />
                <button className="w-full bg-petrol text-mustard py-6 rounded-6xl font-black text-xl uppercase shadow-2xl font-black italic hover:bg-petrol/90 active:scale-95 transition-transform">Publicar Carrera</button>
              </form>
            </div>
            
            <div className="space-y-4 max-h-[600px] overflow-y-auto no-scrollbar font-black text-left pr-4">
              <h3 className="text-xl font-black uppercase italic text-petrol mb-4">Mis Carreras Registradas</h3>
              {myRaces.map(r => (
                <div key={r.id} className="bg-white p-6 rounded-4xl border border-gray-100 flex justify-between items-center shadow-sm">
                  <div>
                    <h4 className="font-black text-lg text-petrol uppercase leading-none">{r.name}</h4>
                    <p className="text-gray-400 text-[10px] font-bold uppercase mt-1">{r.date} • {r.distance}</p>
                  </div>
                  <button onClick={async () => { if(confirm("¿Eliminar esta carrera?")) await deleteDoc(doc(db, 'artifacts', FIREBASE_APP_ID, 'public', 'data', 'races', r.id)) }} className="p-4 text-red-200 bg-red-50 rounded-2xl hover:bg-red-100"><Trash2 size={18}/></button>
                </div>
              ))}
              {myRaces.length === 0 && <p className="text-gray-400 italic">No tienes carreras publicadas.</p>}
            </div>
          </div>
        )}

        {/* TAB: PERFIL CLUB */}
        {activeTab === 'profile' && (
          <div className="max-w-2xl mx-auto space-y-6 text-left font-black">
            <h3 className="text-2xl font-black uppercase italic border-b-4 border-turquoise pb-2 inline-block">Mi Perfil Público</h3>
            <div className="bg-white p-10 rounded-6xl shadow-xl border border-gray-100">
               
               <div className="flex flex-col md:flex-row items-center md:items-start gap-8 mb-8 text-center md:text-left">
                  <div className="relative group">
                    <div className="w-32 h-32 bg-gray-100 rounded-full border-4 border-white shadow-lg overflow-hidden flex items-center justify-center text-gray-400">
                       {club.logoUrl ? <img src={club.logoUrl} className="w-full h-full object-cover" /> : <Users size={40} />}
                    </div>
                    {/* Botón para subir logo */}
                    <label className="absolute bottom-0 right-0 p-3 bg-mustard text-petrol rounded-full cursor-pointer shadow-lg hover:scale-110 transition-transform" title="Cambiar Logo">
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleLogoUpload(e, club.id)} />
                      <Upload size={18} />
                    </label>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-center md:justify-start gap-3">
                      <h4 className="text-4xl font-black italic uppercase text-petrol leading-none">{club.name}</h4>
                      <button onClick={async () => {
                          const n = prompt("Editar nombre oficial del club:", club.name);
                          if(n) await updateDoc(doc(db, 'artifacts', FIREBASE_APP_ID, 'public', 'data', 'clubs', club.id), { name: n });
                      }} className="p-2 text-gray-400 hover:text-petrol bg-gray-50 rounded-xl"><Edit2 size={16}/></button>
                    </div>
                    
                    <div className="flex items-center justify-center md:justify-start gap-2 mt-3">
                      <p className="text-turquoise text-sm uppercase font-bold tracking-widest">@{club.social}</p>
                      <button onClick={async () => {
                          const s = prompt("Editar cuenta de Instagram (sin @):", club.social);
                          if(s) await updateDoc(doc(db, 'artifacts', FIREBASE_APP_ID, 'public', 'data', 'clubs', club.id), { social: s });
                      }} className="p-1.5 text-gray-400 hover:text-petrol"><Edit2 size={14}/></button>
                    </div>
                    
                    <p className="text-gray-400 font-bold uppercase text-[11px] tracking-widest mt-2">{club.city}</p>
                  </div>
               </div>
               
               <div className="bg-palemint/30 p-6 rounded-3xl border border-turquoise/10 mt-8">
                 <h4 className="text-xs uppercase text-petrol mb-2 tracking-widest">Estado de la cuenta</h4>
                 <p className="text-sm font-bold text-gray-500">Tu cuenta está <strong>Activa</strong> y visible en el directorio. Puedes actualizar tu logo o nombre directamente usando los íconos de edición de arriba.</p>
               </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL GENERADOR DE FLYER IG STORIES */}
      {selectedFlyerEvent && (
        <div className="fixed inset-0 z-[800] bg-petrol/95 backdrop-blur-md flex items-center justify-center p-4">
           <div className="bg-white p-8 rounded-[3rem] max-w-4xl w-full flex flex-col md:flex-row gap-10 relative animate-in zoom-in duration-300 shadow-2xl">
              <button onClick={() => setSelectedFlyerEvent(null)} className="absolute top-6 right-6 p-3 text-gray-400 bg-gray-50 hover:bg-red-50 hover:text-red-500 rounded-full transition-colors z-10"><X size={20}/></button>
              
              {/* Contenedor del Canvas (Previsualización de la Historia) */}
              <div className="flex-1 flex justify-center bg-gray-100 rounded-3xl p-4 overflow-hidden">
                <div 
                  ref={flyerRef}
                  className="w-[360px] h-[640px] bg-petrol relative flex flex-col justify-center items-center shadow-lg"
                  style={{ transform: 'scale(0.85)', transformOrigin: 'top center' }}
                >
                  {/* Elementos gráficos de fondo */}
                  <div className="absolute top-0 right-0 w-64 h-64 bg-turquoise rounded-full blur-3xl opacity-20 -translate-y-1/2 translate-x-1/4"></div>
                  <div className="absolute bottom-0 left-0 w-64 h-64 bg-mustard rounded-full blur-3xl opacity-10 translate-y-1/4 -translate-x-1/4"></div>

                  <div className="bg-white rounded-[2.5rem] w-[85%] p-8 relative z-10 shadow-2xl border-b-8 border-mustard">
                    <div className="text-[10px] uppercase font-black tracking-[0.3em] text-turquoise mb-2 leading-none">
                      {selectedFlyerEvent.category || 'Evento'}
                    </div>
                    <h3 className="text-3xl font-black italic uppercase text-petrol mb-2 leading-[0.9] tracking-tighter break-words">
                      {selectedFlyerEvent.organizerName}
                    </h3>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-4 mb-6">
                      {RUN_TYPES[selectedFlyerEvent.type]?.label || 'Social Run'}
                    </p>
                    
                    <div className="space-y-5">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-gray-50 rounded-xl text-mustard"><CalendarDays size={20}/></div>
                        <span className="text-xs font-black uppercase text-petrol">
                          {selectedFlyerEvent.isRecurring ? `LOS ${selectedFlyerEvent.day}` : selectedFlyerEvent.specificDate} <br/> 
                          <span className="text-gray-400 font-bold">{selectedFlyerEvent.time} HRS</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-gray-50 rounded-xl text-mustard"><MapPin size={20}/></div>
                        <span className="text-xs font-black uppercase text-petrol">{selectedFlyerEvent.zone} <br/> 
                          <span className="text-gray-400 font-bold">{selectedFlyerEvent.city}</span>
                        </span>
                      </div>
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-gray-50 rounded-xl text-mustard"><Map size={20}/></div>
                        <span className="text-[10px] font-bold text-petrol pt-1 leading-tight">{selectedFlyerEvent.location || 'Punto de encuentro'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Logo Brand en el Flyer */}
                  <div className="absolute bottom-10 flex flex-col items-center opacity-50">
                     <span className="text-[10px] text-white font-black tracking-[0.4em] uppercase mb-2">RUN CITY HUB</span>
                     <div className="w-10 h-1 border-t-2 border-turquoise"></div>
                  </div>
                </div>
              </div>

              {/* Controles de Acción */}
              <div className="flex-1 flex flex-col justify-center space-y-6">
                 <div>
                    <h3 className="text-3xl font-black uppercase italic tracking-tighter text-petrol leading-none mb-2">Comparte <br/><span className="text-turquoise">tu sesión.</span></h3>
                    <p className="text-gray-400 text-sm font-bold">Hemos generado un flyer optimizado para Historias de Instagram con la información de tu evento.</p>
                 </div>

                 <div className="space-y-4">
                    <div className="p-5 bg-palemint/50 rounded-3xl border border-turquoise/20">
                      <h4 className="text-[11px] uppercase tracking-widest text-petrol mb-1">Paso 1</h4>
                      <p className="text-xs text-gray-500 font-bold mb-4">Descarga la imagen a tu dispositivo para subirla a tus historias.</p>
                      <button onClick={downloadFlyer} className="w-full py-4 bg-petrol text-white rounded-full text-xs uppercase italic font-black shadow-lg hover:bg-turquoise hover:text-petrol transition-all flex items-center justify-center gap-2 active:scale-95">
                        <Download size={16}/> Descargar Imagen
                      </button>
                    </div>

                    <div className="p-5 bg-mustard/10 rounded-3xl border border-mustard/20">
                      <h4 className="text-[11px] uppercase tracking-widest text-petrol mb-1">Paso 2</h4>
                      <p className="text-xs text-gray-500 font-bold mb-4">Copia el texto sugerido (incluye nuestra etiqueta para repostearte).</p>
                      <button onClick={copyCaption} className="w-full py-4 bg-white border-2 border-gray-100 text-petrol rounded-full text-xs uppercase italic font-black shadow-sm hover:border-mustard transition-all flex items-center justify-center gap-2 active:scale-95">
                        <Copy size={16}/> Copiar Texto (Caption)
                      </button>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// COMPONENTE: PANEL DE GESTIÓN (ADMIN)
// ==========================================
const AdminPanel = ({ user, onClose }) => {
  const [activeTab, setActiveTab] = useState('requests');
  
  const [rawPendingClubs, setRawPendingClubs] = useState([]);
  const [rawClubs, setRawClubs] = useState([]);
  const [rawEvents, setRawEvents] = useState([]);
  const [rawRaces, setRawRaces] = useState([]);
  
  const [dbCities, setDbCities] = useState([]);
  const [dbZones, setDbZones] = useState([]);
  
  const userRoleInfo = ADMIN_ROLES[user.email] || { role: 'none', city: 'NONE' }; 
  const isMasterAdmin = userRoleInfo.role === 'master';
  const managerCity = userRoleInfo.city;

  const [newRace, setNewRace] = useState({ name: '', date: '', distance: '', zone: '', link: '', city: isMasterAdmin ? 'CDMX' : managerCity });
  const [newCity, setNewCity] = useState('');
  const [newZone, setNewZone] = useState({ name: '', city: isMasterAdmin ? 'CDMX' : managerCity });
  const [indieEvent, setIndieEvent] = useState({ 
    organizerName: 'Run City Hub', day: 'Lunes', specificDate: '', time: '07:00', 
    city: isMasterAdmin ? 'CDMX' : managerCity, zone: '', type: 'SR', category: 'Entrenamiento', location: '', isRecurring: true 
  });

  useEffect(() => {
    if (!user || userRoleInfo.role === 'none') return;
    const unsub = [
      onSnapshot(collection(db, 'artifacts', FIREBASE_APP_ID, 'public', 'data', 'clubs_pending'), s => setRawPendingClubs(s.docs.map(d => ({id:d.id, ...d.data()})))),
      onSnapshot(collection(db, 'artifacts', FIREBASE_APP_ID, 'public', 'data', 'clubs'), s => setRawClubs(s.docs.map(d => ({id:d.id, ...d.data()})))),
      onSnapshot(collection(db, 'artifacts', FIREBASE_APP_ID, 'public', 'data', 'events'), s => setRawEvents(s.docs.map(d => ({id:d.id, ...d.data()})))),
      onSnapshot(collection(db, 'artifacts', FIREBASE_APP_ID, 'public', 'data', 'races'), s => setRawRaces(s.docs.map(d => ({id:d.id, ...d.data()})))),
      onSnapshot(collection(db, 'artifacts', FIREBASE_APP_ID, 'public', 'data', 'cities'), s => setDbCities(s.docs.map(d => ({id:d.id, ...d.data()})))),
      onSnapshot(collection(db, 'artifacts', FIREBASE_APP_ID, 'public', 'data', 'zones'), s => setDbZones(s.docs.map(d => ({id:d.id, ...d.data()}))))
    ];
    return () => unsub.forEach(fn => fn());
  }, [user, userRoleInfo.role]);

  const allCities = useMemo(() => [...HARDCODED_CITIES, ...dbCities], [dbCities]);
  const allZones = useMemo(() => [...HARDCODED_ZONES, ...dbZones], [dbZones]);

  const pendingClubs = useMemo(() => {
    const evs = isMasterAdmin ? rawPendingClubs : rawPendingClubs.filter(c => c.city === managerCity);
    return [...evs].sort((a,b) => (b.createdAt ? new Date(b.createdAt).getTime() : 0) - (a.createdAt ? new Date(a.createdAt).getTime() : 0));
  }, [rawPendingClubs, isMasterAdmin, managerCity]);

  const clubs = useMemo(() => isMasterAdmin ? rawClubs : rawClubs.filter(c => c.city === managerCity), [rawClubs, isMasterAdmin, managerCity]);

  const events = useMemo(() => {
    const evs = isMasterAdmin ? rawEvents : rawEvents.filter(e => e.city === managerCity);
    return [...evs].sort((a,b) => (b.createdAt ? new Date(b.createdAt).getTime() : 0) - (a.createdAt ? new Date(a.createdAt).getTime() : 0));
  }, [rawEvents, isMasterAdmin, managerCity]);

  const races = useMemo(() => isMasterAdmin ? rawRaces : rawRaces.filter(r => r.city === managerCity), [rawRaces, isMasterAdmin, managerCity]);

  if (userRoleInfo.role === 'none') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-10 font-black text-petrol text-center">
        <AlertTriangle size={64} className="text-red-500 mb-6" />
        <h2 className="text-4xl uppercase italic tracking-tighter mb-4">Acceso Denegado</h2>
        <p className="text-gray-400 mb-8 max-w-md">Tu cuenta no tiene permisos de administrador del sistema. Si eres un club registrado, por favor ingresa a través del "Portal Clubes".</p>
        <button onClick={async () => { await signOut(auth); onClose(); }} className="bg-petrol text-mustard px-10 py-4 rounded-full uppercase text-xs hover:scale-105 active:scale-95 transition-transform">Volver al Inicio</button>
      </div>
    );
  }

  const handleApproveClub = async (club) => {
    const { id, ...data } = club;
    await setDoc(doc(db, 'artifacts', FIREBASE_APP_ID, 'public', 'data', 'clubs', id), { ...data, status: 'active' });
    await deleteDoc(doc(db, 'artifacts', FIREBASE_APP_ID, 'public', 'data', 'clubs_pending', id));
    alert("Entidad aprobada.");
  };

  const handleToggleEvent = async (ev) => {
    const newStatus = ev.status === 'paused' ? 'active' : 'paused';
    await updateDoc(doc(db, 'artifacts', FIREBASE_APP_ID, 'public', 'data', 'events', ev.id), { status: newStatus });
  };

  const handleAddRace = async (e) => {
    e.preventDefault();
    await addDoc(collection(db, 'artifacts', FIREBASE_APP_ID, 'public', 'data', 'races'), newRace);
    alert("Carrera publicada.");
    setNewRace({ name: '', date: '', distance: '', zone: '', link: '', city: isMasterAdmin ? 'CDMX' : managerCity });
  };

  const handleAddZone = async () => {
    if(!newZone.name) return;
    await addDoc(collection(db, 'artifacts', FIREBASE_APP_ID, 'public', 'data', 'zones'), newZone);
    setNewZone({ ...newZone, name: '' });
  };

  const handleAddCity = async () => {
    if(!newCity) return;
    await addDoc(collection(db, 'artifacts', FIREBASE_APP_ID, 'public', 'data', 'cities'), { name: newCity });
    setNewCity('');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-left font-black">
      <nav className="bg-petrol text-white p-6 flex flex-col md:flex-row justify-between items-center shadow-2xl px-12 gap-6 sticky top-0 z-50">
        <div>
          <h2 className="text-2xl font-black uppercase italic tracking-tighter leading-none">CENTRO DE <span className="text-mustard">MANDOS</span></h2>
          {!isMasterAdmin && <p className="text-[10px] text-turquoise uppercase tracking-widest mt-1">CITY MANAGER: {managerCity}</p>}
        </div>
        
        <div className="flex flex-wrap justify-center gap-2 items-center">
          <button onClick={() => setActiveTab('requests')} className={`relative px-4 py-2 rounded-full text-[10px] uppercase transition-all ${activeTab === 'requests' ? 'bg-mustard text-petrol shadow-lg' : 'bg-white/10'}`}>
            Solicitudes
            {pendingClubs.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white w-5 h-5 flex items-center justify-center rounded-full text-[9px] font-black animate-pulse">
                {pendingClubs.length}
              </span>
            )}
          </button>
          <button onClick={() => setActiveTab('events_manage')} className={`px-4 py-2 rounded-full text-[10px] uppercase ${activeTab === 'events_manage' ? 'bg-mustard text-petrol shadow-lg' : 'bg-white/10'}`}>Sesiones</button>
          <button onClick={() => setActiveTab('clubs_manage')} className={`px-4 py-2 rounded-full text-[10px] uppercase ${activeTab === 'clubs_manage' ? 'bg-mustard text-petrol shadow-lg' : 'bg-white/10'}`}>Clubes</button>
          <button onClick={() => setActiveTab('races_manage')} className={`px-4 py-2 rounded-full text-[10px] uppercase ${activeTab === 'races_manage' ? 'bg-mustard text-petrol shadow-lg' : 'bg-white/10'}`}>Carreras</button>
          
          {isMasterAdmin && (
            <button onClick={() => setActiveTab('config')} className={`px-4 py-2 rounded-full text-[10px] uppercase ${activeTab === 'config' ? 'bg-mustard text-petrol shadow-lg' : 'bg-white/10'}`}>Zonas/Ciudades</button>
          )}
          <button onClick={async () => { await signOut(auth); onClose(); }} className="ml-4 px-6 py-2 bg-red-500 text-white rounded-full font-black text-[10px] uppercase hover:bg-red-600 transition-colors">Salir</button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-12 w-full font-black text-petrol">
        
        {/* TAB: SOLICITUDES */}
        {activeTab === 'requests' && (
          <div className="space-y-6">
            <h3 className="text-2xl font-black uppercase italic border-b-4 border-mustard pb-2 inline-block">Nuevos Registros</h3>
            {pendingClubs.map(c => (
              <div key={c.id} className="bg-white p-8 rounded-5xl shadow-xl flex justify-between items-center border border-gray-100 gap-6">
                <div className="text-left w-full">
                  <span className="bg-turquoise text-white text-[8px] font-black px-3 py-1 rounded-full uppercase mb-2 inline-block font-black">{c.type === 'club' ? 'RUNNING CLUB' : 'MARCA / NEGOCIO'}</span>
                  <h3 className="font-black text-xl uppercase italic text-petrol">{c.name}</h3>
                  <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest font-black">@{c.social} • {c.email} • {c.city}</p>
                </div>
                <div className="flex gap-3 shrink-0">
                   <button onClick={async () => await deleteDoc(doc(db, 'artifacts', FIREBASE_APP_ID, 'public', 'data', 'clubs_pending', c.id))} className="p-4 text-red-300 hover:text-red-500 bg-red-50 rounded-3xl"><Trash2 size={24}/></button>
                   <button onClick={() => handleApproveClub(c)} className="bg-turquoise text-white px-8 py-4 rounded-4xl font-black text-xs uppercase italic shadow-lg">Aprobar</button>
                </div>
              </div>
            ))}
            {pendingClubs.length === 0 && <p className="text-center py-20 text-gray-300 italic uppercase">Sin pendientes en tu jurisdicción</p>}
          </div>
        )}

        {/* TAB: SESIONES */}
        {activeTab === 'events_manage' && (
          <div className="grid md:grid-cols-12 gap-12 text-left font-black">
            <div className="md:col-span-7 space-y-6">
              <h3 className="text-2xl font-black uppercase italic border-b-4 border-mustard pb-2 inline-block">Gestión de Sesiones</h3>
              <div className="grid gap-4 max-h-[70vh] overflow-y-auto no-scrollbar pr-4">
                {events.map(ev => (
                  <div key={ev.id} className={`bg-white p-6 rounded-[2.5rem] shadow-sm flex justify-between items-center border border-gray-100 ${ev.status === 'paused' ? 'opacity-50 grayscale bg-gray-50' : ''}`}>
                    <div className="flex items-center gap-5">
                      <div className="p-4 bg-gray-50 rounded-2xl text-petrol">{ev.isRecurring ? <CalendarDays size={20}/> : <Zap size={20}/>}</div>
                      <div>
                        <h4 className="font-black text-lg uppercase italic leading-none">{ev.organizerName || 'Evento Indie'}</h4>
                        <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">
                          {ev.isRecurring ? `TODOS LOS ${ev.day}` : ev.specificDate} • {ev.time} hrs • {ev.zone} ({ev.city})
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleToggleEvent(ev)} className={`p-3 rounded-2xl ${ev.status === 'paused' ? 'bg-emerald-50 text-emerald-500' : 'bg-amber-50 text-amber-500'}`}>{ev.status === 'paused' ? <Play size={20}/> : <Pause size={20}/>}</button>
                      <button onClick={async () => { if(confirm("¿Eliminar?")) await deleteDoc(doc(db, 'artifacts', FIREBASE_APP_ID, 'public', 'data', 'events', ev.id)) }} className="p-3 bg-red-50 text-red-300 rounded-2xl hover:bg-red-100 transition-colors"><Trash2 size={20}/></button>
                    </div>
                  </div>
                ))}
                {events.length === 0 && <p className="text-gray-400 italic">No hay sesiones activas.</p>}
              </div>
            </div>

            <div className="md:col-span-5">
               <div className="bg-white p-8 rounded-6xl shadow-xl border border-gray-100 sticky top-32">
                 <h3 className="text-xl font-black mb-6 uppercase italic text-petrol flex items-center gap-3"><Zap className="text-turquoise"/> Evento Indie</h3>
                 
                 <div className="flex bg-gray-50 p-2 rounded-3xl mb-6">
                    <button 
                      className={`flex-1 py-3 text-[10px] uppercase font-black rounded-2xl transition-all ${indieEvent.isRecurring ? 'bg-petrol text-mustard shadow-md' : 'text-gray-400'}`}
                      onClick={() => setIndieEvent({...indieEvent, isRecurring: true})}
                    >
                      Semanal
                    </button>
                    <button 
                      className={`flex-1 py-3 text-[10px] uppercase font-black rounded-2xl transition-all ${!indieEvent.isRecurring ? 'bg-petrol text-mustard shadow-md' : 'text-gray-400'}`}
                      onClick={() => setIndieEvent({...indieEvent, isRecurring: false})}
                    >
                      Evento Único
                    </button>
                 </div>

                 <form onSubmit={async (e) => {
                   e.preventDefault();
                   if(!indieEvent.organizerName || !indieEvent.zone) return alert("Faltan datos (Organizador o Zona)");
                   if(!indieEvent.isRecurring && !indieEvent.specificDate) return alert("Selecciona una fecha específica para el evento único.");

                   try {
                     const eventData = { ...indieEvent, status: 'active', createdAt: new Date().toISOString() };
                     if(eventData.isRecurring) delete eventData.specificDate;
                     else delete eventData.day;

                     await addDoc(collection(db, 'artifacts', FIREBASE_APP_ID, 'public', 'data', 'events'), eventData);
                     alert("Sesión publicada correctamente.");
                     setIndieEvent({ organizerName: 'Run City Hub', day: 'Lunes', specificDate: '', time: '07:00', city: indieEvent.city, zone: '', type: 'SR', category: 'Entrenamiento', location: '', isRecurring: true });
                   } catch(error) {
                     console.error("Error adding event:", error);
                     alert("Atención: Firebase bloqueó el registro. Asegúrate de tener permisos.");
                   }
                 }} className="space-y-4 font-black">
                   
                   <div className="grid grid-cols-2 gap-2">
                     <select className="w-full p-4 bg-gray-50 rounded-2xl font-black outline-none text-xs" value={indieEvent.category} onChange={e => setIndieEvent({...indieEvent, category: e.target.value})}>
                       {EVENT_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                     </select>
                     <select className="w-full p-4 bg-gray-50 rounded-2xl font-black outline-none text-xs" value={indieEvent.type} onChange={e => setIndieEvent({...indieEvent, type: e.target.value})}>
                       {Object.entries(RUN_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                     </select>
                   </div>
                   
                   <input required placeholder="Organizador (Nombre)" className="w-full p-4 bg-gray-50 rounded-2xl font-black outline-none" value={indieEvent.organizerName} onChange={e => setIndieEvent({...indieEvent, organizerName: e.target.value})} />
                   
                   <div className="grid grid-cols-2 gap-2">
                     {indieEvent.isRecurring ? (
                       <select className="p-4 bg-gray-50 rounded-2xl font-black outline-none text-xs" value={indieEvent.day} onChange={e => setIndieEvent({...indieEvent, day: e.target.value})}>
                          {dayNames.map(d => <option key={d}>{d}</option>)}
                       </select>
                     ) : (
                       <input required type="date" className="p-4 bg-gray-50 rounded-2xl font-black outline-none text-xs text-gray-500" value={indieEvent.specificDate} onChange={e => setIndieEvent({...indieEvent, specificDate: e.target.value})} />
                     )}
                     <input type="time" className="p-4 bg-gray-50 rounded-2xl font-black outline-none" value={indieEvent.time} onChange={e => setIndieEvent({...indieEvent, time: e.target.value})} />
                   </div>
                   
                   <div className="grid grid-cols-2 gap-2">
                     <select 
                        disabled={!isMasterAdmin} 
                        className="w-full p-4 bg-gray-50 rounded-2xl font-black outline-none text-xs disabled:opacity-50" 
                        value={indieEvent.city} 
                        onChange={e => setIndieEvent({...indieEvent, city: e.target.value, zone: ''})}
                      >
                        {allCities.map(c => <option key={c.id || c.name} value={c.name}>{c.name}</option>)}
                     </select>
                     <select required className="w-full p-4 bg-gray-50 rounded-2xl font-black outline-none text-xs" value={indieEvent.zone} onChange={e => setIndieEvent({...indieEvent, zone: e.target.value})}>
                        <option value="">Zona...</option>
                        {allZones.filter(z => z.city === indieEvent.city).map(z => <option key={z.id || z.name} value={z.name}>{z.name}</option>)}
                     </select>
                   </div>
                   
                   <input required placeholder="Ubicación (Lugar exacto)" className="w-full p-4 bg-gray-50 rounded-2xl font-black outline-none shadow-inner" value={indieEvent.location} onChange={e => setIndieEvent({...indieEvent, location: e.target.value})} />
                   
                   <button className="w-full bg-turquoise text-white py-5 rounded-4xl font-black text-xs uppercase italic hover:bg-teal-500 transition-colors shadow-lg active:scale-95">Publicar</button>
                 </form>
               </div>
            </div>
          </div>
        )}

        {/* TAB: CLUBES */}
        {activeTab === 'clubs_manage' && (
          <div className="space-y-6 text-left font-black">
            <h3 className="text-2xl font-black uppercase italic border-b-4 border-mustard pb-2 inline-block">Directorio</h3>
            <div className="grid md:grid-cols-2 gap-4">
              {clubs.map(c => (
                <div key={c.id} className="bg-white p-6 rounded-4xl border border-gray-100 flex justify-between items-center shadow-sm">
                   <div className="flex items-center gap-4">
                      <div className="relative group">
                        <div className="w-12 h-12 bg-gray-50 rounded-full overflow-hidden border border-gray-100 flex items-center justify-center text-gray-300">
                          {c.logoUrl ? <img src={c.logoUrl} className="w-full h-full object-cover" /> : <Users size={20} />}
                        </div>
                        <label className="absolute -bottom-2 -right-2 p-1.5 bg-mustard text-petrol rounded-full cursor-pointer shadow-md hover:scale-110" title="Subir Logo">
                           <input type="file" accept="image/*" className="hidden" onChange={(e) => handleLogoUpload(e, c.id)} />
                           <Upload size={10} />
                        </label>
                      </div>
                      <div>
                        <h4 className="font-black text-base uppercase italic leading-none">{c.name}</h4>
                        <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">@{c.social} • {c.type}</p>
                      </div>
                   </div>
                   <div className="flex gap-2">
                      <button onClick={async () => {
                        const n = prompt("Nuevo nombre:", c.name);
                        if(n) await updateDoc(doc(db, 'artifacts', FIREBASE_APP_ID, 'public', 'data', 'clubs', c.id), { name: n });
                      }} className="p-3 bg-gray-50 rounded-xl"><Edit2 size={16}/></button>
                      <button onClick={async () => { if(confirm("¿Eliminar?")) await deleteDoc(doc(db, 'artifacts', FIREBASE_APP_ID, 'public', 'data', 'clubs', c.id)) }} className="p-3 bg-red-50 text-red-300 rounded-xl hover:bg-red-100"><Trash2 size={16}/></button>
                   </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB: CARRERAS */}
        {activeTab === 'races_manage' && (
          <div className="grid md:grid-cols-2 gap-12 text-left font-black font-black">
            <div className="bg-white p-10 rounded-6xl shadow-xl border border-gray-100 font-black">
              <h3 className="text-2xl font-black mb-8 uppercase italic flex items-center gap-3 text-petrol font-black"><Trophy className="text-mustard"/> Nueva Meta 2026</h3>
              <form onSubmit={handleAddRace} className="space-y-6">
                <input required placeholder="Nombre Carrera" className="w-full p-6 bg-gray-50 rounded-3xl font-black outline-none border-none shadow-inner" value={newRace.name} onChange={e => setNewRace({...newRace, name: e.target.value})} />
                <div className="grid grid-cols-2 gap-4 font-black">
                  <input required type="date" className="w-full p-6 bg-gray-50 rounded-3xl font-black outline-none border-none shadow-inner text-gray-500" value={newRace.date} onChange={e => setNewRace({...newRace, date: e.target.value})} />
                  <input required placeholder="Distancia" className="w-full p-6 bg-gray-50 rounded-3xl font-black outline-none border-none shadow-inner" value={newRace.distance} onChange={e => setNewRace({...newRace, distance: e.target.value})} />
                </div>
                
                <div className="grid grid-cols-2 gap-4 font-black">
                  <select disabled={!isMasterAdmin} required className="w-full p-6 bg-gray-50 rounded-3xl font-black outline-none border-none text-xs disabled:opacity-50" value={newRace.city} onChange={e => setNewRace({...newRace, city: e.target.value, zone: ''})}>
                    {allCities.map(c => <option key={c.id || c.name} value={c.name}>{c.name}</option>)}
                  </select>
                  <select required className="w-full p-6 bg-gray-50 rounded-3xl font-black outline-none border-none text-xs" value={newRace.zone} onChange={e => setNewRace({...newRace, zone: e.target.value})}>
                    <option value="">Zona...</option>
                    {allZones.filter(z => z.city === newRace.city).map(z => <option key={z.id || z.name} value={z.name}>{z.name}</option>)}
                  </select>
                </div>

                <input required placeholder="URL Inscripción" className="w-full p-6 bg-gray-50 rounded-3xl font-black outline-none border-none shadow-inner" value={newRace.link} onChange={e => setNewRace({...newRace, link: e.target.value})} />
                <button className="w-full bg-petrol text-mustard py-6 rounded-6xl font-black text-xl uppercase shadow-2xl font-black italic hover:bg-petrol/90 active:scale-95 transition-transform">Publicar</button>
              </form>
            </div>
            <div className="space-y-4 max-h-[600px] overflow-y-auto no-scrollbar font-black text-left pr-4">
              <h3 className="text-xl font-black uppercase italic text-petrol mb-4">Metas Registradas</h3>
              {races.sort((a,b) => new Date(a.date) - new Date(b.date)).map(r => (
                <div key={r.id} className="bg-white p-6 rounded-4xl border border-gray-100 flex justify-between items-center shadow-sm">
                  <div><h4 className="font-black text-lg text-petrol uppercase leading-none">{r.name}</h4><p className="text-gray-400 text-[10px] font-bold uppercase mt-1">{r.date} • {r.city} • {r.distance}</p></div>
                  <button onClick={async () => await deleteDoc(doc(db, 'artifacts', FIREBASE_APP_ID, 'public', 'data', 'races', r.id))} className="p-4 text-red-200 bg-red-50 rounded-2xl hover:bg-red-100"><Trash2 size={18}/></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB: CONFIGURACIÓN (SOLO MASTER ADMIN) */}
        {activeTab === 'config' && isMasterAdmin && (
          <div className="grid md:grid-cols-2 gap-12 text-left font-black">
            <div className="bg-white p-12 rounded-6xl shadow-xl border border-gray-100 font-black">
              <h3 className="text-2xl font-black mb-8 uppercase italic flex items-center gap-3 text-petrol font-black tracking-tighter"><MapPin className="text-turquoise"/> Gestionar Zonas</h3>
              <div className="flex gap-4 mb-8 font-black">
                <select className="p-4 bg-gray-50 rounded-2xl font-black text-[10px] outline-none" value={newZone.city} onChange={e => setNewZone({...newZone, city: e.target.value})}>
                  {allCities.map(ct => <option key={ct.id || ct.name} value={ct.name}>{ct.name}</option>)}
                </select>
                <input placeholder="Nueva Zona" className="flex-1 p-4 bg-gray-50 rounded-2xl font-black text-[10px] outline-none shadow-inner" value={newZone.name} onChange={e => setNewZone({...newZone, name: e.target.value})} />
                <button onClick={handleAddZone} className="p-4 bg-petrol text-mustard rounded-2xl shadow-lg hover:bg-turquoise"><PlusCircle/></button>
              </div>
              <div className="space-y-3 font-black max-h-[400px] overflow-y-auto pr-2">
                {allZones.map(z => (
                  <div key={z.id || z.name} className="p-4 bg-gray-50 rounded-3xl flex justify-between items-center font-black">
                    <span className="text-[11px] font-black uppercase text-petrol">{z.name} <span className="opacity-30">({z.city})</span></span>
                    {z.id && <button onClick={async () => await deleteDoc(doc(db, 'artifacts', FIREBASE_APP_ID, 'public', 'data', 'zones', z.id))} className="text-red-300 font-black"><Trash2 size={16}/></button>}
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white p-12 rounded-6xl shadow-xl border border-gray-100 text-left font-black">
              <h3 className="text-2xl font-black mb-8 uppercase italic flex items-center gap-3 text-petrol font-black tracking-tighter"><Globe className="text-turquoise"/> Gestionar Ciudades</h3>
              <div className="flex gap-4 mb-8 font-black">
                <input placeholder="Nueva Ciudad" className="flex-1 p-4 bg-gray-50 rounded-2xl font-black text-[10px] outline-none shadow-inner" value={newCity} onChange={e => setNewCity(e.target.value)} />
                <button onClick={handleAddCity} className="p-4 bg-petrol text-mustard rounded-2xl shadow-lg hover:bg-turquoise font-black"><PlusCircle/></button>
              </div>
              <div className="space-y-4 font-black">
                {allCities.map(c => (
                  <div key={c.id || c.name} className="p-4 bg-gray-50 rounded-3xl flex justify-between items-center font-black">
                    <span className="text-[11px] font-black uppercase text-petrol">{c.name}</span>
                    {c.id && !c.id.startsWith('default') && <button onClick={async () => await deleteDoc(doc(db, 'artifacts', FIREBASE_APP_ID, 'public', 'data', 'cities', c.id))} className="text-red-300 transition-colors font-black"><Trash2 size={18}/></button>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

// ==========================================
// COMPONENTE: SITIO PÚBLICO
// ==========================================
const PublicApp = ({ user }) => {
  const [view, setView] = useState('home');
  const [selectedCity, setSelectedCity] = useState('CDMX');
  const [selectedZone, setSelectedZone] = useState('Todos');
  const [currentWeekStart, setCurrentWeekStart] = useState(getMonday(new Date()));
  const [selectedEvent, setSelectedEvent] = useState(null);

  const [clubs, setClubs] = useState([]);
  const [events, setEvents] = useState([]);
  const [races, setRaces] = useState([]);
  const [dbCities, setDbCities] = useState([]);
  const [dbZones, setDbZones] = useState([]);
  const [loading, setLoading] = useState(true);

  // Registro Público y Filtros
  const [regType, setRegType] = useState('club');
  const [formCity, setFormCity] = useState(selectedCity); 
  const [clubDirectoryTab, setClubDirectoryTab] = useState('club');
  const [businessEventType, setBusinessEventType] = useState('recurring');
  
  // Soporte Chatbot
  const [isSupportOpen, setIsSupportOpen] = useState(false);

  useEffect(() => {
    const handleHash = () => {
      if (window.location.hash === '#admin') setView('admin-login');
    };
    window.addEventListener('hashchange', handleHash);
    handleHash(); 
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsub = [
      onSnapshot(collection(db, 'artifacts', FIREBASE_APP_ID, 'public', 'data', 'clubs'), s => { setClubs(s.docs.map(d => ({id:d.id, ...d.data()}))); setLoading(false); }),
      onSnapshot(collection(db, 'artifacts', FIREBASE_APP_ID, 'public', 'data', 'events'), s => setEvents(s.docs.map(d => ({id:d.id, ...d.data()})))),
      onSnapshot(collection(db, 'artifacts', FIREBASE_APP_ID, 'public', 'data', 'races'), s => setRaces(s.docs.map(d => ({id:d.id, ...d.data()})))),
      onSnapshot(collection(db, 'artifacts', FIREBASE_APP_ID, 'public', 'data', 'cities'), s => setDbCities(s.docs.map(d => ({id:d.id, ...d.data()})))),
      onSnapshot(collection(db, 'artifacts', FIREBASE_APP_ID, 'public', 'data', 'zones'), s => setDbZones(s.docs.map(d => ({id:d.id, ...d.data()}))))
    ];
    return () => unsub.forEach(fn => fn());
  }, [user]);

  const allCities = useMemo(() => [...HARDCODED_CITIES, ...dbCities], [dbCities]);
  const allZones = useMemo(() => [...HARDCODED_ZONES, ...dbZones], [dbZones]);
  
  const currentCityZones = useMemo(() => allZones.filter(z => z.city === selectedCity).map(z => z.name), [allZones, selectedCity]);
  const formZones = useMemo(() => allZones.filter(z => z.city === formCity).map(z => z.name), [allZones, formCity]);

  const weekDates = useMemo(() => [0, 1, 2, 3, 4, 5, 6].map(i => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + i);
    return d;
  }), [currentWeekStart]);

  const filteredEvents = useMemo(() => events.filter(e => {
    const active = e.status !== 'paused';
    const matchesZone = selectedZone === 'Todos' || e.zone === selectedZone;
    const matchesCity = e.city?.toUpperCase() === selectedCity?.toUpperCase() || !e.city;
    return active && matchesZone && matchesCity;
  }), [events, selectedZone, selectedCity]);

  const getEventForSlot = (dayName, time, dateObj) => {
    return filteredEvents.find(e => {
      if (e.time !== time) return false;
      if (e.isRecurring) return e.day === dayName;
      
      if (!e.specificDate) return false;
      
      try {
         const yyyy = dateObj.getFullYear();
         const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
         const dd = String(dateObj.getDate()).padStart(2, '0');
         const localDateStr = `${yyyy}-${mm}-${dd}`;
         return e.specificDate === localDateStr;
      } catch (error) {
         return false;
      }
    });
  };

  const sortedRaces = useMemo(() => races
    .filter(r => (selectedCity === 'Todas' || r.city === selectedCity))
    .sort((a, b) => new Date(a.date) - new Date(b.date)), [races, selectedCity]);

  if (loading) return <div className="h-screen flex items-center justify-center font-black text-petrol uppercase tracking-[0.5em] animate-pulse italic">Cargando Hub...</div>;

  return (
    <div className="min-h-screen bg-white text-petrol font-sans flex flex-col transition-all text-center font-black overflow-x-hidden relative">
      
      <header className="bg-white/95 backdrop-blur-xl border-b border-gray-100 sticky top-0 z-[100] px-6 py-5 shadow-sm font-black font-black">
        <div className="max-w-7xl mx-auto flex items-center justify-between font-black">
          <div className="flex items-center cursor-pointer group font-black" onClick={() => { window.location.hash=''; setView('home'); }}>
             <div className="w-11 h-11 md:w-14 md:h-14 bg-white rounded-2xl flex items-center justify-center mr-4 shadow-xl overflow-hidden border border-gray-100 logo-shadow group-hover:rotate-12 transition-transform font-black">
               <img src="/cityrunhublogo.png" className="w-full h-full object-contain p-1.5 font-black" alt="Logo" />
             </div>
             <div className="text-xl md:text-3xl font-black tracking-tighter uppercase italic leading-none text-left tracking-tighter font-black">RUN CITY <span className="text-turquoise font-black italic">HUB</span></div>
          </div>

          <nav className="hidden lg:flex items-center gap-6 xl:gap-10 text-[11px] font-black uppercase tracking-[0.3em] text-gray-400 font-black">
            <button onClick={() => { window.location.hash=''; setView('home'); }} className={view==='home'?'text-petrol':''}>Inicio</button>
            <button onClick={() => { window.location.hash=''; setView('home'); setTimeout(() => document.getElementById('agenda')?.scrollIntoView({behavior:'smooth'}), 100); }}>Calendario</button>
            <button onClick={() => { window.location.hash=''; setView('races'); }} className={view==='races'?'text-petrol':''}>Carreras</button>
            <button onClick={() => { window.location.hash=''; setView('clubs'); }} className={view==='clubs'?'text-petrol':''}>Clubes</button>
            <div className="relative flex items-center bg-gray-50 rounded-xl px-4 py-2 font-black text-petrol border border-gray-100 shadow-inner group font-black">
              <select className="bg-transparent outline-none appearance-none pr-8 cursor-pointer uppercase text-[10px] tracking-widest font-black" value={selectedCity} onChange={e => { setSelectedCity(e.target.value); setSelectedZone('Todos'); }}>
                {allCities.map(c => <option key={c.id || c.name} value={c.name}>{c.name}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-petrol font-black" size={14} />
            </div>
            
            <button onClick={() => { 
              const isApprovedClub = clubs.find(c => c.email === user?.email);
              if(isApprovedClub) setView('club-panel');
              else setView('club-login'); 
            }} className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-petrol px-6 py-3.5 rounded-full transition-all font-black uppercase italic tracking-widest text-[10px] active:scale-95">
              <LogIn size={14}/> Portal Clubes
            </button>
            
            <button onClick={() => { window.location.hash=''; setView('register'); }} className="bg-petrol text-mustard px-8 py-3.5 rounded-full shadow-2xl hover:bg-turquoise hover:text-white transition-all font-black uppercase italic tracking-widest text-[12px] active:scale-95 font-black">Unirse</button>
          </nav>
        </div>
      </header>

      {view === 'home' && (
        <main className="animate-in fade-in duration-1000 flex-1 font-black text-left">
           <section className="max-w-7xl mx-auto px-6 pt-16 md:pt-32 pb-32 flex flex-col lg:flex-row items-center gap-20 text-center lg:text-left font-black">
              <div className="flex-1 font-black">
                 <h1 className="hero-title mb-10 leading-[0.8] font-black italic tracking-tighter font-black">NO CORRAS <br /> SOLO, <br /><span className="text-turquoise font-black italic font-black">CORRE EN EQUIPO.</span></h1>
                 <p className="text-xl md:text-2xl text-gray-400 font-medium italic mb-14 max-w-xl mx-auto lg:mx-0 leading-relaxed text-left font-black font-black">La plataforma definitiva para el corredor urbano.</p>
                 <div className="flex flex-col sm:flex-row gap-6 justify-center lg:justify-start font-black">
                    <button onClick={() => document.getElementById('agenda')?.scrollIntoView({behavior:'smooth'})} className="bg-petrol text-mustard px-16 py-7 rounded-6xl font-black text-2xl shadow-[0_35px_60px_-15px_rgba(27,67,83,0.3)] hover:scale-105 transition-all uppercase italic active:scale-95 font-black">Ver Calendario</button>
                    <button onClick={() => setView('register')} className="bg-white border-4 border-gray-100 text-petrol px-16 py-7 rounded-6xl font-black text-2xl hover:border-mustard transition-all uppercase italic active:scale-95 font-black">Registrar Club</button>
                 </div>
              </div>
           </section>

           <section id="agenda" className="max-w-7xl mx-auto px-6 py-32 border-t border-gray-100 text-center text-left font-black">
              <h2 className="text-6xl md:text-8xl font-black uppercase italic tracking-tighter mb-20 text-petrol leading-none font-black tracking-tighter font-black">AGENDA <span className="text-turquoise font-black italic font-black">SEMANAL</span></h2>
              
              <div className="bg-white p-10 rounded-5xl border border-gray-100 shadow-sm mb-20 overflow-x-auto no-scrollbar font-black text-petrol font-black">
                <div className="flex items-center gap-12 min-w-max text-left font-black text-petrol font-black font-black">
                   <div className="text-[11px] font-black uppercase tracking-[0.3em] border-r pr-10 border-gray-100 font-black tracking-widest font-black">Guía de Sesiones</div>
                   {Object.entries(RUN_TYPES).map(([k,v]) => (
                     <div key={k} className="flex items-center gap-4 font-black">
                        <span className={`px-5 py-2 rounded-2xl border-2 font-black text-[10px] tracking-widest ${v.color} font-black`}>{k}</span>
                        <div className="font-black text-left"><p className="text-[13px] font-black leading-none mb-1 text-petrol uppercase tracking-tighter font-black">{v.label}</p><p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight font-black">{v.desc}</p></div>
                     </div>
                   ))}
                </div>
              </div>

              <div className="flex flex-col gap-12 mb-20 font-black text-center font-black font-black">
                 <div className="flex flex-wrap gap-3 justify-center font-black font-black font-black">
                    <button onClick={() => setSelectedZone('Todos')} className={`px-10 py-5 rounded-[2.5rem] text-[11px] font-black uppercase tracking-widest transition-all ${selectedZone === 'Todos' ? 'bg-petrol text-mustard shadow-xl scale-105' : 'bg-gray-50 text-gray-400 hover:bg-gray-100 font-black font-black'} font-black font-black font-black`}>Todos</button>
                    {currentCityZones.map(z => (
                      <button key={z} onClick={() => setSelectedZone(z)} className={`px-10 py-5 rounded-[2.5rem] text-[11px] font-black uppercase tracking-widest transition-all ${selectedZone === z ? 'bg-petrol text-mustard shadow-xl ring-8 ring-palemint scale-105' : 'bg-gray-50 text-gray-400 hover:bg-gray-100 font-black font-black'} font-black font-black font-black`}>{z}</button>
                    ))}
                 </div>
                 <div className="bg-gray-50 p-10 rounded-[4.5rem] flex flex-col md:flex-row items-center justify-between gap-10 border border-gray-100 shadow-inner text-left font-black text-petrol font-black font-black">
                    <div className="flex items-center gap-8 font-black font-black">
                       <button onClick={() => setCurrentWeekStart(new Date(currentWeekStart.setDate(currentWeekStart.getDate()-7)))} className="p-5 bg-white rounded-3xl shadow-xl hover:bg-petrol hover:text-white transition-all active:scale-90 font-black font-black"><ChevronLeft size={28}/></button>
                       <div className="text-center min-w-[280px] font-black font-black">
                          <p className="text-[11px] font-black uppercase tracking-[0.4em] mb-2 font-black italic tracking-widest text-gray-400 font-black font-black">Semana Actual</p>
                          <h4 className="text-2xl font-black uppercase italic tracking-tighter text-petrol leading-none font-black tracking-tighter font-black font-black uppercase font-black">{weekDates[0].getDate()} {weekDates[0].toLocaleString('es-MX', {month:'short'})} — {weekDates[6].getDate()} {weekDates[6].toLocaleString('es-MX', {month:'short'})}</h4>
                       </div>
                       <button onClick={() => setCurrentWeekStart(new Date(currentWeekStart.setDate(currentWeekStart.getDate()+7)))} className="p-5 bg-white rounded-3xl shadow-xl hover:bg-petrol hover:text-white transition-all active:scale-90 font-black font-black"><ChevronRight size={28}/></button>
                    </div>
                    <button onClick={() => setCurrentWeekStart(getMonday(new Date()))} className="bg-white text-petrol border-2 border-gray-100 px-12 py-5 rounded-full font-black text-[10px] uppercase tracking-[0.3em] hover:bg-palemint transition shadow-xl active:scale-95 font-black uppercase italic font-black font-black">Hoy</button>
                 </div>
              </div>

              <div className="space-y-24 text-left font-black font-black">
                 {[{t: 'MAÑANA', times: ["05:30", "06:00", "06:30", "07:00", "07:30", "08:00", "08:30", "09:00"], color: 'bg-petrol'}, {t: 'TARDE', times: ["17:30", "18:00", "18:30", "19:00", "19:30", "20:00", "20:30", "21:00"], color: 'bg-turquoise'}].map(sec => (
                   <div key={sec.t} className="bg-white rounded-[4rem] md:rounded-[5rem] shadow-[0_40px_80px_-20px_rgba(27,67,83,0.08)] overflow-hidden border border-gray-100 text-left font-black font-black">
                      <div className={`${sec.color} p-10 md:p-12 text-white flex justify-between items-center font-black font-black`}><h3 className="text-4xl font-black uppercase italic leading-none tracking-tighter font-black font-black font-black">{sec.t}</h3><span className="bg-white/10 px-8 py-3 rounded-full font-black text-[11px] uppercase tracking-[0.4em] backdrop-blur-md font-black font-black">{selectedCity}</span></div>
                      <div className="overflow-x-auto no-scrollbar font-black font-black">
                        <table className="w-full min-w-[1200px] border-collapse font-black font-black">
                           <thead><tr className="bg-gray-50/50 text-[10px] font-black text-gray-500 uppercase border-b border-gray-100 font-black tracking-widest font-black font-black"><th className="p-8 text-left w-40 text-gray-500 font-black font-black">Horario</th>{dayNames.map((d, i) => <th key={d} className="p-8 text-center font-black font-black uppercase font-black font-black">{d} <br/><span className="text-turquoise text-[10px] font-black font-black">{weekDates[i].getDate()} {weekDates[i].toLocaleString('es-MX', {month:'short'})}</span></th>)}</tr></thead>
                           <tbody>
                              {sec.times.map(t => (
                                <tr key={t} className="group font-black font-black font-black"><td className="p-8 text-base font-black text-gray-500 border-b border-gray-50 font-black group-hover:text-petrol transition-colors font-black">{t}</td>{dayNames.map((d, i) => {
                                  const ev = getEventForSlot(d, t, weekDates[i]);
                                  const cl = ev?.clubId ? clubs.find(c => c.id === ev.clubId) : null;
                                  return <td key={d+t} className="p-3 border-b border-gray-50 h-40 align-top font-black font-black font-black">{ev && (
                                      <div onClick={() => setSelectedEvent({...ev, club: cl || {name: ev.organizerName}})} className={`p-5 rounded-[2.5rem] border-l-[10px] cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all h-full flex flex-col justify-between text-left shadow-sm ${RUN_TYPES[ev.type]?.color || 'bg-gray-50'} font-black font-black`}>
                                        <span className="text-[9px] font-black uppercase opacity-60 font-black font-black font-black font-black font-black">{ev.category ? `${ev.category} • ` : ''}{RUN_TYPES[ev.type]?.label}</span>
                                        <div className="text-base font-black leading-tight uppercase italic line-clamp-2 text-petrol font-black font-black font-black font-black font-black font-black mt-1">{cl ? cl.name : ev.organizerName}</div>
                                        <div className="space-y-1 mt-3 font-black font-black">
                                          <div className="text-[10px] font-bold text-turquoise flex items-center gap-2 uppercase font-black font-black font-black font-black font-black"><Zap size={12}/> {ev.distance || 'Social Run'}</div>
                                          <div className="text-[10px] font-bold text-gray-500 flex items-center gap-2 uppercase font-black font-black font-black font-black font-black font-black"><MapPin size={12}/> {ev.zone}</div>
                                        </div>
                                      </div>
                                    )}</td>
                                })}</tr>
                              ))}
                           </tbody>
                        </table>
                      </div>
                   </div>
                 ))}
              </div>
           </section>
        </main>
      )}

      {view === 'races' && (
        <main className="max-w-7xl mx-auto px-6 py-24 animate-in fade-in duration-700 flex-1 text-center font-black font-black font-black">
           <h2 className="text-6xl md:text-8xl font-black uppercase italic tracking-tighter text-petrol mb-12 font-black leading-none font-black font-black">METAS <span className="text-turquoise font-black italic font-black font-black font-black font-black">2026</span></h2>
           <div className="grid gap-10 max-w-4xl mx-auto text-left font-black">
             {sortedRaces.map(r => (
               <div key={r.id} className="bg-white p-10 rounded-[4rem] border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-8 border-l-[15px] border-l-mustard hover:shadow-2xl transition-all group font-black">
                 <div className="flex flex-col items-center justify-center bg-palemint w-28 h-28 rounded-[2.5rem] shrink-0 border border-turquoise/20 font-black"><span className="text-[11px] font-black uppercase text-petrol font-black">{new Date(r.date).toLocaleString('es-MX', {month:'short'})}</span><span className="text-5xl font-black text-petrol font-black font-black font-black">{new Date(r.date).getUTCDate()}</span></div>
                 <div className="flex-1 font-black text-petrol text-left font-black font-black font-black font-black"><h4 className="text-3xl font-black uppercase italic leading-none group-hover:text-turquoise transition-colors font-black font-black font-black font-black font-black">{r.name}</h4><p className="text-gray-400 text-xs font-bold uppercase mt-3 flex items-center gap-3 font-black font-black font-black font-black font-black font-black"><Trophy size={14} className="text-mustard"/> {r.distance}</p></div>
                 <button onClick={() => window.open(r.link)} className="bg-petrol text-mustard px-12 py-5 rounded-full font-black text-xs uppercase shadow-xl hover:scale-105 active:scale-95 italic font-black font-black font-black font-black font-black font-black font-black font-black font-black">Inscribirme</button>
               </div>
             ))}
             {races.length === 0 && <p className="text-center py-20 text-gray-300 font-black uppercase italic tracking-widest font-black">Buscando calendario...</p>}
           </div>
        </main>
      )}

      {view === 'clubs' && (
        <main className="max-w-7xl mx-auto px-6 py-24 animate-in slide-in-from-bottom duration-700 flex-1 text-center font-black font-black font-black font-black">
           <h2 className="text-6xl md:text-8xl font-black uppercase italic tracking-tighter text-petrol mb-16 font-black leading-none font-black font-black font-black font-black font-black">DIRECTORIO <br/><span className="text-turquoise italic font-black font-black font-black font-black font-black font-black font-black font-black font-black">DE CLUBES.</span></h2>
           
           <div className="flex bg-gray-50 p-2.5 rounded-4xl shadow-inner border border-gray-100 max-w-md mx-auto mb-16 font-black">
              <button onClick={() => setClubDirectoryTab('club')} className={`flex-1 py-4 rounded-[1.8rem] font-black uppercase text-[11px] transition-all ${clubDirectoryTab==='club'?'bg-petrol text-mustard shadow-xl scale-105':'text-gray-400 hover:text-petrol'}`}>Running Clubs</button>
              <button onClick={() => setClubDirectoryTab('business')} className={`flex-1 py-4 rounded-[1.8rem] font-black uppercase text-[11px] transition-all ${clubDirectoryTab==='business'?'bg-petrol text-mustard shadow-xl scale-105':'text-gray-400 hover:text-petrol'}`}>Marcas / Negocios</button>
           </div>

           <div className="grid md:grid-cols-3 gap-12 font-black font-black font-black font-black font-black">
             {clubs.filter(c => c.type === clubDirectoryTab && c.city === selectedCity).length === 0 ? (
                <div className="col-span-full py-20 text-center">
                  <p className="text-gray-400 font-black uppercase italic tracking-widest">Aún no hay {clubDirectoryTab === 'club' ? 'clubes registrados' : 'marcas o negocios registrados'} en {selectedCity}.</p>
                </div>
             ) : (
               clubs.filter(c => c.type === clubDirectoryTab && c.city === selectedCity).map(club => (
                 <div key={club.id} className="bg-white p-12 rounded-[5rem] border border-gray-100 shadow-sm hover:shadow-2xl transition-all flex flex-col items-center font-black animate-in zoom-in h-full font-black font-black">
                   <div className="w-36 h-36 rounded-full border-[10px] border-white shadow-2xl overflow-hidden flex items-center justify-center text-gray-300 mb-10">
                     {club.logoUrl ? <img src={club.logoUrl} className="w-full h-full object-cover" /> : <Users size={40} />}
                   </div>
                   <h3 className="text-3xl font-black mb-2 uppercase italic text-petrol font-black font-black font-black font-black font-black font-black font-black">{club.name}</h3>
                   <p className="text-turquoise font-black uppercase text-[10px] mb-10 px-6 py-2 bg-palemint rounded-full font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black">{club.city} • {club.zone || 'Global'}</p>
                   <div className="mt-auto w-full font-black">
                      <button onClick={() => window.open(`https://instagram.com/${club.social}`)} className="bg-petrol text-mustard w-full py-5 rounded-4xl font-black uppercase text-[10px] shadow-lg flex items-center justify-center gap-3 hover:scale-105 italic font-black font-black"><Instagram size={18}/> Ver Perfil</button>
                   </div>
                 </div>
               ))
             )}
           </div>
        </main>
      )}

      {view === 'register' && (
        <main className="max-w-4xl mx-auto px-6 py-24 animate-in slide-in-from-bottom-8 duration-700 text-left flex-1 font-black font-black font-black">
           <h2 className="text-6xl font-black uppercase italic text-petrol mb-4 tracking-tighter leading-none font-black font-black font-black font-black">REGISTRA <span className="text-turquoise font-black font-black font-black font-black font-black">TU CLUB.</span></h2>
           <form onSubmit={async (e) => {
             e.preventDefault();
             const f = new FormData(e.target);
             const selectedFormCity = f.get('city');
             const clubData = { name: f.get('name'), social: f.get('social'), email: f.get('email'), city: selectedFormCity, type: regType, status: 'pending', createdAt: new Date().toISOString() };
             
             const clubRef = await addDoc(collection(db, 'artifacts', FIREBASE_APP_ID, 'public', 'data', 'clubs_pending'), clubData);
             
             if(regType === 'business') {
                const isRecurring = businessEventType === 'recurring';
                const eventPayload = { 
                    clubId: clubRef.id, 
                    organizerName: f.get('name'), 
                    time: f.get('time'), 
                    zone: f.get('zone'), 
                    type: f.get('eventType') || 'EE', 
                    category: f.get('eventCategory') || 'Entrenamiento',
                    city: selectedFormCity, 
                    location: f.get('loc'), 
                    isRecurring: isRecurring, 
                    status: 'pending',
                    createdAt: new Date().toISOString()
                };
                
                if (isRecurring) {
                    eventPayload.day = f.get('day');
                } else {
                    eventPayload.specificDate = f.get('specificDate');
                }
                
                await addDoc(collection(db, 'artifacts', FIREBASE_APP_ID, 'public', 'data', 'events_pending'), eventPayload);
             }
             
             try {
                await fetch("https://formsubmit.co/ajax/pacobaga@gmail.com", {
                    method: "POST",
                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                    body: JSON.stringify({
                        _subject: `[ALERTA] Nuevo Registro en Run City Hub: ${clubData.name}`,
                        Nombre: clubData.name,
                        Tipo: clubData.type === 'club' ? 'Running Club' : 'Marca / Negocio',
                        Ciudad: clubData.city,
                        Instagram: `@${clubData.social}`,
                        Email: clubData.email
                    })
                });
             } catch (error) {
                console.error("Error al enviar correo de notificación", error);
             }
             
             if (window.confirm("Solicitud enviada con éxito. ¿Deseas registrar otra solicitud?")) {
                e.target.reset();
             } else {
                window.location.hash=''; setView('home');
             }
           }} className="bg-gray-50 p-16 rounded-6xl border border-gray-100 shadow-2xl space-y-12 font-black">
              <div className="flex bg-white p-2.5 rounded-4xl shadow-inner border border-gray-50 font-black">
                 <button type="button" onClick={() => setRegType('club')} className={`flex-1 py-5 rounded-[1.8rem] font-black uppercase text-[11px] ${regType==='club'?'bg-petrol text-mustard shadow-2xl scale-105 font-black font-black':'text-gray-300 font-black font-black font-black'}`}>Running Club</button>
                 <button type="button" onClick={() => setRegType('business')} className={`flex-1 py-5 rounded-[1.8rem] font-black uppercase text-[11px] ${regType==='business'?'bg-petrol text-mustard shadow-2xl scale-105 font-black font-black':'text-gray-300 font-black font-black'}`}>Marca / Negocio</button>
              </div>
              <div className="grid md:grid-cols-2 gap-10 font-black text-left font-black font-black">
                <div className="space-y-3 font-black font-black"><label className="text-[11px] font-black uppercase text-gray-400 font-bold font-black font-black">Nombre Oficial</label><input required name="name" className="w-full p-8 rounded-4xl border-none font-black bg-white shadow-sm outline-none text-petrol font-black font-black" /></div>
                <div className="space-y-3 font-black font-black"><label className="text-[11px] font-black uppercase text-gray-400 font-bold font-black font-black">Instagram (@)</label><input required name="social" placeholder="usuario sin @" className="w-full p-8 rounded-4xl border-none font-black bg-white shadow-sm outline-none text-petrol font-black font-black" /></div>
              </div>
              
              <div className="space-y-3 font-black font-black">
                 <label className="text-[11px] font-black uppercase text-gray-400 font-bold font-black font-black">Ciudad Sede</label>
                 <select required name="city" value={formCity} onChange={e => setFormCity(e.target.value)} className="w-full p-8 rounded-4xl border-none font-black bg-white shadow-sm outline-none text-petrol font-black font-black">
                    {allCities.map(c => <option key={c.id || c.name} value={c.name}>{c.name}</option>)}
                 </select>
              </div>

              {regType === 'business' && (
                <div className="p-10 bg-white rounded-5xl border border-mustard/20 space-y-8 animate-in zoom-in duration-300 font-black font-black">
                    <h4 className="text-xl uppercase italic text-petrol border-b border-gray-50 pb-4 font-black font-black">Detalles del Primer Evento</h4>
                    
                    <div className="space-y-3">
                       <label className="text-[11px] font-black uppercase text-gray-400 font-bold">Frecuencia del Evento</label>
                       <div className="flex bg-gray-50 p-2 rounded-3xl mb-6 shadow-inner">
                           <button type="button" onClick={() => setBusinessEventType('recurring')} className={`flex-1 py-4 text-[11px] uppercase font-black rounded-2xl transition-all ${businessEventType === 'recurring' ? 'bg-petrol text-mustard shadow-md' : 'text-gray-400 hover:text-petrol'}`}>Recurrente (Semanal)</button>
                           <button type="button" onClick={() => setBusinessEventType('unique')} className={`flex-1 py-4 text-[11px] uppercase font-black rounded-2xl transition-all ${businessEventType === 'unique' ? 'bg-petrol text-mustard shadow-md' : 'text-gray-400 hover:text-petrol'}`}>Evento Único (Fecha exacta)</button>
                       </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 font-black mt-6">
                        {businessEventType === 'recurring' ? (
                            <select name="day" className="p-6 bg-gray-50 rounded-3xl font-black font-black font-black">{dayNames.map(d=><option key={d}>{d}</option>)}</select>
                        ) : (
                            <input required type="date" name="specificDate" className="p-6 bg-gray-50 rounded-3xl font-black font-black font-black text-gray-500" />
                        )}
                        <input required type="time" name="time" className="p-6 bg-gray-50 rounded-3xl font-black font-black font-black" defaultValue="07:00" />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 font-black">
                       <select required name="eventCategory" className="w-full p-6 bg-gray-50 rounded-3xl font-black font-black font-black font-black font-black">
                          <option value="">Categoría...</option>
                          {EVENT_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                       </select>
                       <select required name="eventType" className="w-full p-6 bg-gray-50 rounded-3xl font-black font-black font-black font-black font-black">
                          <option value="">Tipo de Run...</option>
                          {Object.entries(RUN_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                       </select>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-4 font-black">
                       <select required name="zone" className="w-full p-6 bg-gray-50 rounded-3xl font-black font-black font-black font-black font-black">
                          <option value="">Selecciona una zona...</option>
                          {formZones.length > 0 ? formZones.map(z=><option key={z} value={z}>{z}</option>) : <option value="Global">Global</option>}
                       </select>
                       <input required name="loc" placeholder="Lugar exacto (Ej. Parque México)" className="w-full p-6 bg-gray-50 rounded-3xl font-black font-black font-black" />
                    </div>
                </div>
              )}
              <input required name="email" type="email" placeholder="Email de contacto" className="w-full p-8 rounded-4xl border-none font-black bg-white shadow-sm outline-none text-petrol font-black font-black font-black" />
              <button className="w-full bg-petrol text-mustard py-10 rounded-6xl font-black text-2xl uppercase italic shadow-2xl hover:bg-turquoise hover:text-white transition-all transform active:scale-95 flex items-center justify-center gap-5 font-black uppercase italic font-black font-black">Enviar Solicitud <Send size={28}/></button>
           </form>
        </main>
      )}
      
      {/* INICIO DE SESIÓN PARA CLUBES */}
      {view === 'club-login' && (
        <div className="fixed inset-0 z-[600] flex justify-center p-4 md:p-10 bg-petrol/98 backdrop-blur-3xl animate-in fade-in duration-500 overflow-y-auto font-black text-left font-black font-black">
           <div className="bg-white p-10 md:p-14 rounded-6xl shadow-2xl w-full max-w-md relative border-t-[30px] border-turquoise my-auto font-black font-black font-black font-black">
              <button onClick={() => { window.location.hash=''; setView('home'); }} className="absolute top-6 right-6 p-4 text-petrol bg-gray-50 rounded-full hover:bg-red-50 transition shadow-lg active:scale-90 font-black font-black font-black font-black font-black"><X size={24}/></button>
              <h2 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter mb-4 text-petrol leading-none font-black italic tracking-tighter font-black font-black font-black font-black font-black">PORTAL <br/> <span className="text-turquoise font-black font-black font-black font-black font-black font-black">ORGANIZADOR</span></h2>
              
              <div className="bg-palemint/50 p-4 rounded-2xl mb-8 flex items-start gap-3">
                 <Info size={24} className="text-turquoise shrink-0 mt-1" />
                 <p className="text-xs text-petrol leading-relaxed font-bold">Si tu club ya fue aprobado por nuestro equipo, ingresa creando tu contraseña <strong>usando el mismo correo</strong> con el que te registraste.</p>
              </div>

              <form onSubmit={async (e) => {
                e.preventDefault();
                const email = e.target.email.value;
                const password = e.target.pass.value;
                const mode = e.nativeEvent.submitter.name; 
                
                try {
                  if (mode === 'register') {
                    const isApprovedClub = clubs.find(c => c.email === email);
                    if (!isApprovedClub) {
                      return alert("El correo no pertenece a ningún club aprobado. Si ya mandaste tu solicitud, espera nuestra confirmación.");
                    }
                    await createUserWithEmailAndPassword(auth, email, password);
                    alert("Contraseña creada con éxito.");
                  } else {
                    await signInWithEmailAndPassword(auth, email, password);
                  }
                  setView('club-panel');
                } catch(err) { 
                  if(err.code === 'auth/email-already-in-use') {
                    alert("Ya creaste una contraseña para este correo. Por favor haz clic en 'Iniciar Sesión'.");
                  } else if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
                    alert("Correo o contraseña incorrectos.");
                  } else {
                    alert("Error: " + err.message);
                  }
                }
              }} className="space-y-6 font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black">
                 <div className="space-y-2 font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black"><label className="text-[11px] font-black uppercase text-gray-400 font-black font-black font-black font-black font-black">Email del Club Registrado</label><input required name="email" type="email" placeholder="correo@club.com" className="w-full p-6 bg-gray-50 rounded-4xl font-black text-petrol outline-none border border-gray-100 shadow-inner font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black" /></div>
                 <div className="space-y-2 font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black"><label className="text-[11px] font-black uppercase text-gray-400 font-black font-black font-black font-black font-black">Contraseña</label><input required name="pass" type="password" placeholder="••••••••" className="w-full p-6 bg-gray-50 rounded-4xl font-black text-petrol outline-none border border-gray-100 shadow-inner font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black" /></div>
                 
                 <div className="flex flex-col gap-3 pt-4">
                    <button type="submit" name="login" className="w-full bg-petrol text-white py-6 rounded-4xl font-black text-lg uppercase italic shadow-lg active:scale-95 transition-all">Iniciar Sesión</button>
                    <button type="submit" name="register" className="w-full bg-white border-2 border-gray-100 text-petrol py-6 rounded-4xl font-black text-lg uppercase italic active:scale-95 hover:bg-gray-50 transition-all">Crear mi contraseña</button>
                 </div>
              </form>
           </div>
        </div>
      )}

      {/* PANELES RESTRINGIDOS */}
      {view === 'admin-panel' && (
        <div className="fixed inset-0 z-[700] bg-white animate-in slide-in-from-bottom duration-700 overflow-y-auto text-left font-black font-black font-black font-black font-black font-black">
          <AdminPanel user={user} onClose={() => { window.location.hash=''; setView('home'); }} />
        </div>
      )}
      
      {view === 'club-panel' && (
        <div className="fixed inset-0 z-[700] bg-white animate-in slide-in-from-bottom duration-700 overflow-y-auto text-left font-black font-black font-black font-black font-black font-black">
          <ClubPanel 
            user={user} 
            club={clubs.find(c => c.email === user?.email)} 
            events={events}
            races={races}
            allZones={allZones}
            onClose={() => { window.location.hash=''; setView('home'); }} 
          />
        </div>
      )}
    </div>
  );
};

const App = () => {
  const [user, setUser] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        setIsInitializing(false);
      } else {
        try {
          await signInAnonymously(auth);
        } catch (err) {
          console.error("Auth error:", err);
          setIsInitializing(false);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  if (isInitializing) return <div className="h-screen flex items-center justify-center font-black text-petrol uppercase italic tracking-widest text-sm animate-pulse font-black font-black font-black font-black font-black font-black font-black font-black font-black">Iniciando...</div>;
  return <PublicApp user={user} />;
};

export default App;