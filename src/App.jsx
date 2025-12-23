import React, { useState, useEffect, useRef } from 'react';
import { 
  Palmtree, RefreshCcw, MapPin, Calendar, User, 
  CheckCircle, ArrowRight, Wallet, Building2, 
  ChevronLeft, Clock, Info, Loader2, ChevronDown,
  Sparkles, MessageCircle, X, Send, Bot
} from 'lucide-react';

// --- КОНФИГУРАЦИЯ ---
const AIRTABLE_CONFIG = {
  apiKey: "YOUR_AIRTABLE_PAT_KEY", 
  baseId: "YOUR_BASE_ID",
  excursionsTable: "Excursions",
  bookingsTable: "Bookings",
  exchangeTable: "Exchange"
};

// --- GEMINI API HELPERS ---
const callGemini = async (messages, contextData) => {
  const apiKey = ""; // API ключ предоставляется средой выполнения автоматически
  
  // Формируем системный промпт с данными об экскурсиях
  const systemPrompt = `
    Ты - полезный AI-ассистент для туристического сервиса в Таиланде "Bounty Tour".
    Твоя задача - помогать туристам выбирать экскурсии и отвечать на вопросы про Таиланд.
    
    ВОТ СПИСОК ДОСТУПНЫХ ЭКСКУРСИЙ (рекомендуй только их):
    ${JSON.stringify(contextData.map(e => `${e.name} (Цена: ${e.price}, Длительность: ${e.duration}) - ${e.description}`).join('\n'))}
    
    Правила:
    1. Отвечай кратко, вежливо и с энтузиазмом. Используй эмодзи.
    2. Если спрашивают "куда поехать", предлагай варианты из списка выше.
    3. Можешь отвечать на вопросы про обмен валют (у нас есть обмен RUB, USD, USDT, THB).
    4. Язык ответов: Русский.
  `;

  // Формируем историю для API
  const contents = [
    {
      role: "user",
      parts: [{ text: systemPrompt + "\n\nТекущий вопрос пользователя: " + messages[messages.length - 1].text }]
    }
  ];

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents })
      }
    );

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Извините, сейчас я не могу ответить. Попробуйте позже! 🙏";
  }
};

// --- КОМПОНЕНТЫ UI ---

// Уведомление
const Notification = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed top-4 left-4 right-4 z-50 p-4 rounded-xl shadow-xl border backdrop-blur-md transform transition-all duration-300 animate-slide-down flex items-center gap-3
      ${type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700' : 'bg-red-500/10 border-red-500/20 text-red-700'}`}>
      {type === 'success' ? <CheckCircle size={20} /> : <Loader2 size={20} className="animate-spin" />}
      <span className="font-medium text-sm">{message}</span>
    </div>
  );
};

// Кнопка
const Button = ({ children, onClick, variant = 'primary', className = '', disabled = false, type = 'button' }) => {
  const baseStyle = "w-full py-3.5 rounded-2xl font-semibold text-sm transition-all duration-200 transform active:scale-95 flex items-center justify-center gap-2 shadow-sm";
  const variants = {
    primary: "bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-70 disabled:cursor-not-allowed shadow-slate-300/50",
    secondary: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50",
    ghost: "bg-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100",
    ai: "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-indigo-300/50 hover:shadow-lg"
  };

  return (
    <button 
      type={type}
      onClick={onClick} 
      disabled={disabled}
      className={`${baseStyle} ${variants[variant]} ${className}`}
    >
      {disabled ? <Loader2 className="animate-spin" size={18} /> : children}
    </button>
  );
};

// Поле ввода
const Input = ({ label, icon: Icon, className = '', ...props }) => (
  <div className={`relative group ${className}`}>
    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-800 transition-colors">
      {Icon && <Icon size={18} />}
    </div>
    <input
      {...props}
      className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl py-3.5 pl-11 pr-4 outline-none focus:ring-2 focus:ring-slate-200 focus:bg-white transition-all placeholder:text-slate-400"
    />
  </div>
);

// Выпадающий список
const Select = ({ options, value, onChange, icon: Icon, placeholder = "Выберите..." }) => (
  <div className="relative group">
    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-800 transition-colors">
      {Icon && <Icon size={18} />}
    </div>
    <select
      value={value}
      onChange={onChange}
      className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl py-3.5 pl-11 pr-10 outline-none focus:ring-2 focus:ring-slate-200 focus:bg-white transition-all appearance-none cursor-pointer"
    >
      <option value="" disabled>{placeholder}</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
      <ChevronDown size={16} />
    </div>
  </div>
);

// --- КОМПОНЕНТ ЧАТА ---
const AIChat = ({ isOpen, onClose, contextData }) => {
  const [messages, setMessages] = useState([
    { id: 1, text: "Привет! 👋 Я ваш AI-гид по Таиланду. Помочь выбрать экскурсию или подсказать что-то по обмену валют?", sender: 'ai' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const userMsg = { id: Date.now(), text: inputValue, sender: 'user' };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    // Call Gemini
    const aiResponseText = await callGemini([...messages, userMsg], contextData);
    
    setIsTyping(false);
    setMessages(prev => [...prev, { id: Date.now() + 1, text: aiResponseText, sender: 'ai' }]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/20 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full h-[85vh] sm:h-[600px] sm:max-w-md sm:rounded-3xl rounded-t-3xl shadow-2xl flex flex-col overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 flex items-center justify-between text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md">
              <Sparkles size={20} className="text-yellow-300" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Travel Genius AI</h3>
              <p className="text-xs text-indigo-100 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"/> Онлайн
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] p-3.5 rounded-2xl text-sm leading-relaxed ${
                msg.sender === 'user' 
                  ? 'bg-slate-900 text-white rounded-br-none shadow-md' 
                  : 'bg-white text-slate-800 rounded-bl-none shadow-sm border border-slate-100'
              }`}>
                {msg.text}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-white p-4 rounded-2xl rounded-bl-none shadow-sm border border-slate-100 flex gap-1">
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"/>
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-75"/>
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-150"/>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-3 bg-white border-t border-slate-100 shrink-0 flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Спросите про экскурсии..."
            className="flex-1 bg-slate-100 border-0 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          />
          <button 
            onClick={handleSend}
            disabled={!inputValue.trim() || isTyping}
            className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};


// --- ГЛАВНЫЙ КОМПОНЕНТ APP ---

// MOCK ДАННЫЕ (Используются, если Airtable не подключен или пуст)
const MOCK_EXCURSIONS = [
  {
    id: 'rec1',
    name: 'Острова Пхи-Пхи',
    price: '2400 ฿',
    duration: 'Весь день',
    image: 'https://images.unsplash.com/photo-1537956965359-3578e76a951d?auto=format&fit=crop&q=80&w=800',
    description: 'Легендарные острова, снорклинг и пляж Майя Бэй.'
  },
  {
    id: 'rec2',
    name: 'Симиланские острова',
    price: '2800 ฿',
    duration: '07:00 - 17:00',
    image: 'https://images.unsplash.com/photo-1589394815804-964ed0be2eb5?auto=format&fit=crop&q=80&w=800',
    description: 'Белоснежный песок и лазурная вода. Жемчужина Андамана.'
  },
  {
    id: 'rec3',
    name: 'Слоновья ферма',
    price: '1200 ฿',
    duration: '3 часа',
    image: 'https://images.unsplash.com/photo-1585970480901-90d6b92d8749?auto=format&fit=crop&q=80&w=800',
    description: 'Купание со слонами в джунглях, фотосессия.'
  }
];

export default function App() {
  const [activeTab, setActiveTab] = useState('excursion'); 
  const [excursionView, setExcursionView] = useState('catalog'); 
  const [selectedExcursion, setSelectedExcursion] = useState(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  
  // Состояние для списка экскурсий
  const [excursions, setExcursions] = useState(MOCK_EXCURSIONS);

  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  // Формы
  const [excursionForm, setExcursionForm] = useState({
    firstName: '', lastName: '', birthDate: '', hotel: ''
  });
  const [exchangeForm, setExchangeForm] = useState({
    pair: '', payMethod: 'cash', receiveMethod: 'cash',
    senderBank: '', receiverBank: '', amount: ''
  });

  // --- ЗАГРУЗКА ЭКСКУРСИЙ ИЗ AIRTABLE ---
  useEffect(() => {
    // Проверка, введены ли ключи
    const isConfigured = AIRTABLE_CONFIG.apiKey && AIRTABLE_CONFIG.apiKey !== "YOUR_AIRTABLE_PAT_KEY";

    if (!isConfigured) {
      console.log("Airtable не настроен, используем тестовые данные.");
      return;
    }

    const fetchExcursions = async () => {
      try {
        const response = await fetch(`https://api.airtable.com/v0/${AIRTABLE_CONFIG.baseId}/${AIRTABLE_CONFIG.excursionsTable}`, {
          headers: {
            'Authorization': `Bearer ${AIRTABLE_CONFIG.apiKey}`
          }
        });
        
        if (!response.ok) {
            console.error("Ошибка Airtable:", response.statusText);
            return;
        }

        const data = await response.json();
        
        // Превращаем формат Airtable в наш формат
        const loadedExcursions = data.records.map(record => {
            // Логика получения картинки
            let imageUrl = 'https://images.unsplash.com/photo-1537956965359-3578e76a951d?auto=format&fit=crop&q=80&w=800'; // Fallback
            
            if (record.fields.image) {
                if (Array.isArray(record.fields.image) && record.fields.image.length > 0) {
                    imageUrl = record.fields.image[0].url;
                } else if (typeof record.fields.image === 'string') {
                    imageUrl = record.fields.image;
                }
            }

            return {
                id: record.id,
                // Важно: берем поле EXC
                name: record.fields.EXC || record.fields.name || record.fields.Name || 'Без названия',
                price: record.fields.price || '',
                duration: record.fields.duration || '',
                image: imageUrl,
                description: record.fields.description || ''
            };
        });

        if (loadedExcursions.length > 0) {
            setExcursions(loadedExcursions);
        }
      } catch (error) {
        console.error("Ошибка загрузки экскурсий:", error);
      }
    };

    fetchExcursions();
  }, []);

  const submitToAirtable = async (table, data) => {
    setLoading(true);
    
    // Если ключи не настроены, просто имитируем успех
    const isConfigured = AIRTABLE_CONFIG.apiKey && AIRTABLE_CONFIG.apiKey !== "YOUR_AIRTABLE_PAT_KEY";
    
    if (!isConfigured) {
        await new Promise(r => setTimeout(r, 1000));
        console.log(`[DEMO] Отправка в ${table}:`, data);
        setNotification({ message: 'Демо-режим: Успешно!', type: 'success' });
        if (table === AIRTABLE_CONFIG.bookingsTable) {
            setExcursionForm({ firstName: '', lastName: '', birthDate: '', hotel: '' });
            setExcursionView('catalog'); 
        } else {
            setExchangeForm({ ...exchangeForm, amount: '', senderBank: '', receiverBank: '' });
        }
        setLoading(false);
        return;
    }

    try {
      const response = await fetch(`https://api.airtable.com/v0/${AIRTABLE_CONFIG.baseId}/${table}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${AIRTABLE_CONFIG.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ fields: data })
      });
      
      if (!response.ok) throw new Error('Ошибка отправки');

      setNotification({ message: 'Заявка успешно создана!', type: 'success' });
      
      // Очистка форм после успеха
      if (table === AIRTABLE_CONFIG.bookingsTable) {
        setExcursionForm({ firstName: '', lastName: '', birthDate: '', hotel: '' });
        setExcursionView('catalog'); 
      } else {
        setExchangeForm({ ...exchangeForm, amount: '', senderBank: '', receiverBank: '' });
      }
    } catch (error) {
      console.error(error);
      setNotification({ message: 'Ошибка соединения', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleExcursionSelect = (excursion) => {
    setSelectedExcursion(excursion);
    setExcursionView('booking');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-10">
      
      {notification && (
        <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />
      )}

      {/* Чат Ассистент */}
      <AIChat isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} contextData={excursions} />
      
      {/* Плавающая кнопка Чата */}
      <button 
        onClick={() => setIsChatOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 shadow-xl shadow-indigo-300/50 flex items-center justify-center text-white transform transition-all hover:scale-110 active:scale-95 animate-fade-in-up"
      >
        <Sparkles size={24} className="animate-pulse" />
      </button>

      {/* HEADER */}
      <header className="px-6 pt-6 pb-2 flex flex-col items-center justify-center animate-fade-in bg-white/50 backdrop-blur-sm sticky top-0 z-30 border-b border-slate-100/50">
        <div className="w-20 h-20 relative mb-2 transition-transform hover:scale-105 duration-300">
           {/* Логотип */}
           <img 
             src="image.png" alt="Logo" 
             className="w-full h-full object-contain drop-shadow-lg"
             onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
           />
           {/* Fallback если картинки нет */}
           <div className="hidden w-full h-full rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700 items-center justify-center shadow-xl text-white">
             <span className="text-3xl font-bold tracking-tighter">Ts</span>
           </div>
        </div>
        <h1 className="text-lg font-bold text-slate-900 tracking-tight">Bounty Tour</h1>
      </header>

      {/* TABS */}
      <div className="px-4 py-4 sticky top-[120px] z-20 bg-slate-50/95 backdrop-blur-sm">
        <div className="bg-white p-1.5 rounded-2xl flex relative shadow-sm border border-slate-100">
          <div className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-slate-900 rounded-xl shadow-md transition-all duration-300 ease-out ${activeTab === 'exchange' ? 'translate-x-[calc(100%+6px)]' : 'translate-x-0'}`} />
          <button onClick={() => setActiveTab('excursion')} className={`flex-1 relative z-10 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors duration-200 ${activeTab === 'excursion' ? 'text-white' : 'text-slate-500'}`}>
            <Palmtree size={16} /><span>Экскурсии</span>
          </button>
          <button onClick={() => setActiveTab('exchange')} className={`flex-1 relative z-10 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors duration-200 ${activeTab === 'exchange' ? 'text-white' : 'text-slate-500'}`}>
            <RefreshCcw size={16} /><span>Обмен</span>
          </button>
        </div>
      </div>

      <main className="px-4 overflow-hidden max-w-md mx-auto">
        
        {/* --- ЭКСКУРСИИ --- */}
        <div className={`transition-all duration-500 ease-in-out ${activeTab === 'excursion' ? 'opacity-100 translate-x-0' : 'opacity-0 hidden -translate-x-10'}`}>
          
          {/* VIEW: КАТАЛОГ */}
          {excursionView === 'catalog' && (
            <div className="space-y-4 animate-slide-up pb-20">
              {/* Баннер AI */}
              <div 
                onClick={() => setIsChatOpen(true)}
                className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-4 text-white shadow-lg shadow-indigo-200 flex items-center justify-between cursor-pointer active:scale-98 transition-transform"
              >
                <div>
                  <h3 className="font-bold flex items-center gap-2"><Sparkles size={16} /> Подбор тура с AI</h3>
                  <p className="text-xs text-indigo-100 mt-1">Не знаете что выбрать? Спросите!</p>
                </div>
                <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
                  <ArrowRight size={20} />
                </div>
              </div>

              {excursions.map((item) => (
                <div key={item.id} className="bg-white rounded-3xl p-3 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                  <div className="relative h-40 rounded-2xl overflow-hidden mb-3">
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-slate-900 shadow-sm">{item.price}</div>
                  </div>
                  <div className="px-1">
                    <h3 className="font-bold text-slate-900 text-lg leading-tight mb-1">{item.name}</h3>
                    <div className="flex items-center gap-4 text-xs text-slate-500 mb-3">
                      <span className="flex items-center gap-1"><Clock size={12}/> {item.duration}</span>
                    </div>
                    <Button onClick={() => handleExcursionSelect(item)} variant="secondary" className="bg-slate-50 border-0 text-slate-900 hover:bg-slate-100">Выбрать</Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* VIEW: БРОНИРОВАНИЕ */}
          {excursionView === 'booking' && (
            <div className="animate-slide-up">
              <button onClick={() => setExcursionView('catalog')} className="mb-4 flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors">
                <ChevronLeft size={18} /> Назад к выбору
              </button>
              <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 mb-4">
                 <div className="flex gap-4 items-center mb-4 pb-4 border-b border-slate-50">
                    <img src={selectedExcursion?.image} alt="" className="w-16 h-16 rounded-xl object-cover" />
                    <div>
                      <h3 className="font-bold text-slate-900">{selectedExcursion?.name}</h3>
                      <p className="text-slate-500 text-sm">{selectedExcursion?.price}</p>
                    </div>
                 </div>
                 <form onSubmit={(e) => { e.preventDefault(); submitToAirtable(AIRTABLE_CONFIG.bookingsTable, { ...excursionForm, ExcursionName: selectedExcursion?.name }); }} className="space-y-3">
                    <Input icon={User} type="text" placeholder="Имя" required value={excursionForm.firstName} onChange={(e) => setExcursionForm({...excursionForm, firstName: e.target.value})} />
                    <Input icon={User} type="text" placeholder="Фамилия" required value={excursionForm.lastName} onChange={(e) => setExcursionForm({...excursionForm, lastName: e.target.value})} />
                    <Input icon={Calendar} type="date" required className="text-slate-500" value={excursionForm.birthDate} onChange={(e) => setExcursionForm({...excursionForm, birthDate: e.target.value})} />
                    <Input icon={MapPin} type="text" placeholder="Отель проживания" required value={excursionForm.hotel} onChange={(e) => setExcursionForm({...excursionForm, hotel: e.target.value})} />
                    <div className="pt-2"><Button type="submit" disabled={loading}>{loading ? 'Обработка...' : 'Подтвердить бронь'}</Button></div>
                 </form>
              </div>
            </div>
          )}
        </div>

        {/* --- ОБМЕН --- */}
        <div className={`transition-all duration-500 ease-in-out ${activeTab === 'exchange' ? 'opacity-100 translate-x-0' : 'opacity-0 hidden translate-x-10'}`}>
          <form onSubmit={(e) => { e.preventDefault(); submitToAirtable(AIRTABLE_CONFIG.exchangeTable, exchangeForm); }} className="space-y-4 animate-slide-up pb-20">
            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4">
              <h2 className="text-lg font-bold text-slate-800">Заявка на обмен</h2>
              <Input icon={Wallet} type="number" placeholder="Сумма" required value={exchangeForm.amount} onChange={(e) => setExchangeForm({...exchangeForm, amount: e.target.value})} />
              <Select icon={RefreshCcw} value={exchangeForm.pair} onChange={(e) => setExchangeForm({...exchangeForm, pair: e.target.value})} placeholder="Валютная пара"
                options={[{ value: 'RUB_USDT', label: 'RUB → USDT' }, { value: 'USDT_RUB', label: 'USDT → RUB' }, { value: 'USD_THB', label: 'USD → THB' }, { value: 'THB_USD', label: 'THB → USD' }]} />
              
              {/* Способ оплаты */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                 <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Вы отдаете</span>
                 <div className="flex gap-2">
                    {['cash', 'card'].map(m => (
                       <button key={m} type="button" onClick={() => setExchangeForm({...exchangeForm, payMethod: m})} className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${exchangeForm.payMethod === m ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}>{m === 'cash' ? 'Наличные' : 'Карта'}</button>
                    ))}
                 </div>
                 {exchangeForm.payMethod === 'card' && (
                    <div className="animate-fade-in-up">
                        <Select icon={Building2} placeholder="Банк" value={exchangeForm.senderBank} onChange={(e) => setExchangeForm({...exchangeForm, senderBank: e.target.value})} options={[{ value: 'Sber', label: 'Сбербанк' }, { value: 'Tinkoff', label: 'Тинькофф' }, { value: 'Alpha', label: 'Альфа-Банк' }]} />
                    </div>
                 )}
              </div>

              {/* Способ получения */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                 <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Вы получаете</span>
                 <div className="flex gap-2">
                    {['cash', 'card'].map(m => (
                       <button key={m} type="button" onClick={() => setExchangeForm({...exchangeForm, receiveMethod: m})} className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${exchangeForm.receiveMethod === m ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}>{m === 'cash' ? 'Наличные' : 'Карта'}</button>
                    ))}
                 </div>
                 {exchangeForm.receiveMethod === 'card' && (
                    <div className="animate-fade-in-up">
                        <Select icon={Building2} placeholder="Банк" value={exchangeForm.receiverBank} onChange={(e) => setExchangeForm({...exchangeForm, receiverBank: e.target.value})} options={[{ value: 'KBank', label: 'Kasikorn' }, { value: 'BKK', label: 'Bangkok Bank' }, { value: 'SCB', label: 'SCB' }]} />
                    </div>
                 )}
              </div>
            </div>
            <Button type="submit" disabled={loading}>{loading ? 'Создание...' : 'Создать заявку'}</Button>
          </form>
        </div>

      </main>
      <style>{`
        @keyframes slide-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fade-in-up { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        .animate-slide-up { animation: slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
        .animate-fade-in { animation: fade-in 0.7s ease-out; }
        .animate-fade-in-up { animation: fade-in-up 0.3s ease-out; }
      `}</style>
    </div>
  );
}