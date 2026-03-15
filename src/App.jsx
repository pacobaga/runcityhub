import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  onAuthStateChanged, 
  signInWithCustomToken, 
  signInAnonymously,
  updateProfile 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  onSnapshot, 
  doc, 
  updateDoc, 
  deleteDoc,
  serverTimestamp,
  query,
  limit,
  orderBy
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
  Lock
} from 'lucide-react';

// --- CONFIGURACIÓN E INICIALIZACIÓN ---
const firebaseConfig = JSON.parse(__firebase_config);
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

  // --- EFECTOS: FIREBASE ---

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) { console.error("Auth Fail:", err); }
    };
    initAuth();

    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!user) return;

    // Suscripción a Tareas (Regla 1 y 2)
    const tasksCol = collection(db, 'artifacts', appId, 'public', 'data', 'tasks');
    const unsubTasks = onSnapshot(tasksCol, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setTasks(list.sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
    }, (err) => console.error(err));

    // Suscripción a Mensajes
    const msgCol = collection(db, 'artifacts', appId, 'public', 'data', 'messages');
    const unsubMsg = onSnapshot(msgCol, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setMessages(list.sort((a,b) => (a.timestamp?.seconds || 0) - (b.timestamp?.seconds || 0)).slice(-50));
    }, (err) => console.error(err));

    // Suscripción a Logs de Actividad
    const logsCol = collection(db, 'artifacts', appId, 'public', 'data', 'logs');
    const unsubLogs = onSnapshot(query(logsCol, limit(8)), (snap) => {
      setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.error(err));

    return () => { unsubTasks(); unsubMsg(); unsubLogs(); };
  }, [user]);

  // Autoscroll para el chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // --- LÓGICA DE NEGOCIO ---

  const logActivity = async (message) => {
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
    if (!chatInput.trim()) return;
    
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'messages'), {
      text: chatInput,
      senderId: user.uid,
      senderName: user.displayName || `Admin_${user.uid.slice(0,4)}`,
      timestamp: serverTimestamp()
    });
    setChatInput('');
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTaskInput.trim()) return;
    
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'tasks'), {
      text: newTaskInput,
      completed: false,
      priority: 'normal',
      owner: user.uid,
      createdAt: serverTimestamp()
    });
    logActivity(`Nueva orden de ciudad: ${newTaskInput}`);
    setNewTaskInput('');
  };

  // --- VISTAS DEL HUB ---

  const DashboardView = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Grid de Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Operaciones" value={tasks.length} subtext="Total de órdenes" icon={Zap} color="bg-amber-500" trend={12} />
        <StatCard title="Ciudadanos" value="2.4k" subtext="+15 hoy" icon={Users} color="bg-indigo-500" trend={5} />
        <StatCard title="Uptime" value="99.9%" subtext="Sistema estable" icon={Activity} color="bg-emerald-500" />
        <StatCard title="Alertas" value={notifications.length} subtext="En las últimas 24h" icon={Bell} color="bg-rose-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Monitor de Actividad */}
        <div className="lg:col-span-2 bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-black flex items-center gap-2">
              <Clock className="text-blue-600" size={24} /> Log de Ciudad
            </h3>
            <button className="text-xs font-bold text-blue-600 hover:underline">Ver Historial Completo</button>
          </div>
          <div className="space-y-6">
            {notifications.length === 0 ? (
              <div className="py-10 text-center text-slate-300 italic">No hay actividad reciente registrada.</div>
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
                      {n.userName} • {n.timestamp?.seconds ? new Date(n.timestamp.seconds * 1000).toLocaleTimeString() : 'En proceso...'}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Conexiones Externas / Social */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2.5rem] p-8 text-white shadow-xl">
            <h3 className="text-lg font-black mb-2 flex items-center gap-2">
              <Globe size={20} className="text-blue-400" /> Redes Sociales
            </h3>
            <p className="text-slate-400 text-xs mb-6">Gestiona la presencia de Run City Hub en plataformas externas.</p>
            <div className="space-y-3">
              <a 
                href="https://instagram.com" 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-2xl transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 rounded-lg">
                    <Instagram size={18} />
                  </div>
                  <span className="text-sm font-bold">Instagram</span>
                </div>
                <ChevronRight size={16} className="text-slate-500 group-hover:translate-x-1 transition-transform" />
              </a>
              <div className="p-4 bg-blue-600/20 border border-blue-500/30 rounded-2xl flex items-center justify-between">
                <span className="text-xs font-bold text-blue-300">Estado de API</span>
                <Badge color="bg-blue-500 text-white">Online</Badge>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Administración</h3>
            <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-2xl">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center font-black text-white text-xl">
                {user.uid.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-black italic">Acceso Nivel 10</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">ID: {user.uid.slice(0,12)}...</p>
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
          <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
            <MessageSquare size={20} />
          </div>
          <div>
            <h3 className="font-black text-slate-800">Canal de Ciudad</h3>
            <p className="text-[10px] text-green-500 font-bold uppercase tracking-widest flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> Sistema Encriptado
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/30">
        {messages.map((m) => {
          const isMe = m.senderId === user.uid;
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
        <input 
          type="text"
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          placeholder="Escribe un mensaje al hub..."
          className="flex-1 px-5 py-3 bg-slate-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
        />
        <button className="p-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 active:scale-90">
          <Send size={20} />
        </button>
      </form>
    </div>
  );

  const TasksView = () => (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] mb-4 ml-2">Asignar Orden</h3>
        <form onSubmit={handleAddTask} className="flex gap-3">
          <div className="flex-1 relative">
            <Plus className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Nueva operación crítica para Run City..."
              className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 border border-transparent transition-all text-sm font-bold"
              value={newTaskInput}
              onChange={(e) => setNewTaskInput(e.target.value)}
            />
          </div>
          <button className="bg-slate-900 text-white px-8 rounded-2xl font-black hover:bg-blue-600 transition-all shadow-xl active:scale-95 text-xs uppercase tracking-widest">
            Ejecutar
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {tasks.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-[2.5rem] border border-dashed border-slate-300 text-slate-400 font-bold italic">
            La ciudad está en calma. No hay órdenes pendientes.
          </div>
        ) : (
          tasks.map((t) => (
            <div key={t.id} className="group bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-5 hover:border-blue-200 transition-all">
              <button 
                onClick={() => toggleTask(t.id, t.completed)}
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${t.completed ? 'bg-emerald-500 text-white shadow-emerald-100' : 'bg-slate-50 text-slate-300 hover:text-blue-500'} shadow-lg`}
              >
                {t.completed ? <CheckSquare size={18} /> : <div className="w-2 h-2 rounded-full bg-slate-300 group-hover:bg-blue-400"></div>}
              </button>
              
              <div className="flex-1 min-w-0">
                <p className={`text-base font-bold truncate ${t.completed ? 'line-through text-slate-400 font-normal' : 'text-slate-800'}`}>
                  {t.text}
                </p>
                <div className="flex items-center gap-4 mt-1">
                  <span className="flex items-center gap-1 text-[10px] font-black text-slate-400 uppercase tracking-tighter italic">
                    <MapPin size={10} /> Sector Central
                  </span>
                  <span className="flex items-center gap-1 text-[10px] font-black text-slate-400 uppercase tracking-tighter italic">
                    <Clock size={10} /> {t.createdAt?.seconds ? new Date(t.createdAt.seconds * 1000).toLocaleDateString() : 'Pendiente'}
                  </span>
                </div>
              </div>

              <button 
                onClick={() => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tasks', t.id))}
                className="p-2 text-slate-200 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
              >
                <Trash2 size={20} />
              </button>
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
      <h2 className="text-white font-black tracking-[0.5em] uppercase text-[10px] mt-8 opacity-50">Cargando Run City Hub OS</h2>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans selection:bg-blue-100 text-slate-900">
      
      {/* Sidebar de Navegación Pro */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-100 transform transition-transform duration-500 ease-in-out lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0 shadow-2xl lg:shadow-none' : '-translate-x-full'}`}>
        <div className="h-full flex flex-col p-8">
          <div className="flex items-center gap-4 mb-12">
            <div className="bg-slate-900 w-12 h-12 rounded-2xl flex items-center justify-center shadow-2xl shadow-slate-200 rotate-3">
              <Shield className="text-blue-500" size={24} />
            </div>
            <div>
              <h1 className="font-black text-2xl tracking-tighter leading-none italic">RUN CITY</h1>
              <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em]">Hub v6.8</p>
            </div>
          </div>

          <nav className="flex-1 space-y-2">
            {[
              { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
              { id: 'tasks', icon: CheckSquare, label: 'Operaciones' },
              { id: 'messages', icon: MessageSquare, label: 'Canal Ciudad' },
              { id: 'citizens', icon: Users, label: 'Ciudadanos' },
              { id: 'settings', icon: Settings, label: 'Sistema' },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id); if(window.innerWidth < 1024) setSidebarOpen(false); }}
                className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-bold text-sm transition-all group ${activeTab === item.id ? 'bg-blue-600 text-white shadow-xl shadow-blue-100' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900'}`}
              >
                <item.icon size={20} className={activeTab === item.id ? 'text-white' : 'text-slate-300 group-hover:text-blue-500'} />
                {item.label}
              </button>
            ))}
          </nav>

          <div className="mt-auto space-y-4">
            <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center font-black text-blue-500 text-sm ring-4 ring-white shadow-md">
                  {user?.uid?.charAt(0).toUpperCase()}
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-black truncate">ADMIN_{user?.uid?.slice(0,5).toUpperCase()}</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Estado: Online</p>
                </div>
              </div>
              <button className="w-full flex items-center justify-center gap-2 py-3 bg-white hover:bg-rose-50 hover:text-rose-500 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-slate-100 shadow-sm">
                <LogOut size={14} /> Desconectar
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className={`flex-1 min-w-0 transition-all duration-500 ${isSidebarOpen ? 'lg:ml-72' : ''}`}>
        
        {/* Superior Hub Bar */}
        <header className="sticky top-0 z-40 bg-slate-50/80 backdrop-blur-xl px-4 py-6 md:px-12">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-6">
              <button 
                onClick={() => setSidebarOpen(!isSidebarOpen)} 
                className={`p-3 rounded-2xl transition-all ${isSidebarOpen ? 'bg-white text-slate-900 shadow-sm' : 'bg-slate-900 text-white shadow-xl rotate-180'}`}
              >
                <MoreHorizontal size={20} />
              </button>
              <div>
                <h2 className="text-2xl font-black text-slate-900 capitalize tracking-tighter flex items-center gap-3">
                  {activeTab} <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                </h2>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center relative group">
                <Search className="absolute left-4 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={16} />
                <input 
                  type="text" 
                  placeholder="Comandos rápidos..." 
                  className="pl-12 pr-6 py-3 bg-white rounded-2xl text-xs font-bold border border-slate-100 shadow-sm focus:ring-4 focus:ring-blue-100 outline-none w-72 transition-all"
                />
              </div>
              <button className="relative p-3 bg-white border border-slate-100 text-slate-500 hover:text-blue-600 rounded-2xl shadow-sm transition-all group">
                <Bell size={20} className="group-hover:animate-bounce" />
                <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white"></span>
              </button>
            </div>
          </div>
        </header>

        {/* Dinamic Tab Rendering */}
        <div className="p-4 md:p-12 max-w-6xl mx-auto pb-32">
          {activeTab === 'dashboard' && <DashboardView />}
          {activeTab === 'tasks' && <TasksView />}
          {activeTab === 'messages' && <MessagesView />}
          
          {activeTab === 'citizens' && (
            <div className="bg-white p-12 rounded-[3rem] text-center border border-slate-100 shadow-sm flex flex-col items-center">
              <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-[2rem] flex items-center justify-center mb-6">
                <Lock size={40} />
              </div>
              <h3 className="text-2xl font-black mb-2">Protocolo de Privacidad</h3>
              <p className="text-slate-400 text-sm max-w-sm mb-8">La base de datos de ciudadanos requiere una clave RSA de nivel 15 y autorización del consejo.</p>
              <button className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl">Solicitar Acceso</button>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="max-w-2xl mx-auto bg-white rounded-[3rem] p-10 shadow-sm border border-slate-100">
              <h3 className="text-2xl font-black mb-8 flex items-center gap-3"><Settings className="text-blue-600" /> Preferencias</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-6 bg-slate-50 rounded-3xl border border-transparent hover:border-slate-200 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white rounded-2xl shadow-sm text-slate-500"><UserIcon size={20} /></div>
                    <div>
                      <p className="font-black text-sm">Identidad del Administrador</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Cambiar alias en el sistema</p>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-slate-300" />
                </div>
                <div className="flex items-center justify-between p-6 bg-slate-50 rounded-3xl border border-transparent hover:border-slate-200 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white rounded-2xl shadow-sm text-blue-500"><Shield size={20} /></div>
                    <div>
                      <p className="font-black text-sm">Firewall de Run City</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Protección activa de datos</p>
                    </div>
                  </div>
                  <Badge color="bg-green-100 text-green-600">Activo</Badge>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Footer OS Info */}
        <footer className="mt-20 border-t border-slate-100 p-12 text-center">
          <div className="flex justify-center gap-8 mb-6 opacity-30 grayscale hover:grayscale-0 transition-all duration-500">
            <Shield size={24} />
            <Zap size={24} />
            <Globe size={24} />
          </div>
          <p className="text-[10px] text-slate-300 font-black uppercase tracking-[0.4em]">
            RUN CITY HUB CORE SYSTEM • v6.8.4 • GEMINI ARCHITECTURE
          </p>
        </footer>
      </main>

      {/* Floating Info (Responsive Only) */}
      <div className="fixed bottom-6 right-6 lg:hidden z-50">
        <button 
          onClick={() => setActiveTab('messages')}
          className="bg-blue-600 text-white p-5 rounded-full shadow-2xl shadow-blue-400 animate-bounce"
        >
          <MessageSquare size={24} />
        </button>
      </div>
    </div>
  );
}