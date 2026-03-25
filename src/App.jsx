import React, { useState, useMemo, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, MapPin, Clock, Info, Users, PlusCircle, ChevronRight, 
  Instagram, ExternalLink, Filter, ArrowLeft, CheckCircle2, 
  AlertTriangle, Trophy, ChevronDown, Search, Bell, Loader2, X, Check, Trash2, Lock,
  Globe, CalendarDays, Zap, Settings, Map, Store, Menu as MenuIcon, ChevronLeft, Send, Briefcase, EyeOff, Play, Pause, Edit2
} from 'lucide-react';

// --- FIREBASE IMPORTS ---
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, doc, setDoc, deleteDoc, updateDoc, query, orderBy } from 'firebase/firestore';

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
  { name: "Revolución", city: "Pachuca" }, { name: "Parque Cultural Hidalguense", city: "Pachuca" }, { name: "Río de las Avenidas", city: "Pachuca" }
];

const RUN_TYPES = {
  SR: { label: "Social Run", color: "bg-palemint text-petrol border-turquoise", desc: "Suave / Recreativo" },
  LD: { label: "Long Distance", color: "bg-amber-50 text-amber-700 border-amber-200", desc: "Fondos y Distancia" },
  T: { label: "Técnica", color: "bg-emerald-50 text-emerald-700 border-emerald-100", desc: "Velocidad / Series" },
  TR: { label: "Trail Run", color: "bg-orange-50 text-orange-800 border-orange-200", desc: "Montaña / Desnivel" },
  EE: { label: "Evento Especial", color: "bg-blue-50 text-blue-700 border-blue-200", desc: "Pop-ups y Marcas" }
};

const dayNames = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

const getMonday = (d) => {
  d = new Date(d);
  const day = d.getDay(), diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
};

// ==========================================
// COMPONENTE: PANEL DE GESTIÓN (ADMIN)
// ==========================================
const AdminPanel = ({ user, onClose }) => {
  const [activeTab, setActiveTab] = useState('requests');
  const [pendingClubs, setPendingClubs] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [events, setEvents] = useState([]);
  const [races, setRaces] = useState([]);
  const [dbCities, setDbCities] = useState([]);
  const [dbZones, setDbZones] = useState([]);
  
  const [newClub, setNewClub] = useState({ name: '', social: '', email: '', type: 'club', city: 'CDMX' });
  const [newRace, setNewRace] = useState({ name: '', date: '', distance: '', zone: '', link: '', city: 'CDMX' });
  const [newCity, setNewCity] = useState('');
  const [newZone, setNewZone] = useState({ name: '', city: 'CDMX' });
  const [indieEvent, setIndieEvent] = useState({ organizerName: 'Run City Hub', day: 'Lunes', time: '07:00', city: 'CDMX', zone: '', type: 'SR', location: '', isRecurring: true });

  useEffect(() => {
    if (!user) return;
    const unsub = [
      onSnapshot(collection(db, 'artifacts', FIREBASE_APP_ID, 'public', 'data', 'clubs_pending'), s => setPendingClubs(s.docs.map(d => ({id:d.id, ...d.data()})))),
      onSnapshot(collection(db, 'artifacts', FIREBASE_APP_ID, 'public', 'data', 'clubs'), s => setClubs(s.docs.map(d => ({id:d.id, ...d.data()})))),
      onSnapshot(collection(db, 'artifacts', FIREBASE_APP_ID, 'public', 'data', 'events'), s => setEvents(s.docs.map(d => ({id:d.id, ...d.data()})))),
      onSnapshot(collection(db, 'artifacts', FIREBASE_APP_ID, 'public', 'data', 'races'), s => setRaces(s.docs.map(d => ({id:d.id, ...d.data()})))),
      onSnapshot(collection(db, 'artifacts', FIREBASE_APP_ID, 'public', 'data', 'cities'), s => setDbCities(s.docs.map(d => ({id:d.id, ...d.data()})))),
      onSnapshot(collection(db, 'artifacts', FIREBASE_APP_ID, 'public', 'data', 'zones'), s => setDbZones(s.docs.map(d => ({id:d.id, ...d.data()}))))
    ];
    return () => unsub.forEach(fn => fn());
  }, [user]);

  const allCities = useMemo(() => [...HARDCODED_CITIES, ...dbCities], [dbCities]);
  const allZones = useMemo(() => [...HARDCODED_ZONES, ...dbZones], [dbZones]);

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
    setNewRace({ name: '', date: '', distance: '', zone: '', link: '', city: 'CDMX' });
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
        <h2 className="text-2xl font-black uppercase italic tracking-tighter leading-none">CENTRO DE <span className="text-mustard">MANDOS</span></h2>
        <div className="flex flex-wrap justify-center gap-2">
          <button onClick={() => setActiveTab('requests')} className={`px-4 py-2 rounded-full text-[10px] uppercase ${activeTab === 'requests' ? 'bg-mustard text-petrol shadow-lg' : 'bg-white/10'}`}>Solicitudes ({pendingClubs.length})</button>
          <button onClick={() => setActiveTab('events_manage')} className={`px-4 py-2 rounded-full text-[10px] uppercase ${activeTab === 'events_manage' ? 'bg-mustard text-petrol shadow-lg' : 'bg-white/10'}`}>Sesiones</button>
          <button onClick={() => setActiveTab('clubs_manage')} className={`px-4 py-2 rounded-full text-[10px] uppercase ${activeTab === 'clubs_manage' ? 'bg-mustard text-petrol shadow-lg' : 'bg-white/10'}`}>Clubes</button>
          <button onClick={() => setActiveTab('races_manage')} className={`px-4 py-2 rounded-full text-[10px] uppercase ${activeTab === 'races_manage' ? 'bg-mustard text-petrol shadow-lg' : 'bg-white/10'}`}>Carreras</button>
          <button onClick={() => setActiveTab('config')} className={`px-4 py-2 rounded-full text-[10px] uppercase ${activeTab === 'config' ? 'bg-mustard text-petrol shadow-lg' : 'bg-white/10'}`}>Zonas/Ciudades</button>
          <button onClick={onClose} className="px-6 py-2 bg-red-500 text-white rounded-full font-black text-[10px] uppercase">Cerrar</button>
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
            {pendingClubs.length === 0 && <p className="text-center py-20 text-gray-300 italic uppercase">Sin pendientes</p>}
          </div>
        )}

        {/* TAB: SESIONES */}
        {activeTab === 'events_manage' && (
          <div className="grid md:grid-cols-12 gap-12 text-left font-black">
            <div className="md:col-span-8 space-y-6">
              <h3 className="text-2xl font-black uppercase italic border-b-4 border-mustard pb-2 inline-block">Gestión de Sesiones</h3>
              <div className="grid gap-4 max-h-[70vh] overflow-y-auto no-scrollbar">
                {events.map(ev => (
                  <div key={ev.id} className={`bg-white p-6 rounded-[2.5rem] shadow-sm flex justify-between items-center border border-gray-100 ${ev.status === 'paused' ? 'opacity-50 grayscale bg-gray-50' : ''}`}>
                    <div className="flex items-center gap-5">
                      <div className="p-4 bg-gray-50 rounded-2xl text-petrol">{ev.isRecurring ? <CalendarDays size={20}/> : <Zap size={20}/>}</div>
                      <div>
                        <h4 className="font-black text-lg uppercase italic leading-none">{ev.organizerName}</h4>
                        <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">{ev.day || ev.specificDate} • {ev.time} hrs • {ev.zone} ({ev.city})</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleToggleEvent(ev)} className={`p-3 rounded-2xl ${ev.status === 'paused' ? 'bg-emerald-50 text-emerald-500' : 'bg-amber-50 text-amber-500'}`}>{ev.status === 'paused' ? <Play size={20}/> : <Pause size={20}/>}</button>
                      <button onClick={async () => { if(confirm("¿Eliminar?")) await deleteDoc(doc(db, 'artifacts', FIREBASE_APP_ID, 'public', 'data', 'events', ev.id)) }} className="p-3 bg-red-50 text-red-300 rounded-2xl"><Trash2 size={20}/></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="md:col-span-4">
               <div className="bg-white p-10 rounded-6xl shadow-xl border border-gray-100 sticky top-32">
                 <h3 className="text-xl font-black mb-6 uppercase italic text-petrol flex items-center gap-3"><Zap className="text-turquoise"/> Evento Indie</h3>
                 <form onSubmit={async (e) => {
                   e.preventDefault();
                   await addDoc(collection(db, 'artifacts', FIREBASE_APP_ID, 'public', 'data', 'events'), { ...indieEvent, status: 'active' });
                   alert("Sesión publicada.");
                   setIndieEvent({ organizerName: 'Run City Hub', day: 'Lunes', time: '07:00', city: 'CDMX', zone: '', type: 'SR', location: '', isRecurring: true });
                 }} className="space-y-4 font-black">
                   <input required placeholder="Organizador" className="w-full p-4 bg-gray-50 rounded-2xl font-black outline-none" value={indieEvent.organizerName} onChange={e => setIndieEvent({...indieEvent, organizerName: e.target.value})} />
                   <div className="grid grid-cols-2 gap-2">
                     <select className="p-4 bg-gray-50 rounded-2xl font-black outline-none text-xs" value={indieEvent.day} onChange={e => setIndieEvent({...indieEvent, day: e.target.value})}>{dayNames.map(d => <option key={d}>{d}</option>)}</select>
                     <input type="time" className="p-4 bg-gray-50 rounded-2xl font-black outline-none" value={indieEvent.time} onChange={e => setIndieEvent({...indieEvent, time: e.target.value})} />
                   </div>
                   
                   <div className="grid grid-cols-2 gap-2">
                     <select className="w-full p-4 bg-gray-50 rounded-2xl font-black outline-none text-xs" value={indieEvent.city} onChange={e => setIndieEvent({...indieEvent, city: e.target.value, zone: ''})}>
                        {allCities.map(c => <option key={c.id || c.name} value={c.name}>{c.name}</option>)}
                     </select>
                     <select className="w-full p-4 bg-gray-50 rounded-2xl font-black outline-none text-xs" value={indieEvent.zone} onChange={e => setIndieEvent({...indieEvent, zone: e.target.value})}>
                        <option value="">Zona...</option>
                        {allZones.filter(z => z.city === indieEvent.city).map(z => <option key={z.id || z.name} value={z.name}>{z.name}</option>)}
                     </select>
                   </div>
                   
                   <input required placeholder="Ubicación" className="w-full p-4 bg-gray-50 rounded-2xl font-black outline-none shadow-inner" value={indieEvent.location} onChange={e => setIndieEvent({...indieEvent, location: e.target.value})} />
                   <button className="w-full bg-turquoise text-white py-5 rounded-4xl font-black text-xs uppercase italic">Publicar</button>
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
                      <div className="w-12 h-12 bg-gray-50 rounded-full overflow-hidden border border-gray-100"><img src={c.logoUrl || "https://via.placeholder.com/50"} className="w-full h-full object-cover" /></div>
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
                      <button onClick={async () => { if(confirm("¿Eliminar?")) await deleteDoc(doc(db, 'artifacts', FIREBASE_APP_ID, 'public', 'data', 'clubs', c.id)) }} className="p-3 bg-red-50 text-red-300 rounded-xl"><Trash2 size={16}/></button>
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
                  <input required type="date" className="w-full p-6 bg-gray-50 rounded-3xl font-black outline-none border-none shadow-inner" value={newRace.date} onChange={e => setNewRace({...newRace, date: e.target.value})} />
                  <input required placeholder="Distancia" className="w-full p-6 bg-gray-50 rounded-3xl font-black outline-none border-none shadow-inner" value={newRace.distance} onChange={e => setNewRace({...newRace, distance: e.target.value})} />
                </div>
                
                <div className="grid grid-cols-2 gap-4 font-black">
                  <select required className="w-full p-6 bg-gray-50 rounded-3xl font-black outline-none border-none text-xs" value={newRace.city} onChange={e => setNewRace({...newRace, city: e.target.value, zone: ''})}>
                    {allCities.map(c => <option key={c.id || c.name} value={c.name}>{c.name}</option>)}
                  </select>
                  <select required className="w-full p-6 bg-gray-50 rounded-3xl font-black outline-none border-none text-xs" value={newRace.zone} onChange={e => setNewRace({...newRace, zone: e.target.value})}>
                    <option value="">Zona...</option>
                    {allZones.filter(z => z.city === newRace.city).map(z => <option key={z.id || z.name} value={z.name}>{z.name}</option>)}
                  </select>
                </div>

                <input required placeholder="URL Inscripción" className="w-full p-6 bg-gray-50 rounded-3xl font-black outline-none border-none shadow-inner" value={newRace.link} onChange={e => setNewRace({...newRace, link: e.target.value})} />
                <button className="w-full bg-petrol text-mustard py-6 rounded-6xl font-black text-xl uppercase shadow-2xl font-black italic">Publicar</button>
              </form>
            </div>
            <div className="space-y-4 max-h-[600px] overflow-y-auto no-scrollbar font-black text-left">
              <h3 className="text-xl font-black uppercase italic text-petrol mb-4">Metas Registradas</h3>
              {races.sort((a,b) => new Date(a.date) - new Date(b.date)).map(r => (
                <div key={r.id} className="bg-white p-6 rounded-4xl border border-gray-100 flex justify-between items-center shadow-sm">
                  <div><h4 className="font-black text-lg text-petrol uppercase leading-none">{r.name}</h4><p className="text-gray-400 text-[10px] font-bold uppercase mt-1">{r.date} • {r.city} • {r.distance}</p></div>
                  <button onClick={async () => await deleteDoc(doc(db, 'artifacts', FIREBASE_APP_ID, 'public', 'data', 'races', r.id))} className="p-4 text-red-200 bg-red-50 rounded-2xl"><Trash2 size={18}/></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB: CONFIGURACIÓN */}
        {activeTab === 'config' && (
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
              <div className="space-y-3 font-black">
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

  // Registro Público
  const [regType, setRegType] = useState('club');

  // Sistema de Rutas Ocultas (Admin)
  useEffect(() => {
    const handleHash = () => {
      if (window.location.hash === '#admin') setView('admin-login');
    };
    window.addEventListener('hashchange', handleHash);
    handleHash(); // Revisar al inicio
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
  
  // Zonas dinámicas según la ciudad seleccionada
  const currentCityZones = useMemo(() => allZones.filter(z => z.city === selectedCity).map(z => z.name), [allZones, selectedCity]);

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
      return new Date(e.specificDate).toDateString() === dateObj.toDateString();
    });
  };

  const sortedRaces = useMemo(() => races
    .filter(r => (selectedCity === 'Todas' || r.city === selectedCity))
    .sort((a, b) => new Date(a.date) - new Date(b.date)), [races, selectedCity]);

  if (loading) return <div className="h-screen flex items-center justify-center font-black text-petrol uppercase tracking-[0.5em] animate-pulse italic">Cargando Hub...</div>;

  return (
    <div className="min-h-screen bg-white text-petrol font-sans flex flex-col transition-all text-center font-black overflow-x-hidden">
      
      <header className="bg-white/95 backdrop-blur-xl border-b border-gray-100 sticky top-0 z-[100] px-6 py-5 shadow-sm font-black font-black">
        <div className="max-w-7xl mx-auto flex items-center justify-between font-black">
          <div className="flex items-center cursor-pointer group font-black" onClick={() => { window.location.hash=''; setView('home'); }}>
             <div className="w-11 h-11 md:w-14 md:h-14 bg-white rounded-2xl flex items-center justify-center mr-4 shadow-xl overflow-hidden border border-gray-100 logo-shadow group-hover:rotate-12 transition-transform font-black">
               <img src="/cityrunhublogo.png" className="w-full h-full object-contain p-1.5 font-black" alt="Logo" />
             </div>
             <div className="text-xl md:text-3xl font-black tracking-tighter uppercase italic leading-none text-left tracking-tighter font-black">RUN CITY <span className="text-turquoise font-black italic">HUB</span></div>
          </div>

          <nav className="hidden lg:flex items-center gap-10 text-[11px] font-black uppercase tracking-[0.3em] text-gray-400 font-black">
            <button onClick={() => { window.location.hash=''; setView('home'); }} className={view==='home'?'text-petrol':''}>Inicio</button>
            <button onClick={() => { window.location.hash=''; setView('home'); setTimeout(() => document.getElementById('agenda')?.scrollIntoView({behavior:'smooth'}), 100); }}>Calendario</button>
            <button onClick={() => { window.location.hash=''; setView('races'); }} className={view==='races'?'text-petrol':''}>Carreras 2026</button>
            <button onClick={() => { window.location.hash=''; setView('clubs'); }} className={view==='clubs'?'text-petrol':''}>Clubes</button>
            <button onClick={() => { window.location.hash=''; setView('register'); }} className={view==='register'?'text-petrol':''}>Registro Club</button>
            <div className="relative flex items-center bg-gray-50 rounded-xl px-4 py-2 font-black text-petrol border border-gray-100 shadow-inner group font-black">
              <select className="bg-transparent outline-none appearance-none pr-8 cursor-pointer uppercase text-[10px] tracking-widest font-black" value={selectedCity} onChange={e => { setSelectedCity(e.target.value); setSelectedZone('Todos'); }}>
                {allCities.map(c => <option key={c.id || c.name} value={c.name}>{c.name}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-petrol font-black" size={14} />
            </div>
            <button onClick={() => { window.location.hash=''; setView('register'); }} className="bg-petrol text-mustard px-10 py-3.5 rounded-full shadow-2xl hover:bg-turquoise hover:text-white transition-all font-black uppercase italic tracking-widest text-[12px] active:scale-95 font-black">Unirse</button>
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
                 {[{t: 'MAÑANA', times: ["06:00", "07:00", "08:00", "08:30"], color: 'bg-petrol'}, {t: 'TARDE', times: ["18:00", "19:00", "20:00", "20:30"], color: 'bg-turquoise'}].map(sec => (
                   <div key={sec.t} className="bg-white rounded-[5rem] shadow-[0_40px_80px_-20px_rgba(27,67,83,0.08)] overflow-hidden border border-gray-100 text-left font-black font-black">
                      <div className={`${sec.color} p-12 text-white flex justify-between items-center font-black font-black`}><h3 className="text-4xl font-black uppercase italic leading-none tracking-tighter font-black font-black font-black">{sec.t}</h3><span className="bg-white/10 px-8 py-3 rounded-full font-black text-[11px] uppercase tracking-[0.4em] backdrop-blur-md font-black font-black">{selectedCity}</span></div>
                      <div className="overflow-x-auto no-scrollbar font-black font-black">
                        <table className="w-full min-w-[1200px] border-collapse font-black font-black">
                           <thead><tr className="bg-gray-50/50 text-[10px] font-black text-gray-300 uppercase border-b border-gray-100 font-black tracking-widest font-black font-black"><th className="p-12 text-left w-48 opacity-40 font-black font-black">Horario</th>{dayNames.map((d, i) => <th key={d} className="p-10 text-center font-black font-black uppercase font-black font-black">{d} <br/><span className="text-turquoise text-[10px] font-black font-black">{weekDates[i].getDate()} {weekDates[i].toLocaleString('es-MX', {month:'short'})}</span></th>)}</tr></thead>
                           <tbody>
                              {sec.times.map(t => (
                                <tr key={t} className="group font-black font-black font-black"><td className="p-12 text-sm font-black text-gray-300 border-b border-gray-50 font-black group-hover:text-petrol transition-colors font-black">{t}</td>{dayNames.map((d, i) => {
                                  const ev = getEventForSlot(d, t, weekDates[i]);
                                  const cl = ev?.clubId ? clubs.find(c => c.id === ev.clubId) : null;
                                  return <td key={d+t} className="p-2 border-b border-gray-50 h-52 align-top font-black font-black font-black">{ev && (
                                      <div onClick={() => setSelectedEvent({...ev, club: cl || {name: ev.organizerName}})} className={`p-7 rounded-[3rem] border-l-[14px] cursor-pointer hover:shadow-2xl hover:-translate-y-2 transition-all h-full flex flex-col justify-between text-left shadow-sm ${RUN_TYPES[ev.type]?.color || 'bg-gray-50'} font-black font-black`}><span className="text-[9px] font-black uppercase opacity-40 font-black font-black font-black font-black font-black">{RUN_TYPES[ev.type]?.label}</span><div className="text-lg font-black leading-tight uppercase italic line-clamp-2 text-petrol font-black font-black font-black font-black font-black font-black">{cl ? cl.name : ev.organizerName}</div><div className="space-y-1.5 mt-4 font-black font-black"><div className="text-[10px] font-bold text-turquoise flex items-center gap-2 uppercase font-black font-black font-black font-black font-black"><Zap size={12}/> {ev.distance || 'Social Run'}</div><div className="text-[10px] font-bold text-gray-400 flex items-center gap-2 uppercase font-black font-black font-black font-black font-black font-black"><MapPin size={12}/> {ev.zone}</div></div></div>
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
           <h2 className="text-6xl md:text-8xl font-black uppercase italic tracking-tighter text-petrol mb-24 font-black leading-none font-black font-black font-black font-black font-black">DIRECTORIO <br/><span className="text-turquoise italic font-black font-black font-black font-black font-black font-black font-black font-black font-black">DE CLUBES.</span></h2>
           <div className="grid md:grid-cols-3 gap-12 font-black font-black font-black font-black font-black">
             {clubs.filter(c => c.type === 'club' && c.city === selectedCity).length === 0 ? (
                <div className="col-span-full py-20 text-center">
                  <p className="text-gray-400 font-black uppercase italic tracking-widest">Aún no hay clubes registrados en {selectedCity}.</p>
                </div>
             ) : (
               clubs.filter(c => c.type === 'club' && c.city === selectedCity).map(club => (
                 <div key={club.id} className="bg-white p-12 rounded-[5rem] border border-gray-100 shadow-sm hover:shadow-2xl transition-all flex flex-col items-center font-black animate-in zoom-in h-full font-black font-black">
                   <img src={club.logoUrl || "https://via.placeholder.com/200"} className="w-36 h-36 rounded-full border-[10px] border-white shadow-2xl object-cover mb-10 font-black font-black font-black font-black font-black font-black" />
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
             const clubData = { name: f.get('name'), social: f.get('social'), email: f.get('email'), city: selectedCity, type: regType, status: 'pending', createdAt: new Date().toISOString() };
             const clubRef = await addDoc(collection(db, 'artifacts', FIREBASE_APP_ID, 'public', 'data', 'clubs_pending'), clubData);
             
             if(regType === 'business') {
                await addDoc(collection(db, 'artifacts', FIREBASE_APP_ID, 'public', 'data', 'events_pending'), { 
                    clubId: clubRef.id, organizerName: f.get('name'), day: f.get('day'), time: f.get('time'), zone: f.get('zone'), 
                    type: 'EE', city: selectedCity, location: f.get('loc'), isRecurring: true, status: 'pending'
                });
             }
             alert("Solicitud enviada."); window.location.hash=''; setView('home');
           }} className="bg-gray-50 p-16 rounded-6xl border border-gray-100 shadow-2xl space-y-12 font-black">
              <div className="flex bg-white p-2.5 rounded-4xl shadow-inner border border-gray-50 font-black">
                 <button type="button" onClick={() => setRegType('club')} className={`flex-1 py-5 rounded-[1.8rem] font-black uppercase text-[11px] ${regType==='club'?'bg-petrol text-mustard shadow-2xl scale-105 font-black font-black':'text-gray-300 font-black font-black font-black'}`}>Running Club</button>
                 <button type="button" onClick={() => setRegType('business')} className={`flex-1 py-5 rounded-[1.8rem] font-black uppercase text-[11px] ${regType==='business'?'bg-petrol text-mustard shadow-2xl scale-105 font-black font-black':'text-gray-300 font-black font-black'}`}>Marca / Negocio</button>
              </div>
              <div className="grid md:grid-cols-2 gap-10 font-black text-left font-black font-black">
                <div className="space-y-3 font-black font-black"><label className="text-[11px] font-black uppercase text-gray-400 font-bold font-black font-black">Nombre Oficial</label><input required name="name" className="w-full p-8 rounded-4xl border-none font-black bg-white shadow-sm outline-none text-petrol font-black font-black" /></div>
                <div className="space-y-3 font-black font-black"><label className="text-[11px] font-black uppercase text-gray-400 font-bold font-black font-black">Instagram (@)</label><input required name="social" placeholder="usuario" className="w-full p-8 rounded-4xl border-none font-black bg-white shadow-sm outline-none text-petrol font-black font-black" /></div>
              </div>
              {regType === 'business' && (
                <div className="p-10 bg-white rounded-5xl border border-mustard/20 space-y-8 animate-in zoom-in duration-300 font-black font-black">
                    <h4 className="text-xl uppercase italic text-petrol border-b border-gray-50 pb-4 font-black font-black">Primer Evento en {selectedCity}</h4>
                    <div className="grid grid-cols-2 gap-4 font-black">
                        <select name="day" className="p-6 bg-gray-50 rounded-3xl font-black font-black font-black">{dayNames.map(d=><option key={d}>{d}</option>)}</select>
                        <input type="time" name="time" className="p-6 bg-gray-50 rounded-3xl font-black font-black font-black" defaultValue="07:00" />
                    </div>
                    <select name="zone" className="w-full p-6 bg-gray-50 rounded-3xl font-black font-black font-black font-black font-black">
                       {currentCityZones.length > 0 ? currentCityZones.map(z=><option key={z} value={z}>{z}</option>) : <option value="Global">Global</option>}
                    </select>
                    <input name="loc" placeholder="Lugar exacto (Ej. Parque México)" className="w-full p-6 bg-gray-50 rounded-3xl font-black font-black font-black" />
                </div>
              )}
              <input required name="email" type="email" placeholder="Email de contacto" className="w-full p-8 rounded-4xl border-none font-black bg-white shadow-sm outline-none text-petrol font-black font-black font-black" />
              <button className="w-full bg-petrol text-mustard py-10 rounded-6xl font-black text-2xl uppercase italic shadow-2xl hover:bg-turquoise hover:text-white transition-all transform active:scale-95 flex items-center justify-center gap-5 font-black uppercase italic font-black font-black">Enviar Solicitud <Send size={28}/></button>
           </form>
        </main>
      )}

      {/* Ficha de Evento (Modal) */}
      {selectedEvent && (
        <div className="fixed inset-0 z-[500] bg-petrol/90 backdrop-blur-sm flex items-center justify-center p-4">
           <div className="bg-white p-8 rounded-[3rem] max-w-sm w-full relative text-left shadow-2xl animate-in zoom-in duration-300">
              <button onClick={() => setSelectedEvent(null)} className="absolute top-6 right-6 bg-gray-100 p-3 text-petrol hover:bg-red-50 hover:text-red-500 rounded-full transition-colors"><X size={20}/></button>
              
              <div className="text-[10px] uppercase font-black tracking-[0.3em] text-turquoise mb-2">{RUN_TYPES[selectedEvent.type]?.label || 'Evento'}</div>
              <h3 className="text-3xl font-black italic uppercase text-petrol mb-1 leading-none tracking-tighter">{selectedEvent.club?.name || selectedEvent.organizerName}</h3>
              <p className="text-xs font-bold text-gray-400 mb-8 uppercase tracking-widest">{selectedEvent.distance || 'Social Run'}</p>
              
              <div className="space-y-4 mb-8 bg-gray-50 p-6 rounded-4xl border border-gray-100">
                 <div className="flex items-center gap-3"><CalendarDays size={18} className="text-mustard"/><span className="text-xs font-black uppercase text-petrol">{selectedEvent.day || selectedEvent.specificDate} • {selectedEvent.time} hrs</span></div>
                 <div className="flex items-center gap-3"><MapPin size={18} className="text-mustard"/><span className="text-xs font-black uppercase text-petrol">{selectedEvent.zone} ({selectedEvent.city || 'CDMX'})</span></div>
                 <div className="flex items-center gap-3"><Map size={18} className="text-mustard"/><span className="text-xs font-bold text-petrol">{selectedEvent.location || 'Punto de encuentro por definir'}</span></div>
              </div>
              
              <button 
                onClick={() => window.open(`https://maps.google.com/?q=$${encodeURIComponent(selectedEvent.location || selectedEvent.zone)}`, '_blank')} 
                className="w-full bg-petrol text-mustard py-5 rounded-full font-black uppercase tracking-widest text-[11px] flex justify-center items-center gap-3 hover:bg-turquoise hover:text-white transition-colors shadow-xl active:scale-95"
              >
                <MapPin size={16}/> Abrir en Maps
              </button>
           </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="bg-petrol text-white py-24 mt-auto rounded-t-6xl relative overflow-hidden px-8 text-center font-black shadow-[0_-50px_100px_-20px_rgba(27,67,83,0.1)] font-black font-black">
        <div className="absolute inset-0 bg-white/5 opacity-5 pointer-events-none font-black"></div>
        <div className="max-w-7xl mx-auto flex flex-col items-center gap-10 relative z-10 text-center font-black font-black font-black font-black font-black font-black">
           <div className="text-5xl md:text-8xl font-black italic tracking-tighter text-mustard/20 uppercase leading-none select-none tracking-tighter font-black font-black font-black font-black font-black">RUN CITY HUB</div>
           <nav className="flex flex-wrap justify-center gap-8 md:gap-14 text-base font-black uppercase tracking-[0.4em] text-white/60 font-bold font-black font-black font-black font-black font-black">
              <button onClick={() => { window.location.hash=''; setView('home'); }} className="hover:text-mustard transition-colors font-black">Inicio</button>
              <button onClick={() => { window.location.hash=''; setView('home'); setTimeout(() => document.getElementById('agenda')?.scrollIntoView({behavior:'smooth'}), 100); }} className="hover:text-mustard transition-colors font-black font-black font-black">Calendario</button>
              <button onClick={() => { window.location.hash=''; setView('races'); }} className="hover:text-mustard transition-colors font-black font-black">Carreras</button>
              <button onClick={() => { window.location.hash=''; setView('clubs'); }} className="hover:text-mustard transition-colors font-black font-black">Clubes</button>
              <button onClick={() => { window.location.hash=''; setView('register'); }} className="hover:text-mustard transition-colors font-black font-black">Registro Club</button>
           </nav>
           <div className="flex flex-col items-center gap-8 w-full pt-10 border-t border-white/5 font-black font-black font-black font-black font-black font-black font-black font-black">
              <div className="flex gap-14 text-white/30 font-black font-black font-black font-black font-black">
                 <a href="https://instagram.com/runcityhub" target="_blank" className="hover:text-mustard transition-all hover:scale-125 active:scale-90 font-black font-black font-black font-black font-black font-black"><Instagram size={48}/></a>
              </div>
              <p className="text-[10px] font-black text-white/20 tracking-[1.5em] uppercase italic font-bold font-black">MÉXICO • 2026</p>
           </div>
        </div>
      </footer>

      {/* LOGIN ADMIN (AHORA SE ACTIVA VIA URL HASH #admin) */}
      {view === 'admin-login' && (
        <div className="fixed inset-0 z-[600] flex justify-center p-4 md:p-10 bg-petrol/98 backdrop-blur-3xl animate-in fade-in duration-500 overflow-y-auto font-black text-left font-black font-black">
           <div className="bg-white p-10 md:p-14 rounded-6xl shadow-2xl w-full max-w-md relative border-t-[30px] border-mustard my-auto font-black font-black font-black font-black">
              <button onClick={() => { window.location.hash=''; setView('home'); }} className="absolute top-6 right-6 p-4 text-petrol bg-gray-50 rounded-full hover:bg-red-50 transition shadow-lg active:scale-90 font-black font-black font-black font-black font-black"><X size={24}/></button>
              <h2 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter mb-4 text-petrol leading-none font-black italic tracking-tighter font-black font-black font-black font-black font-black">CENTRAL <br/> <span className="text-turquoise font-black font-black font-black font-black font-black font-black">ADMIN</span></h2>
              <form onSubmit={async (e) => {
                e.preventDefault();
                try { await signInWithEmailAndPassword(auth, e.target.email.value, e.target.pass.value); setView('admin-panel'); } catch(e) { alert("Acceso denegado."); }
              }} className="space-y-6 mt-10 font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black">
                 <div className="space-y-2 font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black"><label className="text-[11px] font-black uppercase text-gray-400 font-black font-black font-black font-black font-black">Email</label><input required name="email" type="email" placeholder="admin@cityrunhub.mx" className="w-full p-6 bg-gray-50 rounded-4xl font-black text-petrol outline-none border border-gray-100 shadow-inner font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black" /></div>
                 <div className="space-y-2 font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black"><label className="text-[11px] font-black uppercase text-gray-400 font-black font-black font-black font-black font-black">Contraseña</label><input required name="pass" type="password" placeholder="••••••••" className="w-full p-6 bg-gray-50 rounded-4xl font-black text-petrol outline-none border border-gray-100 shadow-inner font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black" /></div>
                 <button className="w-full bg-petrol text-mustard py-8 rounded-4xl font-black text-2xl uppercase italic shadow-2xl active:scale-95 transition-all mt-6 font-black italic font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black">Entrar</button>
              </form>
           </div>
        </div>
      )}

      {view === 'admin-panel' && (
        <div className="fixed inset-0 z-[700] bg-white animate-in slide-in-from-bottom duration-700 overflow-y-auto text-left font-black font-black font-black font-black font-black font-black">
          <AdminPanel user={user} onClose={() => { window.location.hash=''; setView('home'); }} />
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
      try { await signInAnonymously(auth); } catch (err) { console.error("A1", err); }
    };
    initAuth();
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsInitializing(false);
    });
  }, []);
  if (isInitializing) return <div className="h-screen flex items-center justify-center font-black text-petrol uppercase italic tracking-widest text-sm animate-pulse font-black font-black font-black font-black font-black font-black font-black font-black font-black">Iniciando...</div>;
  return <PublicApp user={user} />;
};

export default App;