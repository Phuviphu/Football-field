import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Calendar, Clock, Star, Menu, X, User, LogIn, Phone, CreditCard, Filter, History, RefreshCw, ArrowLeft, Trash2, Plus, AlertCircle, Users, Send, MessageSquare, BarChart2, LayoutDashboard, FileText, Settings, Gift, Home, Edit } from 'lucide-react';


// --- HÀM LOGIC TÍNH TOÁN ---
const calculateComplexPrice = (dateStr, startStr, endStr, fieldType) => {
    if (!startStr || !endStr || !dateStr) return 0;

    const timeToDecimal = (t) => {
        const [h, m] = t.split(':').map(Number);
        return h + m / 60;
    };

    let start = timeToDecimal(startStr);
    let end = timeToDecimal(endStr);

    if (end <= start) return 0;

    let total = 0;
    let totalHours = 0;

    const rates = [
        { start: 5, end: 11, price: 210000 },
        { start: 11, end: 14, price: 180000 },
        { start: 14, end: 18, price: 220000 },
        { start: 18, end: 24, price: 250000 }
    ];

    for (let rate of rates) {
        const overlapStart = Math.max(start, rate.start);
        const overlapEnd = Math.min(end, rate.end);
        if (overlapEnd > overlapStart) {
            const duration = overlapEnd - overlapStart;
            total += duration * rate.price;
            totalHours += duration;
        }
    }

    if (fieldType === 'Sân 7') total += totalHours * 50000;

    if (new Date(dateStr).getDate() === 14) total = total * 0.9;

    return total;
};

const checkConflict = (startStr, endStr, busySlots) => {
    if (!startStr || !endStr || !busySlots) return false;

    const toMinutes = (s) => {
        const [h, m] = s.split(':').map(Number);
        return h * 60 + m;
    };

    const newStart = toMinutes(startStr);
    const newEnd = toMinutes(endStr);

    for (let slot of busySlots) {
        const busyStart = toMinutes(slot.start);
        const busyEnd = toMinutes(slot.end);
        if (newStart < busyEnd && newEnd > busyStart) return true;
    }
    return false;
};

const checkPastTimeConflict = (bookingDateStr, startTimeStr) => {
    if (!startTimeStr) return false;
    const today = new Date().toISOString().split('T')[0];
    if (bookingDateStr !== today) return false;

    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const [h, m] = startTimeStr.split(':').map(Number);
    const bookingStartMinutes = h * 60 + m;

    if (bookingStartMinutes <= nowMinutes) return true;
    return false;
};


// --- CÁC COMPONENT NHỎ ---
// --- Nút Chat Trôi Nổi ---
const FloatingChatButton = ({ onClick, unreadCount }) => (
    <button 
        onClick={onClick}
        className="fixed bottom-6 right-6 bg-green-600 text-white p-4 rounded-full shadow-2xl hover:bg-green-700 transition-all transform hover:scale-110 z-50 flex items-center justify-center"
    >
        <MessageSquare className="w-6 h-6" />
        {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-bounce">
                {unreadCount}
            </span>
        )}
    </button>
);

// --- Khung Chat ---
const ChatBox = ({ currentUser, onClose }) => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const messagesEndRef = useRef(null);

    const fetchMessages = async () => {
        try {
            const res = await fetch(`http://localhost:5000/api/messages?userId=${currentUser.id}`);
            if(res.ok) setMessages(await res.json());
        } catch(e) {}
    };

    useEffect(() => {
        // Đánh dấu đã đọc khi mở box
        fetch('http://localhost:5000/api/messages/read', {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ userId: currentUser.id, isAdminViewer: false })
        });
    }, []);

    useEffect(() => {
        fetchMessages();
        const interval = setInterval(fetchMessages, 3000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

    const handleSend = async () => {
        if(!input.trim()) return;
        try {
            await fetch('http://localhost:5000/api/messages', {
                method: 'POST', headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ userId: currentUser.id, content: input, isAdmin: false })
            });
            setInput('');
            fetchMessages();
        } catch(e) {}
    };

    return (
        <div className="fixed bottom-24 right-6 w-80 h-96 bg-white rounded-xl shadow-2xl flex flex-col border border-gray-200 z-50 animate-fade-in-up">
            <div className="bg-green-600 text-white p-3 rounded-t-xl flex justify-between items-center">
                <span className="font-bold flex items-center"><MessageSquare className="w-4 h-4 mr-2"/> Chat với Admin</span>
                <button onClick={onClose}><X className="w-4 h-4"/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50">
                {messages.length === 0 && <p className="text-center text-gray-400 text-sm mt-10">Chưa có tin nhắn nào.</p>}
                {messages.map((m, i) => (
                    <div key={i} className={`flex ${m.IsAdminSender ? 'justify-start' : 'justify-end'}`}>
                        <div className={`max-w-[80%] p-2 rounded-lg text-sm shadow-sm ${m.IsAdminSender ? 'bg-white border text-gray-800' : 'bg-green-600 text-white'}`}>
                            {m.NoiDung}
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
            <div className="p-3 border-t bg-white rounded-b-xl flex">
                <input 
                    className="flex-1 border rounded-l-lg px-3 py-2 text-sm outline-none focus:border-green-500" 
                    value={input} 
                    onChange={e=>setInput(e.target.value)} 
                    onKeyPress={e=>e.key==='Enter'&&handleSend()} 
                    placeholder="Nhập tin nhắn..."
                />
                <button onClick={handleSend} className="bg-green-600 text-white px-4 rounded-r-lg hover:bg-green-700"><Send className="w-4 h-4"/></button>
            </div>
        </div>
    );
};

// --- Modal Khuyến Mãi ---
const PromotionModal = ({ onClose }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
        <div className="bg-white p-6 rounded-lg max-w-sm text-center animate-bounce-in" onClick={e=>e.stopPropagation()}>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4"><Gift className="w-8 h-8 text-red-600"/></div>
            <h2 className="text-2xl font-bold text-red-600 mb-2">SIÊU SALE NGÀY 14!</h2>
            <p className="text-gray-700 mb-4">Giảm giá <span className="font-bold text-red-500">10%</span> cho tất cả các khung giờ đặt sân vào ngày 14 hàng tháng.</p>
            <button onClick={onClose} className="mt-6 bg-red-600 text-white px-6 py-2 rounded-full font-bold">Đã hiểu</button>
        </div>
    </div>
);


// --- CÁC TRANG CHÍNH (PAGES) ---
const Header = ({ currentView, setCurrentView, isLoggedIn, handleLogout, currentUser, onOpenChat }) => (
  <header className="bg-white shadow-md sticky top-0 z-50">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center py-4">
        <div className="flex items-center space-x-2 cursor-pointer" onClick={() => setCurrentView('home')}>
          <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center"><span className="text-white font-bold text-xl">F</span></div>
          <span className="text-xl font-bold text-green-700">Sân bóng FuFu</span>
        </div>
        
        {currentUser?.phone !== 'admin' && (
            <div className="flex items-center space-x-4 bg-gray-50 px-4 py-1 rounded-full border border-gray-100">
                {currentView !== 'home' && (<button onClick={() => setCurrentView('home')} className="p-1 text-gray-600 hover:text-green-600 transition" title="Quay lại"><ArrowLeft className="w-5 h-5"/></button>)}
                <button onClick={() => window.location.reload()} className="p-1 text-gray-600 hover:text-green-600 transition" title="Tải lại"><RefreshCw className="w-5 h-5"/></button>
            </div>
        )}

        <nav className="hidden md:flex space-x-6">
          {currentUser?.phone === 'admin' ? (
              <span className="text-red-600 font-bold uppercase cursor-pointer" onClick={() => setCurrentView('admin')}>Trang Quản Trị Viên</span>
          ) : (
              <>
                <button onClick={() => setCurrentView('home')} className="text-gray-700 hover:text-green-600 font-medium">Trang chủ</button>
                <button onClick={() => setCurrentView('search')} className="text-gray-700 hover:text-green-600 font-medium">Tìm sân</button>
                <button onClick={() => setCurrentView('promotion')} className="text-gray-700 hover:text-green-600 font-medium">Khuyến mãi</button>
                <button onClick={onOpenChat} className="text-gray-700 hover:text-green-600 font-medium">Liên hệ</button>
              </>
          )}
        </nav>

        <div className="hidden md:flex items-center space-x-4">
            {isLoggedIn ? (
                <>
                    <span className="text-sm font-bold text-green-700">Hi, {currentUser?.name || 'Bạn'}</span>
                    {currentUser?.phone !== 'admin' && (
                        <button onClick={() => setCurrentView('history')} className="text-gray-700 hover:text-green-600 flex items-center space-x-1">
                            <History className="w-5 h-5" /> <span>Lịch sử</span>
                        </button>
                    )}
                    <button onClick={handleLogout} className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 font-bold text-sm">Đăng xuất</button>
                </>
            ) : (
                <button onClick={() => setCurrentView('login')} className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-bold">
                    <LogIn className="w-4 h-4" /><span>Đăng nhập</span>
                </button>
            )}
        </div>
      </div>
    </div>
  </header>
);

const HomePage = ({ setCurrentView, searchFilters, setSearchFilters, fields, loading, setSelectedField }) => (
  <div className="min-h-screen bg-gray-50">
    <div className="bg-gradient-to-r from-green-600 to-green-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
            <div className="text-center">
                <h1 className="text-4xl md:text-5xl font-bold mb-4">Sân chuẩn, giá tốt, chỉ cần bạn bấm</h1>
                <p className="text-xl mb-8 text-green-100">Tìm và đặt sân bóng đá tốt nhất gần bạn chỉ với vài cú click</p>
                <div className="bg-white rounded-lg shadow-xl p-6 max-w-4xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="flex items-center border border-gray-300 rounded-lg px-4 py-2">
                            <MapPin className="w-5 h-5 text-gray-400 mr-2" />
                            <input type="text" placeholder="Vị trí" className="flex-1 outline-none text-gray-700 text-black" value={searchFilters.location} onChange={(e) => setSearchFilters({...searchFilters, location: e.target.value})} />
                        </div>
                        <div className="flex items-center border border-gray-300 rounded-lg px-4 py-2">
                            <Calendar className="w-5 h-5 text-gray-400 mr-2" />
                            <input type="date" className="flex-1 outline-none text-gray-700 text-black" value={searchFilters.date} onChange={(e) => setSearchFilters({...searchFilters, date: e.target.value})} />
                        </div>
                        <div className="flex items-center border border-gray-300 rounded-lg px-4 py-2">
                            <Clock className="w-5 h-5 text-gray-400 mr-2" />
                            <select className="flex-1 outline-none text-gray-700 text-black">
                                <option value="">Giờ</option><option value="morning">Sáng</option><option value="evening">Tối</option>
                            </select>
                        </div>
                        <button onClick={() => setCurrentView('search')} className="bg-green-600 text-white rounded-lg px-6 py-2 font-semibold hover:bg-green-700 flex items-center justify-center">
                            <Search className="w-5 h-5 mr-2" /> Tìm sân
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-3xl font-bold text-center mb-12 text-gray-800">Tại sao chọn chúng tôi?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white rounded-lg shadow-md p-6 text-center hover:shadow-xl transition">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"><Search className="w-8 h-8 text-green-600" /></div>
                <h3 className="text-xl font-semibold mb-2 text-gray-800">Tìm kiếm thông minh</h3>
                <p className="text-gray-600">Tìm sân theo vị trí, giờ, loại sân và mức giá phù hợp với bạn</p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6 text-center hover:shadow-xl transition">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"><Calendar className="w-8 h-8 text-green-600" /></div>
                <h3 className="text-xl font-semibold mb-2 text-gray-800">Đặt sân dễ dàng</h3>
                <p className="text-gray-600">Chọn giờ, thanh toán và nhận mã xác nhận chỉ trong vài phút</p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6 text-center hover:shadow-xl transition">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"><Star className="w-8 h-8 text-green-600" /></div>
                <h3 className="text-xl font-semibold mb-2 text-gray-800">Đánh giá tin cậy</h3>
                <p className="text-gray-600">Xem đánh giá từ cộng đồng để chọn sân tốt nhất</p>
            </div>
        </div>
    </div>

    <div className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-center mb-12 text-gray-800">Các chi nhánh FuFu</h2>
            {loading ? (<div className="text-center py-10 text-lg text-green-600">Đang tải dữ liệu...</div>) : fields.length === 0 ? (<div className="text-center py-10 text-lg text-gray-500">Không tìm thấy sân bóng nào.</div>) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {fields.map(field => (
                        <div key={field.SanID} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition cursor-pointer" onClick={() => { setSelectedField(field); setCurrentView('detail'); }}>
                            <img src={field.HinhAnh} alt={field.TenSan} className="w-full h-48 object-cover" />
                            <div className="p-4">
                                <h3 className="text-xl font-semibold mb-2 text-gray-800">{field.TenSan}</h3>
                                <div className="flex items-center text-gray-600 mb-2"><MapPin className="w-4 h-4 mr-1" /><span className="text-sm">{field.DiaChi}</span></div>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center"><Star className="w-4 h-4 text-yellow-400 fill-current mr-1" /><span className="text-sm font-semibold">{field.DiemDanhGia}</span><span className="text-sm text-gray-500 ml-1">({field.SoLuotReview} đánh giá)</span></div>
                                    <span className="text-sm text-gray-600">{field.LoaiSan}</span>
                                </div>
                                <div className="text-green-600 font-bold">Từ 180.000đ/giờ</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    </div>
  </div>
);

const SearchPage = ({ fields, loading, setSelectedField, setCurrentView }) => (
  <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold mb-6 text-gray-800">Kết quả tìm kiếm</h1>
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
               <div className="flex items-center mb-4"><Filter className="w-5 h-5 text-gray-600 mr-2" /><h2 className="text-lg font-semibold text-gray-800">Bộ lọc</h2></div>
               <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <select className="border p-2 rounded"><option>Loại sân</option></select>
                  <select className="border p-2 rounded"><option>Giá</option></select>
                  <select className="border p-2 rounded"><option>Đánh giá</option></select>
                  <button className="bg-green-600 text-white rounded p-2">Áp dụng</button>
               </div>
          </div>
          <div className="grid grid-cols-1 gap-6">
                {fields.map(field => (
                  <div key={field.SanID} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition cursor-pointer" onClick={() => { setSelectedField(field); setCurrentView('detail'); }}>
                    <div className="md:flex">
                        <img src={field.HinhAnh} className="w-full md:w-64 h-48 object-cover" />
                        <div className="p-6 flex-1">
                            <h3 className="text-2xl font-semibold text-gray-800">{field.TenSan}</h3>
                            <div className="flex items-center text-gray-600 mb-3"><MapPin className="w-4 h-4 mr-1" /><span>{field.DiaChi}</span></div>
                            <div className="flex justify-between items-center mt-4">
                                <div className="text-green-600 font-bold text-xl">Đặt sân để xem giá</div>
                                <button className="bg-green-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-green-700">Xem chi tiết</button>
                            </div>
                        </div>
                    </div>
                  </div>
                ))}
          </div>
      </div>
  </div>
);

const FieldDetailPage = ({ selectedField, setCurrentView, isLoggedIn, searchFilters, setSearchFilters, bookingInfo, setBookingInfo, busySlots, currentUser }) => {
  const isConflict = checkConflict(bookingInfo.startTime, bookingInfo.endTime, busySlots);
  const isPastConflict = checkPastTimeConflict(searchFilters.date, bookingInfo.startTime);
  
  const [reviews, setReviews] = useState([]);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
      if (selectedField) {
          fetch(`http://localhost:5000/api/reviews?sanId=${selectedField.SanID}`)
              .then(res => res.json()).then(setReviews).catch(console.error);
      }
  }, [selectedField]);

  const handleSubmitReview = async () => {
      if (!isLoggedIn) { alert("Vui lòng đăng nhập để đánh giá!"); return; }
      if (!newComment.trim()) { alert("Vui lòng nhập nội dung!"); return; }
      try {
          const res = await fetch('http://localhost:5000/api/reviews', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ SanID: selectedField.SanID, NguoiDung: currentUser.name, NoiDung: newComment, SoSao: newRating })
          });
          if (res.ok) { 
              alert("Cảm ơn bạn đã đánh giá!"); 
              setNewComment(''); 
              fetch(`http://localhost:5000/api/reviews?sanId=${selectedField.SanID}`).then(res => res.json()).then(setReviews);
          }
      } catch (e) { alert("Lỗi gửi đánh giá"); }
  };

  if (!selectedField) return null;
  
  return (
    <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <button onClick={() => setCurrentView('search')} className="mb-6 text-green-600 hover:text-green-700 font-medium flex items-center">← Quay lại danh sách</button>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                        <img src={selectedField.HinhAnh} className="w-full h-64 object-cover rounded-lg mb-4" />
                        <h1 className="text-3xl font-bold text-gray-800">{selectedField.TenSan}</h1>
                        <div className="flex items-center mb-4"><Star className="w-5 h-5 text-yellow-400 fill-current mr-1" /><span className="font-semibold mr-2">{selectedField.DiemDanhGia?.toFixed(1)}</span><span className="text-gray-600">({selectedField.SoLuotReview} đánh giá)</span></div>
                        <div className="space-y-3 mb-6">
                            <div className="flex items-center text-gray-700"><MapPin className="w-5 h-5 mr-3 text-green-600" /><span>{selectedField.DiaChi}</span></div>
                            <div className="flex items-center text-gray-700"><Phone className="w-5 h-5 mr-3 text-green-600" /><span>Chủ sân: Phùng Vĩnh Phước - 0328665619</span></div>
                        </div>
                        <h3 className="text-xl font-semibold mb-3 text-gray-800">Tiện ích</h3>
                        <div className="flex flex-wrap gap-2 mb-6">{selectedField.TienIch && selectedField.TienIch.split(',').map((t, i) => <span key={i} className="bg-green-50 text-green-700 px-4 py-2 rounded-lg border border-green-200">{t}</span>)}</div>
                        
                        <h3 className="text-xl font-semibold mb-3 text-gray-800 border-t pt-4">Đánh giá từ cầu thủ</h3>
                        <div className="space-y-4 mb-6 max-h-60 overflow-y-auto">
                            {reviews.map((r, i) => (
                                <div key={i} className="bg-gray-50 p-3 rounded border-l-4 border-green-500">
                                    <div className="flex justify-between"><strong>{r.NguoiDung}</strong><span className="text-yellow-500">{'★'.repeat(r.SoSao)}</span></div>
                                    <p className="text-gray-600 mt-1 text-sm">{r.NoiDung}</p>
                                </div>
                            ))}
                        </div>

                        {isLoggedIn && (
                            <div className="bg-green-50 p-4 rounded border border-green-200">
                                <h4 className="font-bold text-green-800 mb-2">Viết đánh giá của bạn</h4>
                                <div className="flex items-center mb-2">
                                    <span className="mr-2">Chọn sao:</span>
                                    {[1,2,3,4,5].map(s => <button key={s} onClick={()=>setNewRating(s)} className={`text-2xl ${s<=newRating?'text-yellow-400':'text-gray-300'}`}>★</button>)}
                                </div>
                                <textarea className="w-full p-2 border rounded mb-2" placeholder="Nhập bình luận..." value={newComment} onChange={e=>setNewComment(e.target.value)}></textarea>
                                <button onClick={handleSubmitReview} className="bg-green-600 text-white px-4 py-2 rounded font-bold">Gửi đánh giá</button>
                            </div>
                        )}
                    </div>
                    
                    <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                        <h3 className="font-bold text-red-600 mb-2 flex items-center"><AlertCircle className="w-4 h-4 mr-2"/> Giờ bận hôm nay ({bookingInfo.fieldType}):</h3>
                        {busySlots.length === 0 ? (
                            <p className="text-green-600 text-sm">{bookingInfo.fieldType} trống cả ngày!</p>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {busySlots.map((slot, idx) => (
                                    <span key={idx} className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">{slot.start} - {slot.end}</span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="lg:col-span-1">
                    <div className="bg-white rounded-lg shadow-md p-6 sticky top-24">
                        <h2 className="text-2xl font-bold mb-4 text-gray-800">Đặt sân ngay</h2>
                        {!isLoggedIn ? (
                            <div className="text-center bg-red-50 p-4 rounded text-red-600 mb-4">Bạn phải đăng nhập mới được đặt sân!<button onClick={() => setCurrentView('login')} className="block w-full bg-green-600 text-white py-2 mt-2 rounded font-bold">Đăng nhập ngay</button></div>
                        ) : (
                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-bold text-gray-700 mb-2 block">Chọn loại sân:</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button onClick={() => setBookingInfo({...bookingInfo, fieldType: 'Sân 5'})} className={`py-2 rounded-lg border-2 font-bold flex items-center justify-center ${bookingInfo.fieldType === 'Sân 5' ? 'border-green-600 bg-green-50 text-green-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}><Users className="w-4 h-4 mr-2"/> Sân 5</button>
                                        <button onClick={() => setBookingInfo({...bookingInfo, fieldType: 'Sân 7'})} className={`py-2 rounded-lg border-2 font-bold flex items-center justify-center ${bookingInfo.fieldType === 'Sân 7' ? 'border-green-600 bg-green-50 text-green-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}><Users className="w-4 h-4 mr-2"/> Sân 7</button>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-sm font-bold text-gray-700">Ngày đá</label>
                                    <input type="date" className="w-full border rounded p-2" value={searchFilters.date} onChange={(e) => setSearchFilters({...searchFilters, date: e.target.value})} />
                                    {new Date(searchFilters.date).getDate() === 14 && <div className="text-xs text-red-500 font-bold mt-1">🎉 Ngày 14 giảm 10%!</div>}
                                </div>
                                <div className="flex space-x-2">
                                    <div className="w-1/2"><label className="text-sm font-bold text-gray-700">Bắt đầu</label><input type="time" className="w-full border rounded p-2" value={bookingInfo.startTime} onChange={(e) => setBookingInfo({...bookingInfo, startTime: e.target.value})} /></div>
                                    <div className="w-1/2"><label className="text-sm font-bold text-gray-700">Kết thúc</label><input type="time" className="w-full border rounded p-2" value={bookingInfo.endTime} onChange={(e) => setBookingInfo({...bookingInfo, endTime: e.target.value})} /></div>
                                </div>
                                
                                {(isConflict || isPastConflict) && (
                                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
                                        <strong className="font-bold">Lỗi!</strong>
                                        {isPastConflict ? (<span className="block sm:inline"> Giờ này đã trôi qua.</span>) : (<span className="block sm:inline"> Giờ đã bị trùng cho {bookingInfo.fieldType}.</span>)}
                                    </div>
                                )}

                                <input type="text" placeholder="Họ và tên" className="w-full border border-gray-300 rounded-lg px-4 py-2" value={bookingInfo.name} onChange={(e) => setBookingInfo({...bookingInfo, name: e.target.value})} />
                                <input type="tel" placeholder="Số điện thoại" className="w-full border border-gray-300 rounded-lg px-4 py-2" value={bookingInfo.phone} onChange={(e) => setBookingInfo({...bookingInfo, phone: e.target.value.replace(/[^0-9]/g, '')})} />
                                <div className="bg-green-50 p-4 rounded border border-green-200 text-center"><div className="text-gray-600">Tổng tiền tạm tính ({bookingInfo.fieldType})</div><div className="text-2xl font-bold text-green-700">{new Intl.NumberFormat('vi-VN').format(bookingInfo.totalPrice)}đ</div></div>
                                
                                <button 
                                    onClick={() => { if (!isConflict && !isPastConflict && bookingInfo.totalPrice > 0 && bookingInfo.name && bookingInfo.phone) setCurrentView('payment'); else alert("Kiểm tra lại thông tin hoặc giờ đặt!"); }} 
                                    disabled={isConflict || isPastConflict} 
                                    className={`w-full text-white py-3 rounded-lg font-semibold transition ${(isConflict || isPastConflict) ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
                                >
                                    {isPastConflict ? 'Giờ đã qua' : isConflict ? 'Giờ này đã kín' : 'Tiếp tục thanh toán'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};

const PaymentPage = ({ bookingInfo, setCurrentView, showQR, setShowQR, qrTimer, setQrTimer, selectedField, searchFilters, saveBooking }) => (
  <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold mb-6 text-gray-800">Thanh toán</h1>
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">Thông tin đặt sân</h2>
              <div className="space-y-4 text-gray-700">
                  <p><strong>Sân:</strong> {selectedField?.TenSan}</p>
                  <p><strong>Loại sân:</strong> <span className="font-bold text-green-600">{bookingInfo.fieldType}</span></p>
                  <p><strong>Ngày:</strong> {searchFilters.date}</p>
                  <p><strong>Giờ:</strong> {bookingInfo.startTime} - {bookingInfo.endTime}</p>
                  <p><strong>Tên:</strong> {bookingInfo.name}</p>
                  <p><strong>SĐT:</strong> {bookingInfo.phone}</p>
                  <p className="text-xl font-bold text-green-600">Tổng: {new Intl.NumberFormat('vi-VN').format(bookingInfo.totalPrice)}đ</p>
              </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">Phương thức thanh toán</h2>
              {!showQR ? (
                  <div className="space-y-3">
                      <button onClick={() => {setShowQR(true); setQrTimer(180)}} className="w-full flex items-center p-4 border rounded-lg hover:border-green-600 bg-green-50"><CreditCard className="w-6 h-6 text-green-600 mr-3" /><div className="text-left"><div className="font-bold text-green-700">Thanh toán qua QR Code (Khuyên dùng)</div><div className="text-sm text-gray-500">Chủ TK: Phùng Vĩnh Phước</div></div></button>
                      <button onClick={() => { saveBooking(); }} className="w-full flex items-center p-4 border rounded-lg hover:border-green-600"><Home className="w-6 h-6 text-gray-600 mr-3" /><div className="text-left"><div className="font-bold text-gray-700">Thanh toán tại sân</div><div className="text-sm text-gray-500">Đặt cọc tiền mặt khi đến</div></div></button>
                  </div>
              ) : (
                  <div className="text-center animate-pulse">
                      <div className="text-red-500 font-bold mb-2">Mã hiệu lực trong: {Math.floor(qrTimer/60)}:{qrTimer%60 < 10 ? '0'+qrTimer%60 : qrTimer%60}</div>
                      <img src="https://img.vietqr.io/image/TCB-19070002837012-qr_only.jpg?accountName=PHUNG%20VINH%20PHUOC" className="mx-auto border-2 border-green-500 rounded-lg mb-2 w-64" alt="QR" />
                      <p className="font-bold">PHUNG VINH PHUOC</p>
                      <p className="mb-4">Nội dung: {bookingInfo.phone}</p>
                      <button onClick={() => { saveBooking(); }} className="bg-green-600 text-white px-6 py-2 rounded font-bold">Đã thanh toán xong</button>
                  </div>
              )}
          </div>
          {!showQR && (<div className="flex space-x-4"><button onClick={() => setCurrentView('detail')} className="w-1/3 border border-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-50">Quay lại</button></div>)}
      </div>
  </div>
);

const LoginPage = ({ authMode, setAuthMode, handleLogin, setCurrentView }) => {
  const [inputPhone, setInputPhone] = useState('');
  const [inputPassword, setInputPassword] = useState(''); 
  const [inputName, setInputName] = useState(''); 
  const [inputEmail, setInputEmail] = useState(''); 
  const [inputAddress, setInputAddress] = useState('');
  
  const handleForgotPassword = async () => {
      if (!inputEmail) { alert("Vui lòng nhập Email đã đăng ký!"); return; }
      try {
          alert("Đang gửi yêu cầu... Vui lòng đợi trong giây lát.");
          const res = await fetch('http://localhost:5000/api/auth/forgot-password', {
              method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: inputEmail })
          });
          const data = await res.json();
          alert(data.message);
          if (res.ok) setAuthMode('login');
      } catch (e) { alert("Lỗi kết nối: " + e.message); }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <div className="text-center mb-8"><div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4"><span className="text-white font-bold text-2xl">F</span></div><h1 className="text-2xl font-bold text-gray-800">{authMode === 'login' ? 'Đăng Nhập' : authMode === 'register' ? 'Đăng Ký' : 'Quên Mật Khẩu'}</h1></div>
        <div className="space-y-4">
          
          {authMode === 'forgot' ? (
              <>
                <p className="text-sm text-gray-600 mb-2">Nhập email của bạn để nhận mật khẩu mới:</p>
                <input type="email" className="w-full border border-gray-300 rounded-lg px-4 py-2" placeholder="Email đã đăng ký" value={inputEmail} onChange={(e) => setInputEmail(e.target.value)} />
                <button onClick={handleForgotPassword} className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700">Gửi lại mật khẩu</button>
              </>
          ) : (
              <>
                {authMode === 'register' && (
                    <>
                      <input type="text" className="w-full border border-gray-300 rounded-lg px-4 py-2" placeholder="Họ và tên" value={inputName} onChange={(e) => setInputName(e.target.value)} />
                      <input type="email" className="w-full border border-gray-300 rounded-lg px-4 py-2" placeholder="Email" value={inputEmail} onChange={(e) => setInputEmail(e.target.value)} />
                      <input type="text" className="w-full border border-gray-300 rounded-lg px-4 py-2" placeholder="Địa chỉ" value={inputAddress} onChange={(e) => setInputAddress(e.target.value)} />
                    </>
                )}

                <input type="text" className="w-full border border-gray-300 rounded-lg px-4 py-2" placeholder={authMode === 'register' ? "Số điện thoại" : "Số điện thoại / Email"} value={inputPhone} onChange={(e) => setInputPhone(e.target.value)} />
                <input type="password" className="w-full border border-gray-300 rounded-lg px-4 py-2" placeholder="Mật khẩu" value={inputPassword} onChange={(e) => setInputPassword(e.target.value)} />
                
                <button onClick={() => {
                    if (inputPhone.trim() === '' || inputPassword.trim() === '') { alert("Vui lòng nhập đầy đủ thông tin!"); return; }
                    if (authMode === 'register') {
                        if (inputName.trim() === '') { alert("Vui lòng nhập Họ tên!"); return; }
                        handleLogin(inputPhone, inputPassword, inputName, true, inputEmail, inputAddress); 
                    } else { 
                        handleLogin(inputPhone, inputPassword); 
                    }
                }} className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700">{authMode === 'login' ? 'Đăng nhập' : 'Đăng ký'}</button>
              </>
          )}
          
          <div className="text-center text-sm space-y-2 mt-4">
              {authMode === 'login' && (
                  <>
                    <p onClick={() => setAuthMode('forgot')} className="text-green-600 cursor-pointer hover:underline">Quên mật khẩu?</p>
                    <p onClick={() => setAuthMode('register')} className="text-gray-600 cursor-pointer hover:text-green-600">Chưa có tài khoản? Đăng ký ngay</p>
                  </>
              )}
              {authMode !== 'login' && (
                  <p onClick={() => setAuthMode('login')} className="text-green-600 cursor-pointer hover:underline">Quay lại đăng nhập</p>
              )}
          </div>
          
          <button onClick={() => setCurrentView('home')} className="w-full text-gray-400 text-sm mt-2">Về trang chủ</button>
        </div>
      </div>
    </div>
  );
};

const HistoryPage = ({ setCurrentView, history, clearHistory }) => (
  <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-6"><h1 className="text-3xl font-bold text-gray-800">Lịch sử đặt sân</h1>{history.length > 0 && (<button onClick={clearHistory} className="text-red-500 flex items-center hover:underline"><Trash2 className="w-4 h-4 mr-1"/> Xóa lịch sử</button>)}</div>
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
              {history.length === 0 ? (<div className="p-10 text-center text-gray-500">Chưa có lịch sử đặt sân nào. Hãy đặt sân ngay!</div>) : (
                  <div className="divide-y divide-gray-200">
                      {history.map((item, index) => (
                          <div key={index} className="p-6 hover:bg-gray-50 flex justify-between items-center">
                              <div><h3 className="font-bold text-lg text-gray-800">{item.san} ({item.sanType || 'Sân 5'})</h3><p className="text-gray-600">Ngày: {item.ngay} | Giờ: {item.gio}</p><p className="text-sm text-gray-500">Người đặt: {item.nguoiDat} - {item.sdt}</p></div>
                              <div className="text-right"><div className="text-green-600 font-bold text-xl">{new Intl.NumberFormat('vi-VN').format(item.gia)}đ</div><span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">Đã thanh toán</span></div>
                          </div>
                      ))}
                  </div>
              )}
          </div>
          <button onClick={() => setCurrentView('home')} className="mt-4 text-green-600 font-medium">← Quay lại trang chủ</button>
      </div>
  </div>
);

const AdminPage = ({ fields, onAddField, onDeleteField, currentUser }) => {
    const [activeTab, setActiveTab] = useState('stats');
    const [stats, setStats] = useState({});
    const [users, setUsers] = useState([]);
    const [reviews, setReviews] = useState([]);
    const [bookings, setBookings] = useState([]);
    
    // State cho Thêm/Sửa
    const [isEditing, setIsEditing] = useState(false);
    const [currentFieldId, setCurrentFieldId] = useState(null);
    const [fieldForm, setFieldForm] = useState({ TenSan: '', DiaChi: '', GiaTheoGio: 200000, LoaiSan: 'Sân 5', HinhAnh: '', MoTa: '', TienIch: '' });

    // Chat Admin
    const [chatUsers, setChatUsers] = useState([]);
    const [selectedChatUser, setSelectedChatUser] = useState(null);
    const [adminMessages, setAdminMessages] = useState([]);
    const [adminInput, setAdminInput] = useState('');

    useEffect(() => {
        fetch('http://localhost:5000/api/admin/stats').then(res=>res.json()).then(setStats);
        fetch('http://localhost:5000/api/admin/users').then(res=>res.json()).then(setUsers);
        fetch('http://localhost:5000/api/admin/reviews').then(res=>res.json()).then(setReviews);
        fetch('http://localhost:5000/api/bookings-list').then(res=>res.json()).then(setBookings);
        fetch('http://localhost:5000/api/messages').then(res=>res.json()).then(setChatUsers);
    }, []);

    // Polling chat
    useEffect(() => {
        if(activeTab === 'chat' && selectedChatUser) {
            const interval = setInterval(async () => {
                const res = await fetch(`http://localhost:5000/api/messages?userId=${selectedChatUser.KhachHangID}`);
                if(res.ok) {
                    setAdminMessages(await res.json());
                    // Mark as read
                    fetch('http://localhost:5000/api/messages/read', { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ userId: selectedChatUser.KhachHangID, isAdminViewer: true }) });
                }
            }, 3000);
            return () => clearInterval(interval);
        }
    }, [activeTab, selectedChatUser]);

    const sendAdminMessage = async () => {
        if(!adminInput) return;
        await fetch('http://localhost:5000/api/messages', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ userId: selectedChatUser.KhachHangID, content: adminInput, isAdmin: true }) });
        setAdminInput('');
    };

    // Hàm mở form sửa
    const handleEditClick = (field) => { setIsEditing(true); setCurrentFieldId(field.SanID); setFieldForm(field); setActiveTab('fields'); };
    const resetForm = () => { setIsEditing(false); setCurrentFieldId(null); setFieldForm({ TenSan: '', DiaChi: '', GiaTheoGio: 200000, LoaiSan: 'Sân 5', HinhAnh: '', MoTa: '', TienIch: '' }); };

    // Hàm lưu (Thêm hoặc Sửa)
    const handleSaveField = async () => {
        if (!fieldForm.TenSan || !fieldForm.DiaChi) { alert("Nhập thiếu thông tin!"); return; }
        const url = isEditing ? `http://localhost:5000/api/sanbong/${currentFieldId}` : 'http://localhost:5000/api/sanbong';
        const method = isEditing ? 'PUT' : 'POST';
        try {
            const res = await fetch(url, { method: method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fieldForm) });
            if (res.ok) { alert(isEditing ? "Cập nhật thành công!" : "Thêm sân thành công!"); resetForm(); window.location.reload(); }
        } catch (e) { alert("Lỗi lưu dữ liệu"); }
    };

    const renderContent = () => {
        switch(activeTab) {
            case 'stats': return ( <div className="grid grid-cols-3 gap-6 mb-6"><div className="bg-white p-6 rounded shadow"><h3 className="text-gray-500">Tổng doanh thu (Ước tính)</h3><p className="text-3xl font-bold text-green-600">{new Intl.NumberFormat('vi-VN').format(stats.TotalBookings * 200000)}đ</p></div><div className="bg-white p-6 rounded shadow"><h3 className="text-gray-500">Tổng đơn đặt</h3><p className="text-3xl font-bold">{stats.TotalBookings}</p></div><div className="bg-white p-6 rounded shadow"><h3 className="text-gray-500">Thành viên</h3><p className="text-3xl font-bold">{stats.TotalUsers}</p></div></div> );
            case 'fields': return (
                <div>
                    <h2 className="text-xl font-bold mb-4">{isEditing ? 'Chỉnh sửa sân' : 'Thêm sân mới'}</h2>
                    <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input className="border p-2 rounded" placeholder="Tên sân" value={fieldForm.TenSan} onChange={e => setFieldForm({...fieldForm, TenSan: e.target.value})} />
                            <input className="border p-2 rounded" placeholder="Địa chỉ" value={fieldForm.DiaChi} onChange={e => setFieldForm({...fieldForm, DiaChi: e.target.value})} />
                            <input className="border p-2 rounded" type="number" placeholder="Giá/giờ" value={fieldForm.GiaTheoGio} onChange={e => setFieldForm({...fieldForm, GiaTheoGio: e.target.value})} />
                            <select className="border p-2 rounded" value={fieldForm.LoaiSan} onChange={e => setFieldForm({...fieldForm, LoaiSan: e.target.value})}><option>Sân 5</option><option>Sân 7</option><option>Sân 5, Sân 7</option></select>
                            <input className="border p-2 rounded" placeholder="Link hình ảnh" value={fieldForm.HinhAnh} onChange={e => setFieldForm({...fieldForm, HinhAnh: e.target.value})} />
                            <input className="border p-2 rounded" placeholder="Tiện ích" value={fieldForm.TienIch} onChange={e => setFieldForm({...fieldForm, TienIch: e.target.value})} />
                        </div>
                        <textarea className="border p-2 rounded w-full mt-4" placeholder="Mô tả..." value={fieldForm.MoTa} onChange={e => setFieldForm({...fieldForm, MoTa: e.target.value})} />
                        <div className="mt-4 flex space-x-2"><button onClick={handleSaveField} className="bg-green-600 text-white px-6 py-2 rounded font-bold">{isEditing ? 'Cập nhật' : 'Lưu mới'}</button>{isEditing && <button onClick={resetForm} className="bg-gray-500 text-white px-6 py-2 rounded">Hủy</button>}</div>
                    </div>
                    <h3 className="font-bold mb-2">Danh sách sân</h3>
                    <div className="bg-white rounded shadow overflow-hidden"><table className="min-w-full divide-y divide-gray-200"><thead className="bg-gray-50"><tr><th className="px-6 py-3 text-left">Tên sân</th><th className="px-6 py-3 text-left">Giá</th><th className="px-6 py-3 text-right">Thao tác</th></tr></thead><tbody className="bg-white divide-y divide-gray-200">{fields.map(f => (<tr key={f.SanID}><td className="px-6 py-4">{f.TenSan}</td><td className="px-6 py-4 text-green-600 font-bold">{new Intl.NumberFormat('vi-VN').format(f.GiaTheoGio)}đ</td><td className="px-6 py-4 text-right"><button onClick={() => handleEditClick(f)} className="text-blue-600 font-bold mr-3"><Edit className="w-4 h-4 inline"/> Sửa</button><button onClick={() => onDeleteField(f.SanID)} className="text-red-600 font-bold"><Trash2 className="w-4 h-4 inline"/> Xóa</button></td></tr>))}</tbody></table></div>
                </div>
            );
            case 'bookings': return ( <div className="bg-white rounded shadow overflow-hidden"><table className="min-w-full divide-y divide-gray-200"><thead className="bg-gray-50"><tr><th className="px-6 py-3 text-left">Sân</th><th className="px-6 py-3 text-left">Khách</th><th className="px-6 py-3 text-left">Ngày/Giờ</th><th className="px-6 py-3">TT</th></tr></thead><tbody className="bg-white divide-y divide-gray-200">{bookings.map(b=>(<tr key={b.LichDatID}><td className="px-6 py-4">{b.TenSan} ({b.LoaiSan})</td><td className="px-6 py-4">{b.KhachHangName}<br/><span className="text-xs text-gray-500">{b.KhachHangPhone}</span></td><td className="px-6 py-4">{new Date(b.NgayDat).toLocaleDateString('vi-VN')}<br/>{b.GioBatDau}-{b.GioKetThuc}</td><td className="px-6 py-4"><span className="bg-green-100 text-green-800 px-2 rounded text-xs">{b.TinhTrang}</span></td></tr>))}</tbody></table></div> );
            case 'users': return ( <div className="bg-white rounded shadow overflow-hidden"><table className="min-w-full divide-y divide-gray-200"><thead className="bg-gray-50"><tr><th className="px-6 py-3 text-left">Tên</th><th className="px-6 py-3 text-left">SĐT</th><th className="px-6 py-3 text-left">Email</th><th className="px-6 py-3 text-left">Địa chỉ</th></tr></thead><tbody className="bg-white divide-y divide-gray-200">{users.map(u=>(<tr key={u.KhachHangID}><td className="px-6 py-4">{u.FullName}</td><td className="px-6 py-4">{u.Phone}</td><td className="px-6 py-4">{u.Email}</td><td className="px-6 py-4">{u.DiaChi}</td></tr>))}</tbody></table></div> );
            case 'reviews': return ( <div className="space-y-4">{reviews.map(r=>(<div key={r.ReviewID} className="bg-white p-4 rounded shadow border-l-4 border-yellow-400"><div className="flex justify-between"><strong>{r.NguoiDung}</strong><span className="text-yellow-500">{'★'.repeat(r.SoSao)}</span></div><p className="text-gray-600 mt-1">{r.NoiDung}</p><div className="text-xs text-gray-400 mt-2">Sân: {r.TenSan}</div></div>))}</div> );
            case 'chat': return (
                <div className="flex h-[500px] bg-white rounded shadow border">
                    <div className="w-1/3 border-r overflow-y-auto">
                        {chatUsers.map(u => (
                            <div key={u.KhachHangID} onClick={() => setSelectedChatUser(u)} className={`p-4 border-b cursor-pointer hover:bg-gray-50 ${selectedChatUser?.KhachHangID === u.KhachHangID ? 'bg-blue-50' : ''}`}>
                                <div className="font-bold">{u.FullName}</div>
                                {u.UnreadCount > 0 && <span className="text-xs bg-red-500 text-white px-2 rounded-full">{u.UnreadCount} mới</span>}
                            </div>
                        ))}
                    </div>
                    <div className="w-2/3 flex flex-col">
                        {selectedChatUser ? (
                            <>
                                <div className="p-3 border-b font-bold bg-gray-50">Chat với: {selectedChatUser.FullName}</div>
                                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                                    {adminMessages.map((m, i) => (
                                        <div key={i} className={`flex ${m.IsAdminSender ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`p-2 rounded max-w-[70%] ${m.IsAdminSender ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>{m.NoiDung}</div>
                                        </div>
                                    ))}
                                </div>
                                <div className="p-3 border-t flex">
                                    <input className="flex-1 border rounded px-2" value={adminInput} onChange={e=>setAdminInput(e.target.value)}/>
                                    <button onClick={sendAdminMessage} className="ml-2 bg-blue-600 text-white px-4 rounded">Gửi</button>
                                </div>
                            </>
                        ) : <div className="flex items-center justify-center h-full text-gray-500">Chọn khách hàng để chat</div>}
                    </div>
                </div>
            );
            default: return null;
        }
    };

    return (
        <div className="flex min-h-screen bg-gray-100">
            <div className="w-64 bg-gray-800 text-white flex-shrink-0">
                <div className="p-4 font-bold text-xl border-b border-gray-700">Admin Panel</div>
                <nav className="mt-4">{[{id:'stats', icon: BarChart2, label: 'Thống kê'}, {id:'fields', icon: LayoutDashboard, label: 'Quản lý Sân'}, {id:'bookings', icon: Calendar, label: 'Lịch đặt'}, {id:'users', icon: Users, label: 'Khách hàng'}, {id:'reviews', icon: Star, label: 'Đánh giá'}, {id:'chat', icon: MessageSquare, label: 'Tin nhắn'}].map(item => (<button key={item.id} onClick={()=>setActiveTab(item.id)} className={`w-full flex items-center p-4 hover:bg-gray-700 ${activeTab===item.id ? 'bg-gray-700 border-l-4 border-green-500' : ''}`}><item.icon className="w-5 h-5 mr-3"/> {item.label}</button>))}</nav>
            </div>
            <div className="flex-1 p-8 overflow-y-auto">{renderContent()}</div>
        </div>
    );
};

// --- MAIN APP ---
const FootballBookingApp = () => {
  const [currentView, setCurrentView] = useState('home');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null); 
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [selectedField, setSelectedField] = useState(null);
  const [history, setHistory] = useState([]); 
  const [showChat, setShowChat] = useState(false);
  const [showPromo, setShowPromo] = useState(false);
  
  // State Notification
  const [unreadCount, setUnreadCount] = useState(0);

  const [searchFilters, setSearchFilters] = useState({ location: '', date: new Date().toISOString().split('T')[0], time: '', fieldType: '', priceRange: '', rating: '' });
  const [bookingInfo, setBookingInfo] = useState({ name: '', phone: '', startTime: '', endTime: '', fieldType: 'Sân 5', totalPrice: 0, selectedSlot: null });
  const [fields, setFields] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState('login'); 
  const [showQR, setShowQR] = useState(false);
  const [qrTimer, setQrTimer] = useState(60);
  const [busySlots, setBusySlots] = useState([]); 

  const fetchFields = async () => { try { const response = await fetch('http://localhost:5000/api/sanbong'); if (!response.ok) throw new Error('Err'); const data = await response.json(); setFields(data); setLoading(false); } catch (error) { console.error("Lỗi data:", error); setLoading(false); } };
  
  // Fetch unread messages
  const fetchUnread = async () => {
      if(currentUser && currentUser.role !== 'admin') {
          try {
              const res = await fetch(`http://localhost:5000/api/messages?userId=${currentUser.id}`);
              if(res.ok) {
                  const msgs = await res.json();
                  const count = msgs.filter(m => m.IsAdminSender && !m.IsRead).length;
                  setUnreadCount(count);
              }
          } catch(e){}
      }
  };

  useEffect(() => {
      const interval = setInterval(fetchUnread, 3000);
      return () => clearInterval(interval);
  }, [currentUser]);

  useEffect(() => { if(selectedField && searchFilters.date) { const fetchBusy = async () => { try { const res = await fetch(`http://localhost:5000/api/check-trung-gio?sanId=${selectedField.SanID}&ngay=${searchFilters.date}&loaiSan=${bookingInfo.fieldType}`); if(res.ok) { const data = await res.json(); setBusySlots(data); } } catch (e) { console.error(e); } }; fetchBusy(); } }, [selectedField, searchFilters.date, bookingInfo.fieldType]); 
  useEffect(() => { const savedUser = localStorage.getItem('currentUser'); if (savedUser) { const user = JSON.parse(savedUser); setCurrentUser(user); setIsLoggedIn(true); if(user.phone === 'admin') setCurrentView('admin'); const savedHistory = localStorage.getItem('bookingHistory_' + user.phone); if (savedHistory) setHistory(JSON.parse(savedHistory)); } fetchFields(); }, []);

  const handleLogin = async (phone, password, name = '', isRegister = false, email = '', address = '') => {
      const endpoint = isRegister ? 'register' : 'login';
      const body = isRegister ? { phone, password, fullName: name, email, address } : { phone, password };
      try {
          const res = await fetch(`http://localhost:5000/api/auth/${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
          const result = await res.json();
          if (!res.ok) { alert(`Lỗi: ${result.message}`); return false; }
          if (isRegister) { alert('Đăng ký thành công! Vui lòng đăng nhập.'); setAuthMode('login'); return true; }
          const user = result.user; localStorage.setItem('currentUser', JSON.stringify(user)); setCurrentUser(user); setIsLoggedIn(true); const savedHistory = localStorage.getItem('bookingHistory_' + user.phone); if (savedHistory) setHistory(JSON.parse(savedHistory)); setCurrentView(user.role === 'admin' ? 'admin' : 'home'); return true;
      } catch (e) { alert(`Lỗi kết nối server.`); console.error(e); return false; }
  };

  const handleLogout = () => { localStorage.removeItem('currentUser'); setIsLoggedIn(false); setCurrentUser(null); setHistory([]); setCurrentView('login'); window.location.reload(); };
  
  const saveBooking = async () => { try { const res = await fetch('http://localhost:5000/api/dat-san', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ SanID: selectedField.SanID, NgayDat: searchFilters.date, GioBatDau: bookingInfo.startTime, GioKetThuc: bookingInfo.endTime, TenKhach: bookingInfo.name, SDT: bookingInfo.phone, LoaiSan: bookingInfo.fieldType }) }); if(!res.ok) alert("Có lỗi khi lưu vào Database."); } catch(e) { console.error("Lỗi lưu DB", e); } const newBooking = { san: selectedField.TenSan, sanType: bookingInfo.fieldType, ngay: searchFilters.date, gio: `${bookingInfo.startTime} - ${bookingInfo.endTime}`, gia: bookingInfo.totalPrice, nguoiDat: bookingInfo.name, sdt: bookingInfo.phone, timestamp: new Date().toISOString() }; const updatedHistory = [...history, newBooking]; setHistory(updatedHistory); localStorage.setItem('bookingHistory_' + currentUser.phone, JSON.stringify(updatedHistory)); alert('Thanh toán thành công! Sân đã được lưu.'); setCurrentView('home'); setShowQR(false); window.location.reload(); };
  
  const clearHistory = () => { if(window.confirm("Xóa lịch sử?")) { setHistory([]); localStorage.removeItem('bookingHistory_' + currentUser.phone); } };
  const handleAddField = async (newFieldData) => { try { const res = await fetch('http://localhost:5000/api/sanbong', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newFieldData) }); if(res.ok) { alert('Thêm sân thành công!'); fetchFields(); } } catch (err) { alert('Lỗi thêm sân'); } };
  const handleDeleteField = async (id) => { if(!window.confirm("Xóa sân này?")) return; try { const res = await fetch(`http://localhost:5000/api/sanbong/${id}`, { method: 'DELETE' }); if(res.ok) { alert('Đã xóa sân!'); fetchFields(); } } catch (err) { alert('Lỗi xóa sân'); } };

  useEffect(() => { let interval; if (showQR && qrTimer > 0) interval = setInterval(() => setQrTimer(prev => prev - 1), 1000); else if (qrTimer === 0) { alert("Hết thời gian!"); setShowQR(false); setQrTimer(60); } return () => clearInterval(interval); }, [showQR, qrTimer]);
  useEffect(() => { if (bookingInfo.startTime && bookingInfo.endTime) { const price = calculateComplexPrice(searchFilters.date, bookingInfo.startTime, bookingInfo.endTime, bookingInfo.fieldType); setBookingInfo(prev => ({ ...prev, totalPrice: price })); } }, [bookingInfo.startTime, bookingInfo.endTime, searchFilters.date, bookingInfo.fieldType]);

  return (
    <div className="font-sans text-gray-900">
      {currentView !== 'login' && <Header currentView={currentView} setCurrentView={setCurrentView} isLoggedIn={isLoggedIn} handleLogout={handleLogout} showMobileMenu={showMobileMenu} setShowMobileMenu={setShowMobileMenu} currentUser={currentUser} onOpenChat={() => {if(isLoggedIn) setShowChat(true); else alert("Vui lòng đăng nhập để chat!");}} />}
      <main>
        {currentView === 'home' && <HomePage setCurrentView={setCurrentView} searchFilters={searchFilters} setSearchFilters={setSearchFilters} fields={fields} loading={loading} setSelectedField={setSelectedField} />}
        {currentView === 'search' && <SearchPage fields={fields} loading={loading} setSelectedField={setSelectedField} setCurrentView={setCurrentView} />}
        {currentView === 'detail' && <FieldDetailPage selectedField={selectedField} setCurrentView={setCurrentView} isLoggedIn={isLoggedIn} searchFilters={searchFilters} setSearchFilters={setSearchFilters} bookingInfo={bookingInfo} setBookingInfo={setBookingInfo} busySlots={busySlots} currentUser={currentUser} />}
        {currentView === 'payment' && <PaymentPage bookingInfo={bookingInfo} setCurrentView={setCurrentView} showQR={showQR} setShowQR={setShowQR} qrTimer={qrTimer} setQrTimer={setQrTimer} selectedField={selectedField} searchFilters={searchFilters} saveBooking={saveBooking} />}
        {currentView === 'login' && <LoginPage authMode={authMode} setAuthMode={setAuthMode} handleLogin={handleLogin} setCurrentView={setCurrentView} />}
        {currentView === 'history' && <HistoryPage setCurrentView={setCurrentView} history={history} clearHistory={clearHistory} />}
        {currentView === 'admin' && <AdminPage fields={fields} onAddField={handleAddField} onDeleteField={handleDeleteField} currentUser={currentUser} />}
        {currentView === 'promotion' && <PromotionModal onClose={()=>setCurrentView('home')} />}
      </main>
      {/* Nút Chat & Chatbox */}
      {isLoggedIn && currentUser?.role !== 'admin' && !showChat && (<FloatingChatButton onClick={() => setShowChat(true)} unreadCount={unreadCount} />)}
      {showChat && <ChatBox currentUser={currentUser} onClose={() => setShowChat(false)} />}
      
      {currentView !== 'login' && <footer className="bg-gray-800 text-white py-8 mt-auto"><div className="max-w-7xl mx-auto px-4 text-center"><p className="mb-2 font-bold text-lg">@ 2025 FuFuField</p><p className="text-gray-400">Nền tảng đặt sân bóng đá hàng đầu.</p></div></footer>}
    </div>
  );
};

export default FootballBookingApp;