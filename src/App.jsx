import React, { useState, useMemo, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, MapPin, Clock, Info, Users, PlusCircle, ChevronRight, 
  Instagram, ExternalLink, Filter, ArrowLeft, CheckCircle2, 
  AlertTriangle, Trophy, ChevronDown, Search, Bell, Loader2, X, Check, Trash2, Lock,
  Globe, CalendarDays, Zap, Settings, Map, Store, Menu as MenuIcon, ChevronLeft, Send, Briefcase, Database
} from 'lucide-react';

// --- FIREBASE IMPORTS ---
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, doc, setDoc, deleteDoc, getDocs, query, orderBy } from 'firebase/firestore';

// --- CONFIGURACIÓN DE FIREBASE ---
// TODO: Pega tus llaves aquí si aún no lo has hecho
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

// --- DATOS DE RESPALDO (Hardcoded para evitar errores de carga) ---
const FIXED_CITIES = [{ id: 'default-cdmx', name: 'CDMX' }];
const FIXED_ZONES = [
  "POLANCO", "ROMA", "CONDESA", "CHAPULTEPEC I", "CHAPULTEPEC II", 
  "REFORMA", "ESTELA DE LUZ", "C.U.", "COYOACAN", "TLALPAN", "SANTA FE"
];

const RUN_TYPES = {
  SR: { label: "Social Run", color: "bg-palemint text-petrol border-turquoise", desc: "Suave / Recreativo" },
  LD: { label: "Long Distance", color: "bg-amber-50 text-amber-700 border-amber-200", desc: "Fondos y Distancia" },
  T: { label: "Técnica", color: "bg-emerald-50 text-emerald-700 border-emerald-100", desc: "Velocidad / Series" },
  TR: { label: "Trail Run", color: "bg-orange-50 text-orange-800 border-orange-200", desc: "Montaña / Desnivel" },
  EE: { label: "Evento Especial", color: "bg-blue-50 text-blue-700 border-blue-200", desc: "Pop-ups y Marcas" }
};

const getMonday = (d) => {
  d = new Date(d);
  const day = d.getDay(), diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
};

const dayNames = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

// ==========================================
// COMPONENTE: PANEL DE GESTIÓN (ADMIN)
// ==========================================
const AdminPanel = ({ user, onClose }) => {
  const [activeTab, setActiveTab] = useState('requests');
  const [pendingClubs, setPendingClubs] = useState([]);
  const [pendingEvents, setPendingEvents] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [races, setRaces] = useState([]);
  const [cities, setCities] = useState(FIXED_CITIES);
  const [zones, setZones] = useState([]);
  
  const [newZone, setNewZone] = useState({ name: '', city: 'CDMX' });
  const [newCity, setNewCity] = useState('');
  const [newRace, setNewRace] = useState({ name: '', date: '', distance: '', zone: '', link: '', city: 'CDMX' });

  useEffect(() => {
    if (!user) return;
    const unsub = [
      onSnapshot(collection(db, 'artifacts', FIREBASE_APP_ID, 'public', 'data', 'clubs_pending'), s => setPendingClubs(s.docs.map(d => ({id:d.id, ...d.data()}))), e => console.log("Pendientes error")),
      onSnapshot(collection(db, 'artifacts', FIREBASE_APP_ID, 'public', 'data', 'events_pending'), s => setPendingEvents(s.docs.map(d => ({id:d.id, ...d.data()})))),
      onSnapshot(collection(db, 'artifacts', FIREBASE_APP_ID, 'public', 'data', 'clubs'), s => setClubs(s.docs.map(d => ({id:d.id, ...d.data()})))),
      onSnapshot(collection(db, 'artifacts', FIREBASE_APP_ID, 'public', 'data', 'races'), s => setRaces(s.docs.map(d => ({id:d.id, ...d.data()})))),
      onSnapshot(collection(db, 'artifacts', FIREBASE_APP_ID, 'public', 'data', 'cities'), s => {
        const dbCities = s.docs.map(d => ({id:d.id, ...d.data()}));
        if(dbCities.length > 0) setCities(dbCities);
      }),
      onSnapshot(collection(db, 'artifacts', FIREBASE_APP_ID, 'public', 'data', 'zones'), s => setZones(s.docs.map(d => ({id:d.id, ...d.data()}))))
    ];
    return () => unsub.forEach(fn => fn());
  }, [user]);

  const handleApproveClub = async (club) => {
    const { id, ...data } = club;
    await setDoc(doc(db, 'artifacts', FIREBASE_APP_ID, 'public', 'data', 'clubs', id), { ...data, status: 'active' });
    await deleteDoc(doc(db, 'artifacts', FIREBASE_APP_ID, 'public', 'data', 'clubs_pending', id));
    alert("Entidad aprobada.");
  };

  const handleAddRace = async (e) => {
    e.preventDefault();
    await addDoc(collection(db, 'artifacts', FIREBASE_APP_ID, 'public', 'data', 'races'), newRace);
    alert("Carrera publicada.");
    setNewRace({ name: '', date: '', distance: '', zone: '', link: '', city: 'CDMX' });
  };

  const handleAddCity = async () => {
    if(!newCity) return;
    try {
      await addDoc(collection(db, 'artifacts', FIREBASE_APP_ID, 'public', 'data', 'cities'), { name: newCity.toUpperCase() });
      setNewCity('');
    } catch(e) { alert("Error de permisos."); }
  };

  const handleAddZone = async () => {
    if(!newZone.name) return;
    try {
      await addDoc(collection(db, 'artifacts', FIREBASE_APP_ID, 'public', 'data', 'zones'), { 
        name: newZone.name.toUpperCase(), 
        city: newZone.city.toUpperCase() 
      });
      setNewZone({ ...newZone, name: '' });
    } catch(e) { alert("Error de permisos."); }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-left">
      <nav className="bg-petrol text-white p-8 flex flex-col md:flex-row justify-between items-center shadow-2xl px-12 gap-6 sticky top-0 z-50">
        <h2 className="text-3xl font-black uppercase italic tracking-tighter">CENTRO DE <span className="text-mustard">MANDOS</span></h2>
        <div className="flex flex-wrap justify-center gap-4">
          <button onClick={() => setActiveTab('requests')} className={`px-6 py-2 rounded-full font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === 'requests' ? 'bg-mustard text-petrol scale-105 shadow-lg' : 'bg-white/10'}`}>Solicitudes ({pendingClubs.length})</button>
          <button onClick={() => setActiveTab('events')} className={`px-6 py-2 rounded-full font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === 'events' ? 'bg-mustard text-petrol scale-105 shadow-lg' : 'bg-white/10'}`}>Eventos ({pendingEvents.length})</button>
          <button onClick={() => setActiveTab('races_admin')} className={`px-6 py-2 rounded-full font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === 'races_admin' ? 'bg-mustard text-petrol scale-105 shadow-lg' : 'bg-white/10'}`}>Carreras</button>
          <button onClick={() => setActiveTab('config')} className={`px-6 py-2 rounded-full font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === 'config' ? 'bg-mustard text-petrol scale-105 shadow-lg' : 'bg-white/10'}`}>Configuración</button>
          <button onClick={onClose} className="px-8 py-2 bg-red-500 text-white rounded-full font-black text-[10px] uppercase tracking-widest">Cerrar</button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-12 w-full font-black text-petrol text-left">
        {activeTab === 'requests' && (
          <div className="grid gap-6">
            {pendingClubs.map(c => (
              <div key={c.id} className="bg-white p-10 rounded-5xl shadow-xl flex flex-col md:flex-row justify-between items-center border border-gray-100">
                <div className="text-left w-full">
                  <span className="bg-turquoise text-white text-[8px] font-black px-3 py-1 rounded-full uppercase tracking-widest mb-2 inline-block">NUEVA SOLICITUD</span>
                  <h3 className="font-black text-2xl uppercase italic text-petrol">{c.name}</h3>
                  <p className="text-gray-400 font-bold uppercase text-xs tracking-widest">@{c.social} • {c.email}</p>
                </div>
                <div className="flex gap-3 shrink-0">
                   <button onClick={async () => await deleteDoc(doc(db, 'artifacts', FIREBASE_APP_ID, 'public', 'data', 'clubs_pending', c.id))} className="p-5 text-red-300 hover:text-red-500 transition-colors bg-red-50 rounded-3xl"><Trash2 size={24}/></button>
                   <button onClick={() => handleApproveClub(c)} className="bg-turquoise text-white px-12 py-5 rounded-4xl font-black text-xs uppercase tracking-widest shadow-lg">Aprobar</button>
                </div>
              </div>
            ))}
            {pendingClubs.length === 0 && <p className="text-center py-20 text-gray-300 font-black uppercase italic tracking-widest">Sin solicitudes pendientes</p>}
          </div>
        )}

        {activeTab === 'races_admin' && (
          <div className="grid md:grid-cols-2 gap-12 text-left text-left">
            <div className="bg-white p-10 rounded-6xl shadow-xl border border-gray-100">
              <h3 className="text-2xl font-black mb-8 uppercase italic flex items-center gap-3 text-petrol"><Trophy className="text-mustard"/> Nueva Carrera</h3>
              <form onSubmit={handleAddRace} className="space-y-6">
                <input required placeholder="Nombre Carrera" className="w-full p-6 bg-gray-50 rounded-3xl font-black shadow-inner border-none outline-none" value={newRace.name} onChange={e => setNewRace({...newRace, name: e.target.value})} />
                <div className="grid grid-cols-2 gap-4">
                  <input required type="date" className="w-full p-6 bg-gray-50 rounded-3xl font-black shadow-inner border-none outline-none" value={newRace.date} onChange={e => setNewRace({...newRace, date: e.target.value})} />
                  <input required placeholder="Distancias" className="w-full p-6 bg-gray-50 rounded-3xl font-black shadow-inner border-none outline-none" value={newRace.distance} onChange={e => setNewRace({...newRace, distance: e.target.value})} />
                </div>
                <input required placeholder="Link Registro" className="w-full p-6 bg-gray-50 rounded-3xl font-black shadow-inner border-none outline-none" value={newRace.link} onChange={e => setNewRace({...newRace, link: e.target.value})} />
                <button className="w-full bg-petrol text-mustard py-6 rounded-6xl font-black text-xl uppercase shadow-2xl italic">Publicar</button>
              </form>
            </div>
            <div className="space-y-4 max-h-[600px] overflow-y-auto no-scrollbar">
              <h3 className="text-xl font-black uppercase italic text-petrol mb-4">Meta Carreras Registradas</h3>
              {races.map(r => (
                <div key={r.id} className="bg-white p-6 rounded-4xl border border-gray-100 flex justify-between items-center shadow-sm font-black">
                  <div><h4 className="font-black text-lg text-petrol uppercase leading-none">{r.name}</h4><p className="text-gray-400 text-[10px] font-bold uppercase mt-1">{r.date}</p></div>
                  <button onClick={async () => { if(confirm("¿Borrar?")) await deleteDoc(doc(db, 'artifacts', FIREBASE_APP_ID, 'public', 'data', 'races', r.id)) }} className="p-4 text-red-200 hover:text-red-500 bg-red-50 rounded-2xl"><Trash2 size={18}/></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'config' && (
          <div className="grid md:grid-cols-2 gap-12 text-left text-left">
            <div className="bg-white p-12 rounded-6xl shadow-xl border border-gray-100">
              <h3 className="text-2xl font-black mb-8 uppercase italic flex items-center gap-3 text-petrol"><MapPin className="text-turquoise"/> Gestionar Zonas</h3>
              <div className="flex gap-4 mb-8">
                <select className="p-4 bg-gray-50 rounded-2xl font-bold uppercase text-[10px] outline-none border border-gray-100 shadow-inner" value={newZone.city} onChange={e => setNewZone({...newZone, city: e.target.value})}>
                  {cities.map(ct => <option key={ct.id} value={ct.name}>{ct.name}</option>)}
                </select>
                <input placeholder="Nombre Zona" className="flex-1 p-4 bg-gray-50 rounded-2xl font-bold uppercase text-[10px] outline-none shadow-inner" value={newZone.name} onChange={e => setNewZone({...newZone, name: e.target.value})} />
                <button onClick={handleAddZone} className="p-4 bg-petrol text-mustard rounded-2xl shadow-lg hover:bg-turquoise transition-colors"><PlusCircle/></button>
              </div>
              <div className="grid grid-cols-1 gap-3 h-96 overflow-y-auto no-scrollbar font-black text-petrol">
                {zones.map(z => (
                  <div key={z.id} className="p-4 bg-gray-50 rounded-3xl flex justify-between items-center border border-gray-100 font-black">
                    <span className="text-[11px] font-black uppercase tracking-widest text-petrol">{z.name} <span className="opacity-30 ml-1">({z.city})</span></span>
                    <button onClick={async () => await deleteDoc(doc(db, 'artifacts', FIREBASE_APP_ID, 'public', 'data', 'zones', z.id))} className="text-gray-300 hover:text-red-500 transition-colors font-black"><Trash2 size={16}/></button>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-12 rounded-6xl shadow-xl border border-gray-100 text-left font-black">
              <h3 className="text-2xl font-black mb-8 uppercase italic flex items-center gap-3 text-petrol"><Globe className="text-turquoise"/> Gestionar Ciudades</h3>
              <div className="flex gap-4 mb-8">
                <input placeholder="Nombre Ciudad" className="flex-1 p-4 bg-gray-50 rounded-2xl font-bold uppercase text-[10px] outline-none shadow-inner" value={newCity} onChange={e => setNewCity(e.target.value)} />
                <button onClick={handleAddCity} className="p-4 bg-petrol text-mustard rounded-2xl shadow-lg hover:bg-turquoise transition-colors font-black"><PlusCircle/></button>
              </div>
              <div className="space-y-4 font-black">
                {cities.map(c => (
                  <div key={c.id} className="p-4 bg-gray-50 rounded-3xl flex justify-between items-center border border-gray-100 font-black">
                    <span className="text-[11px] font-black uppercase tracking-widest font-black text-petrol">{c.name}</span>
                    <button onClick={async () => await deleteDoc(doc(db, 'artifacts', FIREBASE_APP_ID, 'public', 'data', 'cities', c.id))} className="text-gray-300 hover:text-red-500 transition-colors font-black"><Trash2 size={18}/></button>
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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedCity, setSelectedCity] = useState('CDMX');
  const [selectedZone, setSelectedZone] = useState('Todos');
  const [currentWeekStart, setCurrentWeekStart] = useState(getMonday(new Date()));
  const [selectedEvent, setSelectedEvent] = useState(null);

  const [clubs, setClubs] = useState([]);
  const [events, setEvents] = useState([]);
  const [zones, setZones] = useState([]);
  const [cities, setCities] = useState(FIXED_CITIES);
  const [races, setRaces] = useState([]);
  const [loading, setLoading] = useState(true);

  const [regType, setRegType] = useState('club');

  useEffect(() => {
    if (!user) return;
    const unsub = [
      onSnapshot(collection(db, 'artifacts', FIREBASE_APP_ID, 'public', 'data', 'cities'), s => {
        const dbCities = s.docs.map(d => ({id:d.id, ...d.data()}));
        if(dbCities.length > 0) setCities(dbCities);
      }),
      onSnapshot(collection(db, 'artifacts', FIREBASE_APP_ID, 'public', 'data', 'zones'), s => setZones(s.docs.map(d => ({id:d.id, ...d.data()})))),
      onSnapshot(collection(db, 'artifacts', FIREBASE_APP_ID, 'public', 'data', 'clubs'), s => { setClubs(s.docs.map(d => ({id:d.id, ...d.data()}))); setLoading(false); }),
      onSnapshot(collection(db, 'artifacts', FIREBASE_APP_ID, 'public', 'data', 'events'), s => setEvents(s.docs.map(d => ({id:d.id, ...d.data()})))),
      onSnapshot(collection(db, 'artifacts', FIREBASE_APP_ID, 'public', 'data', 'races'), s => setRaces(s.docs.map(d => ({id:d.id, ...d.data()}))))
    ];
    return () => unsub.forEach(fn => fn());
  }, [user]);

  const weekDates = useMemo(() => [0, 1, 2, 3, 4, 5, 6].map(i => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + i);
    return d;
  }), [currentWeekStart]);

  const filteredEvents = useMemo(() => events.filter(e => {
    const matchesZone = selectedZone === 'Todos' || e.zone === selectedZone;
    const matchesCity = e.city?.toUpperCase() === selectedCity?.toUpperCase() || !e.city;
    return matchesZone && matchesCity;
  }), [events, selectedZone, selectedCity]);

  // Lógica de visualización de zonas (FALLBACK CDMX)
  const currentZonesDisplay = useMemo(() => {
    const dbZones = zones.filter(z => z.city?.toUpperCase() === selectedCity?.toUpperCase()).map(z => z.name);
    const baseZones = selectedCity === 'CDMX' ? FIXED_ZONES : [];
    return ["Todos", ...new Set([...baseZones, ...dbZones])];
  }, [zones, selectedCity]);

  const getEventForSlot = (dayName, time, dateObj) => {
    return filteredEvents.find(e => {
      if (e.time !== time) return false;
      if (e.isRecurring) return e.day === dayName;
      return new Date(e.specificDate).toDateString() === dateObj.toDateString();
    });
  };

  const sortedRaces = useMemo(() => races
    .filter(r => (selectedCity === 'Todas' || r.city === selectedCity))
    .sort((a, b) => new Date(a.date) - new Date(b.date)), [races, selectedCity]);

  const morningTimes = ["06:00", "07:00", "08:00", "08:30"];
  const eveningTimes = ["18:00", "19:00", "20:00", "20:30"];

  if (loading) return <div className="h-screen flex flex-col items-center justify-center font-black text-petrol gap-6 uppercase tracking-[0.5em] animate-pulse italic text-sm font-black">
    <div className="w-16 h-16 border-4 border-turquoise border-t-transparent rounded-full animate-spin"></div>
    Sincronizando la Ciudad...
  </div>;

  return (
    <div className="min-h-screen bg-white text-petrol font-sans flex flex-col transition-all text-center">
      
      {/* NAVBAR */}
      <header className="bg-white/95 backdrop-blur-xl border-b border-gray-100 sticky top-0 z-[100] px-6 py-5 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center cursor-pointer group" onClick={() => setView('home')}>
             <div className="w-11 h-11 md:w-14 md:h-14 bg-white rounded-2xl flex items-center justify-center mr-4 shadow-xl overflow-hidden border border-gray-100 logo-shadow group-hover:rotate-12 transition-transform font-black font-black">
               <img src="https://firebasestorage.googleapis.com/v0/b/city-run-hub-prod.appspot.com/o/public%2Fruncityhublogobash?alt=media" className="w-full h-full object-contain p-1.5 font-black" alt="Logo" />
             </div>
             <div className="text-xl md:text-3xl font-black tracking-tighter uppercase italic leading-none text-left tracking-tighter font-black font-black">RUN CITY <span className="text-turquoise font-black italic">HUB</span></div>
          </div>

          <nav className="hidden lg:flex items-center gap-10 text-[11px] font-black uppercase tracking-[0.3em] text-gray-400 font-black font-black font-black">
            <button onClick={() => setView('home')} className={view==='home'?'text-petrol':''}>Inicio</button>
            <button onClick={() => { setView('home'); setTimeout(() => document.getElementById('agenda')?.scrollIntoView({behavior:'smooth'}), 100); }}>Calendario</button>
            <button onClick={() => setView('races')} className={view==='races'?'text-petrol':''}>Carreras 2026</button>
            <button onClick={() => setView('clubs')} className={view==='clubs'?'text-petrol':''}>Clubes</button>
            <button onClick={() => setView('register')} className={view==='register'?'text-petrol':''}>Soy Club</button>
            <div className="relative flex items-center bg-gray-50 rounded-xl px-4 py-2 font-black text-petrol border border-gray-100 shadow-inner group font-black">
              <select className="bg-transparent outline-none appearance-none pr-8 cursor-pointer uppercase text-[10px] tracking-widest font-black" value={selectedCity} onChange={e => { setSelectedCity(e.target.value); setSelectedZone('Todos'); }}>
                {cities.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-petrol" size={14} />
            </div>
            <button onClick={() => setView('register')} className="bg-petrol text-mustard px-10 py-3.5 rounded-full shadow-2xl hover:bg-turquoise hover:text-white transition-all font-black uppercase italic tracking-widest text-[12px] active:scale-95 font-black">Unirse</button>
          </nav>

          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="lg:hidden p-3 bg-gray-50 rounded-2xl text-petrol font-black flex items-center gap-2 transition-all active:scale-90 font-black shadow-sm font-black font-black font-black">
            {isMenuOpen ? <X size={22}/> : <MenuIcon size={22}/>} <span className="text-[11px] uppercase tracking-widest font-black font-black font-black font-black">{isMenuOpen ? 'Cerrar' : 'Menú'}</span>
          </button>
        </div>
        {isMenuOpen && (
          <div className="absolute top-full left-0 w-full bg-white shadow-2xl p-10 flex flex-col gap-8 lg:hidden border-t border-gray-100 text-left animate-in slide-in-from-top duration-500 font-black font-black">
             <button onClick={() => { setView('home'); setIsMenuOpen(false); }} className="text-3xl font-black uppercase italic border-b border-gray-50 pb-6 text-petrol font-black font-black font-black">Inicio</button>
             <button onClick={() => { setView('home'); setIsMenuOpen(false); setTimeout(() => document.getElementById('agenda')?.scrollIntoView({behavior:'smooth'}), 100); }} className="text-3xl font-black uppercase italic border-b border-gray-50 pb-6 text-petrol text-left font-black">Calendario</button>
             <button onClick={() => { setView('races'); setIsMenuOpen(false); }} className="text-3xl font-black uppercase italic border-b border-gray-50 pb-6 text-petrol font-black">Carreras 2026</button>
             <button onClick={() => { setView('clubs'); setIsMenuOpen(false); }} className="text-3xl font-black uppercase italic border-b border-gray-50 pb-6 text-petrol font-black">Clubes</button>
             <button onClick={() => {setView('register'); setIsMenuOpen(false)}} className="bg-petrol text-mustard p-8 rounded-6xl font-black text-2xl uppercase italic shadow-2xl text-center active:scale-95 transition-all font-black">Registrar Club</button>
          </div>
        )}
      </header>

      {/* HOME SECTION */}
      {view === 'home' && (
        <main className="animate-in fade-in duration-1000 flex-1">
           <section className="max-w-7xl mx-auto px-6 pt-16 md:pt-32 pb-32 flex flex-col lg:flex-row items-center gap-20 text-center lg:text-left font-black">
              <div className="flex-1">
                 <h1 className="hero-title mb-10 leading-[0.8] font-black italic tracking-tighter font-black font-black font-black font-black">NO CORRAS <br /> SOLO, <br /><span className="text-turquoise font-black italic font-black font-black font-black">CORRE EN EQUIPO.</span></h1>
                 <p className="text-xl md:text-2xl text-gray-400 font-medium italic mb-14 max-w-xl mx-auto lg:mx-0 leading-relaxed text-left font-black font-black font-black">La plataforma centralizada para encontrar tu próximo equipo, social run o carrera en tu ciudad.</p>
                 <div className="flex flex-col sm:flex-row gap-6 justify-center lg:justify-start font-black font-black">
                    <button onClick={() => document.getElementById('agenda')?.scrollIntoView({behavior:'smooth'})} className="bg-petrol text-mustard px-16 py-7 rounded-6xl font-black text-2xl shadow-[0_35px_60px_-15px_rgba(27,67,83,0.3)] hover:scale-105 transition-all uppercase italic active:scale-95 font-black font-black font-black">Ver Calendario</button>
                    <button onClick={() => setView('register')} className="bg-white border-4 border-gray-100 text-petrol px-16 py-7 rounded-6xl font-black text-2xl hover:border-mustard transition-all uppercase italic active:scale-95 font-black font-black">Registrar Club</button>
                 </div>
              </div>
              <div className="flex-1 relative w-full flex justify-center">
                 <div className="rounded-6xl overflow-hidden shadow-2xl border-[18px] border-white -rotate-3 hover:rotate-0 transition-all duration-1000 w-full max-w-xl aspect-square bg-gray-50">
                    <img src="https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=1200" className="w-full h-full object-cover" alt="Runners" />
                 </div>
              </div>
           </section>

           {/* AGENDA SEMANAL */}
           <section id="agenda" className="max-w-7xl mx-auto px-6 py-32 border-t border-gray-100 text-center text-left font-black">
              <h2 className="text-6xl md:text-8xl font-black uppercase italic tracking-tighter mb-20 text-petrol leading-none font-black tracking-tighter font-black font-black font-black font-black">AGENDA <span className="text-turquoise font-black italic font-black font-black font-black font-black">SEMANAL</span></h2>
              
              <div className="bg-white p-10 rounded-5xl border border-gray-100 shadow-sm mb-20 overflow-x-auto no-scrollbar font-black text-petrol font-black font-black font-black">
                <div className="flex items-center gap-12 min-w-max text-left font-black text-petrol font-black font-black font-black font-black">
                   <div className="text-[11px] font-black uppercase tracking-[0.3em] border-r pr-10 border-gray-100 font-black font-black tracking-widest font-black">Guía de Sesiones</div>
                   {Object.entries(RUN_TYPES).map(([k,v]) => (
                     <div key={k} className="flex items-center gap-4 font-black">
                        <span className={`px-5 py-2 rounded-2xl border-2 font-black text-[10px] tracking-widest ${v.color} font-black font-black`}>{k}</span>
                        <div className="font-black text-left"><p className="text-[13px] font-black leading-none mb-1 text-petrol uppercase tracking-tighter font-black font-black font-black">{v.label}</p><p className="text-[10px] text-gray-500 font-bold uppercase tracking-tight font-black font-black font-black font-black font-black font-black">{v.desc}</p></div>
                     </div>
                   ))}
                </div>
              </div>

              {/* LISTADO DE ZONAS (FALLBACK) */}
              <div className="flex flex-col gap-12 mb-20 font-black text-center font-black">
                 <div className="flex flex-wrap gap-3 justify-center font-black font-black font-black">
                    {currentZonesDisplay.map(z => (
                      <button key={z} onClick={() => setSelectedZone(z)} className={`px-10 py-5 rounded-[2.5rem] text-[11px] font-black uppercase tracking-widest transition-all ${selectedZone === z ? 'bg-petrol text-mustard shadow-xl scale-105' : 'bg-gray-50 text-gray-400 hover:bg-gray-100 font-black font-black font-black'} font-black font-black font-black`}>{z}</button>
                    ))}
                 </div>
                 <div className="bg-gray-50 p-10 rounded-[4.5rem] flex flex-col md:flex-row items-center justify-between gap-10 border border-gray-100 shadow-inner text-left font-black text-petrol font-black font-black font-black">
                    <div className="flex items-center gap-8 font-black font-black">
                       <button onClick={() => setCurrentWeekStart(new Date(currentWeekStart.setDate(currentWeekStart.getDate()-7)))} className="p-5 bg-white rounded-3xl shadow-xl hover:bg-petrol hover:text-white transition-all active:scale-90 font-black font-black font-black font-black font-black"><ChevronLeft size={28}/></button>
                       <div className="text-center min-w-[280px] font-black font-black font-black">
                          <p className="text-[11px] font-black uppercase tracking-[0.4em] mb-2 font-black italic tracking-widest text-gray-400 font-black font-black font-black">Semana del asfalto</p>
                          <h4 className="text-2xl font-black uppercase italic tracking-tighter text-petrol leading-none font-black tracking-tighter font-black font-black uppercase font-black">{weekDates[0].getDate()} {weekDates[0].toLocaleString('es-MX', {month:'short'})} — {weekDates[6].getDate()} {weekDates[6].toLocaleString('es-MX', {month:'short'})}</h4>
                       </div>
                       <button onClick={() => setCurrentWeekStart(new Date(currentWeekStart.setDate(currentWeekStart.getDate()+7)))} className="p-5 bg-white rounded-3xl shadow-xl hover:bg-petrol hover:text-white transition-all active:scale-90 font-black font-black font-black font-black font-black"><ChevronRight size={28}/></button>
                    </div>
                    <button onClick={() => setCurrentWeekStart(getMonday(new Date()))} className="bg-white text-petrol border-2 border-gray-100 px-12 py-5 rounded-full font-black text-[10px] uppercase tracking-[0.3em] hover:bg-palemint transition shadow-xl active:scale-95 font-black font-black uppercase italic font-black font-black font-black font-black font-black font-black font-black font-black">Hoy</button>
                 </div>
              </div>

              <div className="space-y-24 text-left font-black font-black font-black">
                 {[{t: 'MAÑANA', times: morningTimes, color: 'bg-petrol'}, {t: 'TARDE', times: eveningTimes, color: 'bg-turquoise'}].map(sec => (
                   <div key={sec.t} className="bg-white rounded-[5rem] shadow-[0_40px_80px_-20px_rgba(27,67,83,0.08)] overflow-hidden border border-gray-100 text-left font-black font-black font-black font-black">
                      <div className={`${sec.color} p-12 text-white flex justify-between items-center font-black font-black`}><h3 className="text-4xl font-black uppercase italic leading-none tracking-tighter font-black font-black font-black font-black font-black font-black font-black font-black font-black">{sec.t}</h3><span className="bg-white/10 px-8 py-3 rounded-full font-black text-[11px] uppercase tracking-[0.4em] backdrop-blur-md font-black font-black font-black">{selectedCity}</span></div>
                      <div className="overflow-x-auto no-scrollbar font-black font-black font-black font-black font-black font-black">
                        <table className="w-full min-w-[1200px] border-collapse font-black font-black font-black font-black font-black font-black font-black">
                           <thead><tr className="bg-gray-50/50 text-[10px] font-black text-petrol uppercase border-b border-gray-100 font-black tracking-widest font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black"><th className="p-12 text-left w-48 opacity-40 font-black font-black font-black font-black">Horario</th>{dayNames.map((d, i) => <th key={d} className="p-10 text-center font-black font-black font-black font-black font-black uppercase font-black font-black font-black">{d} <br/><span className="text-turquoise text-[10px] font-black font-black font-black font-black font-black font-black">{weekDates[i].getDate()} {weekDates[i].toLocaleString('es-MX', {month:'short'})}</span></th>)}</tr></thead>
                           <tbody>
                              {sec.times.map(t => (
                                <tr key={t} className="group font-black font-black font-black font-black"><td className="p-12 text-sm font-black text-gray-300 border-b border-gray-50 font-black group-hover:text-petrol transition-colors font-black font-black font-black font-black font-black font-black">{t}</td>{dayNames.map((d, i) => {
                                  const ev = getEventForSlot(d, t, weekDates[i]);
                                  const cl = ev?.clubId ? clubs.find(c => c.id === ev.clubId) : null;
                                  return <td key={d+t} className="p-2 border-b border-gray-50 h-52 align-top font-black font-black font-black font-black font-black">{ev && (
                                      <div onClick={() => setSelectedEvent({...ev, club: cl || {name: ev.organizerName}})} className={`p-7 rounded-[3rem] border-l-[14px] cursor-pointer hover:shadow-2xl hover:-translate-y-2 transition-all h-full flex flex-col justify-between text-left shadow-sm ${RUN_TYPES[ev.type]?.color || 'bg-gray-50'} font-black font-black font-black`}><span className="text-[9px] font-black uppercase opacity-40 font-black font-black font-black font-black font-black font-black font-black font-black font-black">{RUN_TYPES[ev.type]?.label}</span><div className="text-lg font-black leading-tight uppercase italic line-clamp-2 text-petrol font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black">{cl ? cl.name : ev.organizerName}</div><div className="space-y-1.5 mt-4 font-black font-black font-black font-black font-black"><div className="text-[10px] font-bold text-turquoise flex items-center gap-2 uppercase font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black"><Zap size={12}/> {ev.distance || 'Social Run'}</div><div className="text-[10px] font-bold text-gray-400 flex items-center gap-2 uppercase font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black"><MapPin size={12}/> {ev.zone}</div></div></div>
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

      {/* RACES SECTION */}
      {view === 'races' && (
        <main className="max-w-7xl mx-auto px-6 py-24 animate-in fade-in duration-700 flex-1 text-center font-black">
           <h2 className="text-6xl md:text-8xl font-black uppercase italic tracking-tighter text-petrol mb-12 font-black leading-none font-black font-black">METAS <span className="text-turquoise font-black italic font-black font-black font-black font-black font-black font-black">2026</span></h2>
           <div className="grid gap-10 max-w-4xl mx-auto text-left font-black font-black font-black font-black">
             {sortedRaces.map(r => (
               <div key={r.id} className="bg-white p-10 rounded-[4rem] border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-8 border-l-[15px] border-l-mustard hover:shadow-2xl transition-all group font-black font-black">
                 <div className="flex flex-col items-center justify-center bg-palemint w-28 h-28 rounded-[2.5rem] shrink-0 border border-turquoise/20 font-black font-black font-black font-black font-black font-black font-black"><span className="text-[11px] font-black uppercase text-petrol font-black font-black font-black font-black font-black font-black">{new Date(r.date).toLocaleString('es-MX', {month:'short'})}</span><span className="text-5xl font-black text-petrol font-black font-black font-black font-black font-black font-black">{new Date(r.date).getUTCDate()}</span></div>
                 <div className="flex-1 font-black text-petrol text-left font-black font-black font-black font-black font-black"><h4 className="text-3xl font-black uppercase italic leading-none group-hover:text-turquoise transition-colors font-black font-black font-black font-black font-black font-black font-black">{r.name}</h4><p className="text-gray-400 text-xs font-bold uppercase mt-3 flex items-center gap-3 font-black font-black font-black font-black font-black font-black"><Trophy size={14} className="text-mustard"/> {r.distance} • <MapPin size={14} className="text-mustard"/> {r.zone}</p></div>
                 <button onClick={() => window.open(r.link)} className="bg-petrol text-mustard px-12 py-5 rounded-full font-black text-xs uppercase shadow-xl hover:scale-105 active:scale-95 italic font-black font-black font-black font-black">Inscribirme</button>
               </div>
             ))}
             {races.length === 0 && <p className="text-center py-20 text-gray-300 font-black uppercase italic tracking-widest font-black">Buscando carreras...</p>}
           </div>
        </main>
      )}

      {/* CLUBS SECTION */}
      {view === 'clubs' && (
        <main className="max-w-7xl mx-auto px-6 py-24 animate-in slide-in-from-bottom duration-700 flex-1 text-center font-black">
           <h2 className="text-6xl md:text-8xl font-black uppercase italic tracking-tighter text-petrol mb-24 font-black leading-none font-black font-black font-black">DIRECTORIO <br/><span className="text-turquoise italic font-black font-black font-black font-black font-black font-black font-black">DE CLUBES.</span></h2>
           <div className="grid md:grid-cols-3 gap-12 font-black font-black font-black">
             {clubs.map(club => (
               <div key={club.id} className="bg-white p-12 rounded-[5rem] border border-gray-100 shadow-sm hover:shadow-2xl transition-all flex flex-col items-center font-black animate-in zoom-in font-black font-black font-black">
                 <img src={club.logoUrl || "https://via.placeholder.com/200"} className="w-36 h-36 rounded-full border-[10px] border-white shadow-2xl object-cover mb-10 font-black font-black font-black" />
                 <h3 className="text-3xl font-black mb-2 uppercase italic text-petrol font-black font-black font-black font-black font-black">{club.name}</h3>
                 <p className="text-turquoise font-black uppercase text-[10px] mb-10 px-6 py-2 bg-palemint rounded-full font-black font-black font-black font-black font-black">{club.city} • {club.zone || 'Global'}</p>
                 <button onClick={() => window.open(`https://instagram.com/${club.social}`)} className="bg-petrol text-mustard w-full py-5 rounded-4xl font-black uppercase text-[10px] shadow-lg flex items-center justify-center gap-3 hover:scale-105 italic font-black font-black font-black font-black font-black"><Instagram size={18}/> Ver Perfil</button>
               </div>
             ))}
           </div>
        </main>
      )}

      {/* REGISTER SECTION */}
      {view === 'register' && (
        <main className="max-w-4xl mx-auto px-6 py-24 animate-in slide-in-from-bottom-8 duration-700 text-left flex-1 font-black">
           <h2 className="text-6xl font-black uppercase italic text-petrol mb-4 tracking-tighter leading-none font-black font-black font-black">REGISTRA <span className="text-turquoise font-black font-black font-black font-black">TU CLUB.</span></h2>
           <form onSubmit={async (e) => {
             e.preventDefault();
             const f = new FormData(e.target);
             const clubData = { name: f.get('name'), social: f.get('social'), email: f.get('email'), city: selectedCity, type: regType, status: 'pending', createdAt: new Date().toISOString() };
             await addDoc(collection(db, 'artifacts', FIREBASE_APP_ID, 'public', 'data', 'clubs_pending'), clubData);
             alert("Enviado para revisión."); setView('home');
           }} className="bg-gray-50 p-16 rounded-6xl border border-gray-100 shadow-2xl space-y-12 font-black">
              <div className="flex bg-white p-2.5 rounded-4xl shadow-inner border border-gray-50 font-black">
                 <button type="button" onClick={() => setRegType('club')} className={`flex-1 py-5 rounded-[1.8rem] font-black uppercase text-[11px] ${regType==='club'?'bg-petrol text-mustard shadow-2xl scale-105':'text-gray-300'}`}>Running Club</button>
                 <button type="button" onClick={() => setRegType('business')} className={`flex-1 py-5 rounded-[1.8rem] font-black uppercase text-[11px] ${regType==='business'?'bg-petrol text-mustard shadow-2xl scale-105':'text-gray-300'}`}>Marca / Negocio</button>
              </div>
              <div className="grid md:grid-cols-2 gap-10 font-black text-left"><div className="space-y-3"><label className="text-[11px] font-black uppercase text-gray-400 font-bold">Nombre</label><input required name="name" className="w-full p-8 rounded-4xl border-none font-black bg-white shadow-sm outline-none text-petrol" /></div><div className="space-y-3"><label className="text-[11px] font-black uppercase text-gray-400 font-bold">Instagram</label><input required name="social" placeholder="@" className="w-full p-8 rounded-4xl border-none font-black bg-white shadow-sm outline-none text-petrol" /></div></div>
              <button className="w-full bg-petrol text-mustard py-10 rounded-6xl font-black text-2xl uppercase italic shadow-2xl hover:bg-turquoise hover:text-white transition-all transform active:scale-95 flex items-center justify-center gap-5 font-black uppercase italic font-black font-black">Enviar Solicitud <Send size={28}/></button>
           </form>
        </main>
      )}

      {/* FOOTER */}
      <footer className="bg-petrol text-white py-32 mt-auto rounded-t-6xl relative overflow-hidden px-8 text-center font-black">
        <div className="max-w-7xl mx-auto flex flex-col items-center gap-12 relative z-10 text-center font-black font-black">
           <div className="text-5xl md:text-9xl font-black italic tracking-tighter text-mustard/15 uppercase leading-none select-none opacity-50 tracking-tighter font-black font-black font-black font-black font-black">RUN CITY HUB</div>
           <nav className="flex flex-wrap justify-center gap-10 md:gap-16 text-[10px] font-black uppercase tracking-[0.4em] text-white/30 font-bold font-black font-black font-black font-black font-black font-black font-black">
              <button onClick={() => setView('home')}>Inicio</button><button onClick={() => document.getElementById('agenda')?.scrollIntoView({behavior:'smooth'})}>Calendario</button><button onClick={() => setView('races')}>Carreras</button><button onClick={() => setView('clubs')}>Clubes</button><button onClick={() => setView('register')}>Soy Club</button>
           </nav>
           <div className="flex flex-col items-center gap-10 w-full pt-12 border-t border-white/5 font-black font-black font-black"><a href="https://instagram.com/runcityhub" target="_blank" className="hover:text-mustard cursor-pointer transition-all hover:scale-125 active:scale-90 font-black font-black font-black font-black"><Instagram size={40}/></a><p className="text-[10px] font-black text-white/10 tracking-[1.5em] uppercase italic font-bold font-black uppercase italic font-black font-black font-black font-black font-black">MÉXICO • 2026</p><button onClick={() => setView('admin-login')} className="opacity-10 hover:opacity-100 transition-opacity uppercase text-[8px] font-black border border-white/20 px-10 py-2.5 rounded-full tracking-[0.5em] font-bold font-black font-black font-black font-black">ADMIN ACCESS</button></div>
        </div>
      </footer>

      {/* MODAL DETALLE */}
      {selectedEvent && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 md:p-10 bg-petrol/95 backdrop-blur-3xl animate-in zoom-in duration-300 text-center overflow-y-auto font-black font-black font-black font-black">
          <div className="bg-white rounded-6xl w-full max-w-xl relative p-8 md:p-20 shadow-2xl border-t-[25px] border-mustard my-auto max-h-[90vh] overflow-y-auto no-scrollbar font-black text-petrol font-black font-black">
            <button onClick={() => setSelectedEvent(null)} className="absolute top-6 right-6 md:top-10 md:right-10 p-4 text-petrol bg-gray-50 rounded-full hover:bg-red-50 transition shadow-xl active:scale-90 font-black font-black font-black font-black font-black font-black"><X size={28}/></button>
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-[3rem] shadow-2xl border-[10px] border-white mx-auto object-cover mb-10 md:mb-16 flex items-center justify-center bg-palemint font-black text-5xl md:text-6xl text-petrol uppercase italic ring-1 ring-turquoise/20 font-black tracking-tighter leading-none font-black font-black font-black font-black font-black">{selectedEvent.club?.logoUrl ? <img src={selectedEvent.club.logoUrl} className="w-full h-full rounded-[2.5rem] object-cover font-black font-black font-black font-black" /> : selectedEvent.club?.name?.[0]}</div>
            <h2 className="text-3xl md:text-5xl font-black uppercase italic mb-10 md:mb-14 leading-none font-black tracking-tighter leading-none tracking-tighter font-black font-black font-black font-black font-black font-black font-black">{selectedEvent.club?.name}</h2>
            <div className="space-y-10 md:space-y-12 text-left max-w-sm mx-auto font-black font-black font-black font-black"><div className="flex gap-6 md:gap-8 items-center text-left font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black"><div className="p-4 md:p-5 bg-palemint rounded-[2.2rem] text-turquoise shadow-inner font-black font-black font-black font-black font-black font-black font-black"><Clock size={36}/></div><div><p className="text-[10px] md:text-[11px] font-black text-petrol uppercase tracking-widest font-black uppercase font-black font-black font-black font-black font-black font-black font-black font-black font-black">Salida</p><p className="text-xl md:text-3xl font-black text-petrol tracking-tight italic uppercase font-black font-black font-black font-black font-black font-black font-black">{selectedEvent.isRecurring ? selectedEvent.day : selectedEvent.specificDate}, {selectedEvent.time} hrs</p></div></div><div className="flex gap-6 md:gap-8 items-center text-left font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black"><div className="p-4 md:p-5 bg-palemint rounded-[2.2rem] text-turquoise shadow-inner font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black"><MapPin size={36}/></div><div><p className="text-[10px] md:text-[11px] font-black text-petrol uppercase tracking-widest font-black uppercase font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black">Ubicación</p><p className="text-xl md:text-3xl font-black text-petrol tracking-tight leading-tight italic font-black italic font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black">{selectedEvent.location}</p></div></div></div>
            <div className="mt-16 md:mt-24 grid grid-cols-2 gap-4 md:gap-8 font-black font-black font-black font-black font-black"><button onClick={() => setSelectedEvent(null)} className="py-5 md:py-7 rounded-[2.5rem] bg-gray-50 font-black text-[11px] md:text-[12px] uppercase text-gray-500 hover:bg-gray-100 transition tracking-widest font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black">Cerrar</button><button onClick={() => window.open(`https://maps.google.com/?q=${selectedEvent.location}`)} className="py-5 md:py-7 rounded-[2.5rem] bg-petrol text-mustard font-black text-[11px] md:text-[12px] uppercase shadow-2xl hover:bg-turquoise transition active:scale-95 tracking-widest font-black italic uppercase font-black font-black italic uppercase italic font-black italic uppercase italic font-black font-black font-black">Maps</button></div>
          </div>
        </div>
      )}

      {/* LOGIN MODAL */}
      {view === 'admin-login' && (
        <div className="fixed inset-0 z-[600] flex justify-center p-4 md:p-10 bg-petrol/98 backdrop-blur-3xl animate-in fade-in duration-500 overflow-y-auto font-black font-black font-black text-left">
           <div className="bg-white p-10 md:p-24 rounded-6xl shadow-2xl w-full max-w-2xl relative border-t-[30px] border-mustard my-auto font-black font-black font-black">
              <button onClick={() => setView('home')} className="absolute top-8 right-8 p-4 text-petrol bg-gray-50 rounded-full hover:bg-red-50 transition shadow-lg font-black font-black font-black font-black"><X size={28}/></button>
              <h2 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter mb-4 text-petrol leading-none tracking-tighter font-black italic tracking-tighter font-black font-black font-black font-black font-black font-black">CENTRAL <br/> <span className="text-turquoise font-black font-black font-black">ADMIN</span></h2>
              <form onSubmit={async (e) => {
                e.preventDefault();
                try { await signInWithEmailAndPassword(auth, e.target.email.value, e.target.pass.value); setView('admin-panel'); } catch(e) { alert("Acceso denegado."); }
              }} className="space-y-6 mt-12 font-black font-black font-black font-black font-black font-black"><div className="space-y-2 font-black font-black font-black font-black font-black font-black font-black font-black"><label className="text-[11px] font-black uppercase text-gray-400 font-black font-black font-black font-black">Email</label><input required name="email" type="email" placeholder="admin@cityrunhub.mx" className="w-full p-6 bg-gray-50 rounded-4xl font-black text-petrol outline-none border border-gray-100 shadow-inner font-black font-black font-black font-black font-black font-black" /></div><div className="space-y-2 font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black"><label className="text-[11px] font-black uppercase text-gray-400 font-black font-black font-black font-black font-black font-black font-black font-black">Contraseña</label><input required name="pass" type="password" placeholder="••••••••" className="w-full p-6 bg-gray-50 rounded-4xl font-black text-petrol outline-none border border-gray-100 shadow-inner font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black" /></div><button className="w-full bg-petrol text-mustard py-8 rounded-4xl font-black text-2xl uppercase italic shadow-2xl active:scale-95 transition-all mt-6 font-black italic font-black font-black font-black font-black font-black font-black font-black">Entrar</button></form>
           </div>
        </div>
      )}

      {view === 'admin-panel' && (
        <div className="fixed inset-0 z-[700] bg-white animate-in slide-in-from-bottom duration-700 overflow-y-auto text-left font-black font-black font-black font-black font-black">
          <AdminPanel user={user} onClose={() => setView('home')} />
        </div>
      )}
    </div>
  );
};

const App = () => {
  const [user, setUser] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);
  useEffect(() => {
    const initAuth = async () => {
      try { await signInAnonymously(auth); } catch (err) { console.error("Auth error", err); }
    };
    initAuth();
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsInitializing(false);
    });
  }, []);
  if (isInitializing) return <div className="h-screen flex items-center justify-center font-black text-petrol uppercase italic tracking-widest text-sm animate-pulse font-black uppercase italic font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black">Iniciando...</div>;
  return <PublicApp user={user} />;
};

export default App;