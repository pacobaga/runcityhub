import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  onAuthStateChanged, 
  signInWithCustomToken, 
  signInAnonymously 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  onSnapshot, 
  doc, 
  updateDoc, 
  deleteDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { 
  LayoutDashboard, 
  CheckSquare, 
  Users, 
  Settings, 
  Bell, 
  Search, 
  Plus, 
  Trash2, 
  MoreHorizontal,
  TrendingUp,
  Clock,
  Shield,
  LogOut,
  MapPin,
  MessageSquare,
  Instagram,
  Send,
  User as UserIcon,
  Activity,
  Zap,
  Globe,
  Lock,
  ChevronRight
} from 'lucide-react';

// --- CONFIGURACIÓN E INICIALIZACIÓN ---
// Manejo seguro de variables globales
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'run-city-hub-v68';

// --- COMPONENTES DE UI ---

const Badge = ({ children, color = "bg-blue-100 text-blue-600" }) => (
  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter ${color}`}>
    {children}
  </span>
);

const StatCard = ({ title, value, subtext, icon: Icon, color, trend }) => (
  <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 hover:shadow-md transition-all group">
    <div className="flex justify-between items-start mb-4">
      <div className={`p-3 rounded-2xl ${color} shadow-lg group-hover:scale-110 transition-transform`}>
        <Icon size={20} className="text-white" />
      </div>
      {trend && (
        <span className={`text-xs font-bold ${trend > 0 ? 'text-green-500' : 'text-red-500'}`}>
          {trend > 0 ? '+' : ''}{trend}%
        </span>
      )}
    </div>
    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{title}</p>
    <p className="text-3xl font-black text-slate-800 mt-1">{value}</p>
    <p className="text-[10px] text-slate-400 mt-1 font-medium">{subtext}</p>
  </div>
);

// --- APLICACIÓN PRINCIPAL ---

export default function RunCityHub() {
  // Estados de Base
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Datos de Firestore
  const [tasks, setTasks] = useState([]);
  const [messages, setMessages] = useState([]);
  const [notifications, setNotifications] = useState([]);
  
  // Estados de UI y Formulario
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [newTaskInput, setNewTaskInput] = useState('');
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef(null);

  // --- EFECTOS: FIREBASE (Regla 3) ---

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) { 
        console.error("Auth Fail:", err); 
        setLoading(false);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Solo procedemos si el usuario está autenticado (Regla 3)
    if (!user) return;

    // Suscripción a Tareas (Regla 1 y 2: Sin query compleja)
    const tasksCol = collection(db, 'artifacts', appId, 'public', 'data', 'tasks');
    const unsubTasks = onSnapshot(tasksCol, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Ordenación en memoria (Regla 2)
      setTasks(list.sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
    }, (err) => console.error("Tasks Error:", err));

    // Suscripción a Mensajes (Regla 1 y 2)
    const msgCol = collection(db, 'artifacts', appId, 'public', 'data', 'messages');
    const unsubMsg = onSnapshot(msgCol, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Ordenación y recorte en memoria (Regla 2)
      setMessages(list.sort((a,b) => (a.timestamp?.seconds || 0) - (b.timestamp?.seconds || 0)).slice(-50));
    }, (err) => console.error("Messages Error:", err));

    // Suscripción a Logs de Actividad (Regla 1 y 2: Eliminado limit() de Firestore)
    const logsCol = collection(db, 'artifacts', appId, 'public', 'data', 'logs');
    const unsubLogs = onSnapshot(logsCol, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Ordenación y recorte manual para cumplir la Regla 2
      const sortedLogs = list.sort((a,b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
      setNotifications(sortedLogs.slice(0, 8));
    }, (err) => console.error("Logs Error:", err));

    return () => { unsubTasks(); unsubMsg(); unsubLogs(); };
  }, [user]);

  // Autoscroll para el chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // --- LÓGICA DE NEGOCIO ---

  const logActivity = async (message) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'logs'), {
        message,
        user: user.uid,
        userName: user.displayName || `Admin_${user.uid.slice(0,4)}`,
        timestamp: serverTimestamp()
      });
    } catch (e) { console.error(e); }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !user) return;
    
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'messages'), {
        text: chatInput,
        senderId: user.uid,
        senderName: user.displayName || `Admin_${user.uid.slice(0,4)}`,
        timestamp: serverTimestamp()
      });
      setChatInput('');
    } catch (e) { console.error(e); }
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTaskInput.trim() || !user) return;
    
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'tasks'), {
        text: newTaskInput,
        completed: false,
        priority: 'normal',
        owner: user.uid,
        createdAt: serverTimestamp()
      });
      logActivity(`Nueva orden de ciudad: ${newTaskInput}`);
      setNewTaskInput('');
    } catch (e) { console.error(e); }
  };

  const toggleTask = async (id, status) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tasks', id), {
        completed: !status
      });
      logActivity(`Tarea ${!status ? 'completada' : 'reabierta'}`);
    } catch (e) { console.error(e); }
  };

  const deleteTask = async (id) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tasks', id));
      logActivity(`Tarea eliminada del sistema`);
    } catch (e) { console.error(e); }
  };

  // --- VISTAS DEL HUB ---

  const DashboardView = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Operaciones" value={tasks.length} subtext="Total de órdenes" icon={Zap} color="bg-amber-500" trend={12} />
        <StatCard title="Ciudadanos" value="2.4k" subtext="+15 hoy" icon={Users} color="bg-indigo-500" trend={5} />
        <StatCard title="Uptime" value="99.9%" subtext="Sistema estable" icon={Activity} color="bg-emerald-500" />
        <StatCard title="Alertas" value={notifications.length} subtext="Actividad reciente" icon={Bell} color="bg-rose-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-black flex items-center gap-2">
              <Clock className="text-blue-600" size={24} /> Log de Ciudad
            </h3>
          </div>
          <div className="space-y-6">
            {notifications.length === 0 ? (
              <div className="py-10 text-center text-slate-300 italic">No hay actividad registrada.</div>
            ) : (
              notifications.map((n, i) => (
                <div key={n.id} className="flex gap-4 group">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 rounded-full bg-blue-500 ring-4 ring-blue-50 transition-all group-hover:scale-125"></div>
                    {i !== notifications.length - 1 && <div className="w-0.5 flex-1 bg-slate-100 my-1"></div>}
                  </div>
                  <div className="pb-6">
                    <p className="text-sm font-bold text-slate-700">{n.message}</p>
                    <p className="text-[10px] text-slate-400 font-medium uppercase mt-1">
                      {n.userName} • {n.timestamp?.seconds ? new Date(n.timestamp.seconds * 1000).toLocaleTimeString() : 'Ahora'}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2.5rem] p-8 text-white shadow-xl">
            <h3 className="text-lg font-black mb-2 flex items-center gap-2">
              <Globe size={20} className="text-blue-400" /> Redes Sociales
            </h3>
            <p className="text-slate-400 text-xs mb-6">Gestiona Run City Hub en plataformas externas.</p>
            <div className="space-y-3">
              <a href="https://instagram.com" target="_blank" rel="noreferrer" className="flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-2xl transition-all group">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 rounded-lg"><Instagram size={18} /></div>
                  <span className="text-sm font-bold">Instagram</span>
                </div>
                <ChevronRight size={16} className="text-slate-500 group-hover:translate-x-1 transition-transform" />
              </a>
            </div>
          </div>
          <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Administrador</h3>
            <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-2xl">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center font-black text-white text-xl">
                {user?.uid?.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-black italic truncate max-w-[120px]">ID: {user?.uid?.slice(0,8)}</p>
                <Badge>Nivel 10</Badge>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const MessagesView = () => (
    <div className="max-w-4xl mx-auto h-[70vh] flex flex-col bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white/50 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center"><MessageSquare size={20} /></div>
          <div>
            <h3 className="font-black text-slate-800">Canal de Ciudad</h3>
            <p className="text-[10px] text-green-500 font-bold uppercase tracking-widest flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> Encriptado
            </p>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/30">
        {messages.map((m) => {
          const isMe = m.senderId === user?.uid;
          return (
            <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[70%] space-y-1`}>
                <div className={`px-4 py-2 rounded-2xl shadow-sm text-sm ${isMe ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white text-slate-700 rounded-tl-none border border-slate-100'}`}>
                  {m.text}
                </div>
                <p className={`text-[9px] font-bold text-slate-400 px-1 uppercase ${isMe ? 'text-right' : 'text-left'}`}>
                  {m.senderName} • {m.timestamp?.seconds ? new Date(m.timestamp.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={chatEndRef} />
      </div>
      <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-slate-100 flex gap-2">
        <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Escribe un mensaje..." className="flex-1 px-5 py-3 bg-slate-100 rounded-2xl text-sm outline-none font-medium" />
        <button className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg active:scale-90 transition-all"><Send size={20} /></button>
      </form>
    </div>
  );

  const TasksView = () => (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 ml-2">Asignar Orden</h3>
        <form onSubmit={handleAddTask} className="flex gap-3">
          <div className="flex-1 relative">
            <Plus className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input type="text" placeholder="Nueva operación..." className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-bold" value={newTaskInput} onChange={(e) => setNewTaskInput(e.target.value)} />
          </div>
          <button className="bg-slate-900 text-white px-8 rounded-2xl font-black hover:bg-blue-600 transition-all shadow-xl text-xs uppercase tracking-widest">Ejecutar</button>
        </form>
      </div>
      <div className="grid grid-cols-1 gap-4">
        {tasks.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-[2.5rem] border border-dashed border-slate-300 text-slate-400 font-bold italic">No hay órdenes pendientes.</div>
        ) : (
          tasks.map((t) => (
            <div key={t.id} className="group bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-5 hover:border-blue-200 transition-all">
              <button onClick={() => toggleTask(t.id, t.completed)} className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${t.completed ? 'bg-emerald-500 text-white shadow-emerald-100' : 'bg-slate-50 text-slate-300'} shadow-lg`}>
                {t.completed ? <CheckSquare size={18} /> : <div className="w-2 h-2 rounded-full bg-slate-300"></div>}
              </button>
              <div className="flex-1 min-w-0">
                <p className={`text-base font-bold truncate ${t.completed ? 'line-through text-slate-400 font-normal' : 'text-slate-800'}`}>{t.text}</p>
                <div className="flex items-center gap-4 mt-1">
                  <span className="flex items-center gap-1 text-[10px] font-black text-slate-400 uppercase tracking-tighter italic"><MapPin size={10} /> Sector Central</span>
                </div>
              </div>
              <button onClick={() => deleteTask(t.id)} className="p-2 text-slate-200 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={20} /></button>
            </div>
          ))
        )}
      </div>
    </div>
  );

  // --- RENDER BASE ---

  if (loading) return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-900">
      <div className="w-24 h-2 text-blue-500 flex gap-1">
        <div className="w-full h-full bg-blue-500 rounded-full animate-bounce"></div>
        <div className="w-full h-full bg-blue-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
        <div className="w-full h-full bg-blue-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
      </div>
      <h2 className="text-white font-black tracking-[0.5em] uppercase text-[10px] mt-8 opacity-50 text-center px-4">Iniciando Run City Hub OS</h2>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-100 transform transition-transform duration-500 lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-full flex flex-col p-8">
          <div className="flex items-center gap-4 mb-12">
            <div className="bg-slate-900 w-12 h-12 rounded-2xl flex items-center justify-center shadow-2xl rotate-3"><Shield className="text-blue-500" size={24} /></div>
            <div>
              <h1 className="font-black text-2xl tracking-tighter leading-none italic">RUN CITY</h1>
              <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">v6.8</p>
            </div>
          </div>
          <nav className="flex-1 space-y-2">
            {[
              { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
              { id: 'tasks', icon: CheckSquare, label: 'Operaciones' },
              { id: 'messages', icon: MessageSquare, label: 'Canal Ciudad' },
              { id: 'settings', icon: Settings, label: 'Sistema' },
            ].map(item => (
              <button key={item.id} onClick={() => setActiveTab(item.id)} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-bold text-sm transition-all ${activeTab === item.id ? 'bg-blue-600 text-white shadow-xl shadow-blue-100' : 'text-slate-400 hover:bg-slate-50'}`}>
                <item.icon size={20} /> {item.label}
              </button>
            ))}
          </nav>
          <div className="mt-auto pt-6 border-t border-slate-100 flex items-center gap-3">
             <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-xs font-black">{user?.uid?.charAt(0).toUpperCase()}</div>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nivel 10 Activo</p>
          </div>
        </div>
      </aside>

      <main className={`flex-1 min-w-0 transition-all duration-500 ${isSidebarOpen ? 'lg:ml-72' : ''}`}>
        <header className="sticky top-0 z-40 bg-slate-50/80 backdrop-blur-xl px-4 py-6 md:px-12 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-3 rounded-2xl bg-white text-slate-900 shadow-sm border border-slate-100"><MoreHorizontal size={20} /></button>
            <h2 className="text-2xl font-black text-slate-900 capitalize tracking-tighter">{activeTab}</h2>
          </div>
          <button className="relative p-3 bg-white border border-slate-100 text-slate-500 rounded-2xl shadow-sm"><Bell size={20} /><span className="absolute top-3 right-3 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span></button>
        </header>

        <div className="p-4 md:p-12 max-w-6xl mx-auto pb-32">
          {activeTab === 'dashboard' && <DashboardView />}
          {activeTab === 'tasks' && <TasksView />}
          {activeTab === 'messages' && <MessagesView />}
          {activeTab === 'settings' && (
             <div className="max-w-2xl mx-auto bg-white rounded-[3rem] p-10 shadow-sm border border-slate-100">
               <h3 className="text-2xl font-black mb-8">Preferencias</h3>
               <div className="p-6 bg-slate-50 rounded-3xl flex items-center justify-between border border-transparent">
                  <div><p className="font-black text-sm">Protección de Datos</p><p className="text-[10px] font-bold text-slate-400 uppercase">Encriptación activa</p></div>
                  <Badge color="bg-green-100 text-green-600">Activo</Badge>
               </div>
             </div>
          )}
        </div>
        
        <footer className="mt-20 border-t border-slate-100 p-12 text-center">
          <p className="text-[10px] text-slate-300 font-black uppercase tracking-[0.4em]">RUN CITY HUB CORE SYSTEM • v6.8.5</p>
        </footer>
      </main>
    </div>
  );
}