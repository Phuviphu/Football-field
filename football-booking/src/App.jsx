import React, { useState, useEffect, useCallback } from 'react';
import { Search, MapPin, Calendar, Clock, Star, Menu, X, User, LogIn, Phone, CreditCard, Filter, History, RefreshCw, ArrowLeft, Trash2, Plus, AlertCircle, Users, Send } from 'lucide-react';

// --- LOGIC TÍNH TOÁN & KIỂM TRA (Giữ nguyên) ---
const calculateComplexPrice = (dateStr, startStr, endStr, fieldType) => {
  if (!startStr || !endStr || !dateStr) return 0;
  const timeToDecimal = (t) => { const [h, m] = t.split(':').map(Number); return h + m / 60; };
  let start = timeToDecimal(startStr); let end = timeToDecimal(endStr);
  if (end <= start) return 0;
  let total = 0; let totalHours = 0;
  const rates = [{ start: 5, end: 11, price: 210000 }, { start: 11, end: 14, price: 180000 }, { start: 14, end: 18, price: 220000 }, { start: 18, end: 24, price: 250000 }];
  for (let rate of rates) { const overlapStart = Math.max(start, rate.start); const overlapEnd = Math.min(end, rate.end); if (overlapEnd > overlapStart) { const duration = overlapEnd - overlapStart; total += duration * rate.price; totalHours += duration; } }
  if (fieldType === 'Sân 7') total += totalHours * 50000;
  if (new Date(dateStr).getDate() === 14) total = total * 0.9;
  return total;
};
const checkConflict = (startStr, endStr, busySlots) => {
    if (!startStr || !endStr || !busySlots) return false;
    const toMinutes = (s) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; }
    const newStart = toMinutes(startStr); const newEnd = toMinutes(endStr);
    for (let slot of busySlots) { const busyStart = toMinutes(slot.start); const busyEnd = toMinutes(slot.end); if (newStart < busyEnd && newEnd > busyStart) return true; }
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

// --- COMPONENTS ---
const Header = ({ currentView, setCurrentView, isLoggedIn, handleLogout, currentUser }) => (
  <header className="bg-white shadow-md sticky top-0 z-50">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center py-4">
        <div className="flex items-center space-x-2 cursor-pointer" onClick={() => setCurrentView('home')}><div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center"><span className="text-white font-bold text-xl">F</span></div><span className="text-xl font-bold text-green-700">Sân bóng FuFu</span></div>
        {currentUser?.phone !== 'admin' && (<div className="flex items-center space-x-4 bg-gray-50 px-4 py-1 rounded-full border border-gray-100">{currentView !== 'home' && (<button onClick={() => setCurrentView('home')} className="p-1 text-gray-600 hover:text-green-600 transition" title="Quay lại"><ArrowLeft className="w-5 h-5"/></button>)}<button onClick={() => window.location.reload()} className="p-1 text-gray-600 hover:text-green-600 transition" title="Tải lại"><RefreshCw className="w-5 h-5"/></button></div>)}
        <nav className="hidden md:flex space-x-6">{currentUser?.phone === 'admin' ? (<span className="text-red-600 font-bold uppercase">Trang Quản Trị Viên</span>) : (<><button onClick={() => setCurrentView('home')} className="text-gray-700 hover:text-green-600 font-medium">Trang chủ</button><button onClick={() => setCurrentView('search')} className="text-gray-700 hover:text-green-600 font-medium">Tìm sân</button><button className="text-gray-700 hover:text-green-600 font-medium">Khuyến mãi</button><button className="text-gray-700 hover:text-green-600 font-medium">Liên hệ</button></>)}</nav>
        <div className="hidden md:flex items-center space-x-4">{isLoggedIn ? (<><span className="text-sm font-bold text-green-700">Hi, {currentUser?.name || 'Bạn'}</span>{currentUser?.phone !== 'admin' && (<button onClick={() => setCurrentView('history')} className="text-gray-700 hover:text-green-600 flex items-center space-x-1"><History className="w-5 h-5" /> <span>Lịch sử</span></button>)}<button onClick={handleLogout} className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 font-bold text-sm">Đăng xuất</button></>) : (<button onClick={() => setCurrentView('login')} className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-bold"><LogIn className="w-4 h-4" /><span>Đăng nhập</span></button>)}</div><button className="md:hidden"><Menu className="w-6 h-6" /></button>
      </div>
    </div>
  </header>
);

const HomePage = ({ setCurrentView, searchFilters, setSearchFilters, fields, loading, setSelectedField }) => (
  <div className="min-h-screen bg-gray-50">
    <div className="bg-gradient-to-r from-green-600 to-green-800 text-white"><div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20"><div className="text-center"><h1 className="text-4xl md:text-5xl font-bold mb-4">Sân chuẩn, giá tốt, chỉ cần bạn bấm</h1><p className="text-xl mb-8 text-green-100">Tìm và đặt sân bóng đá tốt nhất gần bạn chỉ với vài cú click</p><div className="bg-white rounded-lg shadow-xl p-6 max-w-4xl mx-auto"><div className="grid grid-cols-1 md:grid-cols-4 gap-4"><div className="flex items-center border border-gray-300 rounded-lg px-4 py-2"><MapPin className="w-5 h-5 text-gray-400 mr-2" /><input type="text" placeholder="Vị trí" className="flex-1 outline-none text-gray-700 text-black" value={searchFilters.location} onChange={(e) => setSearchFilters({...searchFilters, location: e.target.value})} /></div><div className="flex items-center border border-gray-300 rounded-lg px-4 py-2"><Calendar className="w-5 h-5 text-gray-400 mr-2" /><input type="date" className="flex-1 outline-none text-gray-700 text-black" value={searchFilters.date} onChange={(e) => setSearchFilters({...searchFilters, date: e.target.value})} /></div><div className="flex items-center border border-gray-300 rounded-lg px-4 py-2"><Clock className="w-5 h-5 text-gray-400 mr-2" /><select className="flex-1 outline-none text-gray-700 text-black"><option value="">Giờ</option><option value="morning">Sáng</option><option value="evening">Tối</option></select></div><button onClick={() => setCurrentView('search')} className="bg-green-600 text-white rounded-lg px-6 py-2 font-semibold hover:bg-green-700 flex items-center justify-center"><Search className="w-5 h-5 mr-2" /> Tìm sân</button></div></div></div></div></div>
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16"><h2 className="text-3xl font-bold text-center mb-12 text-gray-800">Tại sao chọn chúng tôi?</h2><div className="grid grid-cols-1 md:grid-cols-3 gap-8"><div className="bg-white rounded-lg shadow-md p-6 text-center hover:shadow-xl transition"><div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"><Search className="w-8 h-8 text-green-600" /></div><h3 className="text-xl font-semibold mb-2 text-gray-800">Tìm kiếm thông minh</h3><p className="text-gray-600">Tìm sân theo vị trí, giờ, loại sân và mức giá phù hợp với bạn</p></div><div className="bg-white rounded-lg shadow-md p-6 text-center hover:shadow-xl transition"><div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"><Calendar className="w-8 h-8 text-green-600" /></div><h3 className="text-xl font-semibold mb-2 text-gray-800">Đặt sân dễ dàng</h3><p className="text-gray-600">Chọn giờ, thanh toán và nhận mã xác nhận chỉ trong vài phút</p></div><div className="bg-white rounded-lg shadow-md p-6 text-center hover:shadow-xl transition"><div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"><Star className="w-8 h-8 text-green-600" /></div><h3 className="text-xl font-semibold mb-2 text-gray-800">Đánh giá tin cậy</h3><p className="text-gray-600">Xem đánh giá từ cộng đồng để chọn sân tốt nhất</p></div></div></div>
    <div className="bg-white py-16"><div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"><h2 className="text-3xl font-bold text-center mb-12 text-gray-800">Các chi nhánh FuFu</h2>{loading ? (<div className="text-center py-10 text-lg text-green-600">Đang tải dữ liệu...</div>) : fields.length === 0 ? (<div className="text-center py-10 text-lg text-gray-500">Không tìm thấy sân bóng nào.</div>) : (<div className="grid grid-cols-1 md:grid-cols-3 gap-8">{fields.map(field => (<div key={field.SanID} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition cursor-pointer" onClick={() => { setSelectedField(field); setCurrentView('detail'); }}><img src={field.HinhAnh} alt={field.TenSan} className="w-full h-48 object-cover" /><div className="p-4"><h3 className="text-xl font-semibold mb-2 text-gray-800">{field.TenSan}</h3><div className="flex items-center text-gray-600 mb-2"><MapPin className="w-4 h-4 mr-1" /><span className="text-sm">{field.DiaChi}</span></div><div className="flex items-center justify-between mb-2"><div className="flex items-center"><Star className="w-4 h-4 text-yellow-400 fill-current mr-1" /><span className="text-sm font-semibold">{field.DiemDanhGia}</span><span className="text-sm text-gray-500 ml-1">({field.SoLuotReview} đánh giá)</span></div><span className="text-sm text-gray-600">{field.LoaiSan}</span></div><div className="text-green-600 font-bold">Từ 180.000đ/giờ</div></div></div>))}</div>)}</div></div>
  </div>
);

const SearchPage = ({ fields, loading, setSelectedField, setCurrentView }) => (
  <div className="min-h-screen bg-gray-50 py-8"><div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"><h1 className="text-3xl font-bold mb-6 text-gray-800">Kết quả tìm kiếm</h1><div className="bg-white rounded-lg shadow-md p-6 mb-6"><div className="flex items-center mb-4"><Filter className="w-5 h-5 text-gray-600 mr-2" /><h2 className="text-lg font-semibold text-gray-800">Bộ lọc</h2></div><div className="grid grid-cols-1 md:grid-cols-4 gap-4"><select className="border p-2 rounded"><option>Loại sân</option></select><select className="border p-2 rounded"><option>Giá</option></select><select className="border p-2 rounded"><option>Đánh giá</option></select><button className="bg-green-600 text-white rounded p-2">Áp dụng</button></div></div><div className="grid grid-cols-1 gap-6">{fields.map(field => (<div key={field.SanID} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition cursor-pointer" onClick={() => { setSelectedField(field); setCurrentView('detail'); }}><div className="md:flex"><img src={field.HinhAnh} className="w-full md:w-64 h-48 object-cover" /><div className="p-6 flex-1"><h3 className="text-2xl font-semibold text-gray-800">{field.TenSan}</h3><div className="flex items-center text-gray-600 mb-3"><MapPin className="w-4 h-4 mr-1" /><span>{field.DiaChi}</span></div><div className="flex justify-between items-center mt-4"><div className="text-green-600 font-bold text-xl">Đặt sân để xem giá</div><button className="bg-green-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-green-700">Xem chi tiết</button></div></div></div></div>))}</div></div></div>
);

const FieldDetailPage = ({ selectedField, setCurrentView, isLoggedIn, searchFilters, setSearchFilters, bookingInfo, setBookingInfo, busySlots }) => {
  const isConflict = checkConflict(bookingInfo.startTime, bookingInfo.endTime, busySlots);
  const isPastConflict = checkPastTimeConflict(searchFilters.date, bookingInfo.startTime);
  if (!selectedField) return null;
  
  return (
    <div className="min-h-screen bg-gray-50 py-8"><div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"><button onClick={() => setCurrentView('search')} className="mb-6 text-green-600 hover:text-green-700 font-medium flex items-center">← Quay lại danh sách</button><div className="grid grid-cols-1 lg:grid-cols-3 gap-6"><div className="lg:col-span-2"><div className="bg-white rounded-lg shadow-md p-6 mb-6"><img src={selectedField.HinhAnh} className="w-full h-64 object-cover rounded-lg mb-4" /><h1 className="text-3xl font-bold text-gray-800">{selectedField.TenSan}</h1><div className="flex items-center mb-4"><Star className="w-5 h-5 text-yellow-400 fill-current mr-1" /><span className="font-semibold mr-2">{selectedField.DiemDanhGia}</span><span className="text-gray-600">({selectedField.SoLuotReview} đánh giá)</span></div><div className="space-y-3 mb-6"><div className="flex items-center text-gray-700"><MapPin className="w-5 h-5 mr-3 text-green-600" /><span>{selectedField.DiaChi}</span></div><div className="flex items-center text-gray-700"><Phone className="w-5 h-5 mr-3 text-green-600" /><span>Chủ sân: Phùng Vĩnh Phước - 0328665619</span></div></div><h3 className="text-xl font-semibold mb-3 text-gray-800">Tiện ích</h3><div className="flex flex-wrap gap-2 mb-6">{selectedField.TienIch && selectedField.TienIch.split(',').map((t, i) => <span key={i} className="bg-green-50 text-green-700 px-4 py-2 rounded-lg border border-green-200">{t}</span>)}</div><h3 className="text-xl font-semibold mb-3 text-gray-800 border-t pt-4">Đánh giá gần đây</h3><div className="space-y-3"><div className="bg-gray-50 p-3 rounded"><strong>Nguyễn Văn A:</strong> Sân đẹp, giá tốt! ⭐⭐⭐⭐⭐</div><div className="bg-gray-50 p-3 rounded"><strong>Trần Thị B:</strong> Chủ sân nhiệt tình. ⭐⭐⭐⭐</div></div></div><div className="bg-red-50 p-4 rounded-lg border border-red-100"><h3 className="font-bold text-red-600 mb-2 flex items-center"><AlertCircle className="w-4 h-4 mr-2"/> Giờ bận hôm nay ({bookingInfo.fieldType}):</h3>{busySlots.length === 0 ? (<p className="text-green-600 text-sm">{bookingInfo.fieldType} trống cả ngày!</p>) : (<div className="flex flex-wrap gap-2">{busySlots.map((slot, idx) => (<span key={idx} className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">{slot.start} - {slot.end}</span>))}</div>)}</div></div><div className="lg:col-span-1"><div className="bg-white rounded-lg shadow-md p-6 sticky top-24"><h2 className="text-2xl font-bold mb-4 text-gray-800">Đặt sân ngay</h2>{!isLoggedIn ? (<div className="text-center bg-red-50 p-4 rounded text-red-600 mb-4">Bạn phải đăng nhập mới được đặt sân!<button onClick={() => setCurrentView('login')} className="block w-full bg-green-600 text-white py-2 mt-2 rounded font-bold">Đăng nhập ngay</button></div>) : (<div className="space-y-4"><div><label className="text-sm font-bold text-gray-700 mb-2 block">Chọn loại sân:</label><div className="grid grid-cols-2 gap-3"><button onClick={() => setBookingInfo({...bookingInfo, fieldType: 'Sân 5'})} className={`py-2 rounded-lg border-2 font-bold flex items-center justify-center ${bookingInfo.fieldType === 'Sân 5' ? 'border-green-600 bg-green-50 text-green-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}><Users className="w-4 h-4 mr-2"/> Sân 5</button><button onClick={() => setBookingInfo({...bookingInfo, fieldType: 'Sân 7'})} className={`py-2 rounded-lg border-2 font-bold flex items-center justify-center ${bookingInfo.fieldType === 'Sân 7' ? 'border-green-600 bg-green-50 text-green-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}><Users className="w-4 h-4 mr-2"/> Sân 7</button></div></div><div><label className="text-sm font-bold text-gray-700">Ngày đá</label><input type="date" className="w-full border rounded p-2" value={searchFilters.date} onChange={(e) => setSearchFilters({...searchFilters, date: e.target.value})} />{new Date(searchFilters.date).getDate() === 14 && <div className="text-xs text-red-500 font-bold mt-1">🎉 Ngày 14 giảm 10%!</div>}</div><div className="flex space-x-2"><div className="w-1/2"><label className="text-sm font-bold text-gray-700">Bắt đầu</label><input type="time" className="w-full border rounded p-2" value={bookingInfo.startTime} onChange={(e) => setBookingInfo({...bookingInfo, startTime: e.target.value})} /></div><div className="w-1/2"><label className="text-sm font-bold text-gray-700">Kết thúc</label><input type="time" className="w-full border rounded p-2" value={bookingInfo.endTime} onChange={(e) => setBookingInfo({...bookingInfo, endTime: e.target.value})} /></div></div>{(isConflict || isPastConflict) && (<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"><strong className="font-bold">Lỗi!</strong>{isPastConflict ? (<span className="block sm:inline"> Giờ này đã trôi qua.</span>) : (<span className="block sm:inline"> Giờ bạn chọn đã bị trùng cho {bookingInfo.fieldType}.</span>)}</div>)}<input type="text" placeholder="Họ và tên" className="w-full border border-gray-300 rounded-lg px-4 py-2" value={bookingInfo.name} onChange={(e) => setBookingInfo({...bookingInfo, name: e.target.value})} /><input type="tel" placeholder="Số điện thoại" className="w-full border border-gray-300 rounded-lg px-4 py-2" value={bookingInfo.phone} onChange={(e) => setBookingInfo({...bookingInfo, phone: e.target.value.replace(/[^0-9]/g, '')})} /><div className="bg-green-50 p-4 rounded border border-green-200 text-center"><div className="text-gray-600">Tổng tiền tạm tính ({bookingInfo.fieldType})</div><div className="text-2xl font-bold text-green-700">{new Intl.NumberFormat('vi-VN').format(bookingInfo.totalPrice)}đ</div></div><button onClick={() => { if (!isConflict && !isPastConflict && bookingInfo.totalPrice > 0 && bookingInfo.name && bookingInfo.phone) setCurrentView('payment'); else alert("Kiểm tra lại thông tin hoặc giờ đặt!"); }} disabled={isConflict || isPastConflict} className={`w-full text-white py-3 rounded-lg font-semibold transition ${(isConflict || isPastConflict) ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}>{isPastConflict ? 'Giờ đã qua' : isConflict ? 'Giờ này đã kín' : 'Tiếp tục thanh toán'}</button></div>)}</div></div></div></div></div>
  );
};

const PaymentPage = ({ bookingInfo, setCurrentView, showQR, setShowQR, qrTimer, setQrTimer, selectedField, searchFilters, saveBooking }) => (
  <div className="min-h-screen bg-gray-50 py-8"><div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8"><h1 className="text-3xl font-bold mb-6 text-gray-800">Thanh toán</h1><div className="bg-white rounded-lg shadow-md p-6 mb-6"><h2 className="text-xl font-semibold mb-4 text-gray-800">Thông tin đặt sân</h2><div className="space-y-4 text-gray-700"><p><strong>Sân:</strong> {selectedField?.TenSan}</p><p><strong>Loại sân:</strong> <span className="font-bold text-green-600">{bookingInfo.fieldType}</span></p><p><strong>Ngày:</strong> {searchFilters.date}</p><p><strong>Giờ:</strong> {bookingInfo.startTime} - {bookingInfo.endTime}</p><p><strong>Tên:</strong> {bookingInfo.name}</p><p><strong>SĐT:</strong> {bookingInfo.phone}</p><p className="text-xl font-bold text-green-600">Tổng: {new Intl.NumberFormat('vi-VN').format(bookingInfo.totalPrice)}đ</p></div></div><div className="bg-white rounded-lg shadow-md p-6 mb-6"><h2 className="text-xl font-semibold mb-4 text-gray-800">Phương thức thanh toán</h2>{!showQR ? (<div className="space-y-3"><button onClick={() => {setShowQR(true); setQrTimer(60)}} className="w-full flex items-center p-4 border rounded-lg hover:border-green-600 bg-green-50"><CreditCard className="w-6 h-6 text-green-600 mr-3" /><div className="text-left"><div className="font-bold text-green-700">Thanh toán qua QR Code (Khuyên dùng)</div><div className="text-sm text-gray-500">Chủ TK: Phùng Vĩnh Phước</div></div></button></div>) : (<div className="text-center animate-pulse"><div className="text-red-500 font-bold mb-2">Mã hiệu lực trong: {qrTimer}s</div><img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=00020101021238570010A000000727012700069704220113PHUNGVINHPHUOC0208QRIBFTTA53037045405200005802VN6304D162" className="mx-auto border-2 border-green-500 rounded-lg mb-2" alt="QR" /><p className="font-bold">Phùng Vĩnh Phước</p><p className="mb-4">Nội dung: {bookingInfo.phone}</p><button onClick={() => { saveBooking(); }} className="bg-green-600 text-white px-6 py-2 rounded font-bold">Đã thanh toán xong</button></div>)}</div>{!showQR && (<div className="flex space-x-4"><button onClick={() => setCurrentView('detail')} className="w-1/3 border border-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-50">Quay lại</button></div>)}</div></div>
);

// --- COMPONENT LOGIN (GỬI MAIL THẬT & GIAO DIỆN CHUẨN) ---
const LoginPage = ({ authMode, setAuthMode, handleLogin, setCurrentView }) => {
  const [inputPhone, setInputPhone] = useState('');
  const [inputPassword, setInputPassword] = useState(''); 
  const [inputName, setInputName] = useState(''); 
  const [inputEmail, setInputEmail] = useState(''); 
  const [inputAddress, setInputAddress] = useState('');
  
  // Hàm xử lý Quên mật khẩu (GỌI API THẬT)
  const handleForgotPassword = async () => {
      if (!inputEmail) { 
          alert("Vui lòng nhập Email đã đăng ký để lấy lại mật khẩu!"); 
          return; 
      }
      try {
          // Hiện thông báo chờ (UX tốt hơn)
          alert("Đang gửi yêu cầu... Vui lòng đợi trong giây lát.");
          
          const res = await fetch('http://localhost:5000/api/auth/forgot-password', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: inputEmail })
          });
          
          const data = await res.json();
          alert(data.message); // Hiển thị thông báo từ Server (Thành công hoặc Lỗi)
          
          if (res.ok) {
              setAuthMode('login'); // Chuyển về trang đăng nhập nếu thành công
          }
      } catch (e) { 
          alert("Lỗi kết nối: " + e.message); 
      }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">F</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">
            {authMode === 'login' ? 'Đăng Nhập' : authMode === 'register' ? 'Đăng Ký' : 'Quên Mật Khẩu'}
          </h1>
        </div>
        
        <div className="space-y-4">
          
          {/* --- TRƯỜNG HỢP 1: QUÊN MẬT KHẨU --- */}
          {authMode === 'forgot' ? (
              <>
                <p className="text-sm text-gray-600 mb-2">Nhập email của bạn để nhận mật khẩu mới:</p>
                <input 
                  type="email" 
                  className="w-full border border-gray-300 rounded-lg px-4 py-2" 
                  placeholder="Email đã đăng ký" 
                  value={inputEmail} 
                  onChange={(e) => setInputEmail(e.target.value)} 
                />
                <button 
                  onClick={handleForgotPassword} 
                  className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700"
                >
                  Gửi lại mật khẩu
                </button>
              </>
          ) : (
              /* --- TRƯỜNG HỢP 2: ĐĂNG NHẬP HOẶC ĐĂNG KÝ --- */
              <>
                {/* Các ô chỉ hiện khi Đăng ký */}
                {authMode === 'register' && (
                    <>
                      <input type="text" className="w-full border border-gray-300 rounded-lg px-4 py-2" placeholder="Họ và tên" value={inputName} onChange={(e) => setInputName(e.target.value)} />
                      <input type="email" className="w-full border border-gray-300 rounded-lg px-4 py-2" placeholder="Email" value={inputEmail} onChange={(e) => setInputEmail(e.target.value)} />
                      <input type="text" className="w-full border border-gray-300 rounded-lg px-4 py-2" placeholder="Địa chỉ" value={inputAddress} onChange={(e) => setInputAddress(e.target.value)} />
                    </>
                )}

                {/* Các ô chung */}
                <input 
                  type="text" 
                  className="w-full border border-gray-300 rounded-lg px-4 py-2" 
                  placeholder={authMode === 'register' ? "Số điện thoại" : "Số điện thoại / Email"} 
                  value={inputPhone} 
                  onChange={(e) => setInputPhone(e.target.value)} 
                />
                
                <input 
                  type="password" 
                  className="w-full border border-gray-300 rounded-lg px-4 py-2" 
                  placeholder="Mật khẩu" 
                  value={inputPassword} 
                  onChange={(e) => setInputPassword(e.target.value)} 
                />
                
                <button onClick={() => {
                    // Validation cơ bản
                    if (inputPhone.trim() === '' || inputPassword.trim() === '') { 
                        alert("Vui lòng nhập đầy đủ thông tin!"); 
                        return; 
                    }
                    
                    if (authMode === 'register') {
                        if (inputName.trim() === '') { alert("Vui lòng nhập Họ tên!"); return; }
                        // Gọi hàm Đăng ký (kèm thông tin mở rộng)
                        handleLogin(inputPhone, inputPassword, inputName, true, inputEmail, inputAddress); 
                    } else { 
                        // Gọi hàm Đăng nhập
                        handleLogin(inputPhone, inputPassword); 
                    }
                }} className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700">
                    {authMode === 'login' ? 'Đăng nhập' : 'Đăng ký'}
                </button>
              </>
          )}
          
          {/* --- NÚT CHUYỂN ĐỔI CHẾ ĐỘ --- */}
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
  <div className="min-h-screen bg-gray-50 py-8"><div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"><div className="flex justify-between items-center mb-6"><h1 className="text-3xl font-bold text-gray-800">Lịch sử đặt sân</h1>{history.length > 0 && (<button onClick={clearHistory} className="text-red-500 flex items-center hover:underline"><Trash2 className="w-4 h-4 mr-1"/> Xóa lịch sử</button>)}</div><div className="bg-white rounded-lg shadow-md overflow-hidden">{history.length === 0 ? (<div className="p-10 text-center text-gray-500">Chưa có lịch sử đặt sân nào. Hãy đặt sân ngay!</div>) : (<div className="divide-y divide-gray-200">{history.map((item, index) => (<div key={index} className="p-6 hover:bg-gray-50 flex justify-between items-center"><div><h3 className="font-bold text-lg text-gray-800">{item.san} ({item.sanType || 'Sân 5'})</h3><p className="text-gray-600">Ngày: {item.ngay} | Giờ: {item.gio}</p><p className="text-sm text-gray-500">Người đặt: {item.nguoiDat} - {item.sdt}</p></div><div className="text-right"><div className="text-green-600 font-bold text-xl">{new Intl.NumberFormat('vi-VN').format(item.gia)}đ</div><span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">Đã thanh toán</span></div></div>))}</div>)}</div><button onClick={() => setCurrentView('home')} className="mt-4 text-green-600 font-medium">← Quay lại trang chủ</button></div></div>
);

const AdminPage = ({ fields, onAddField, onDeleteField, currentUser }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newField, setNewField] = useState({ TenSan: '', DiaChi: '', GiaTheoGio: 200000, LoaiSan: 'Sân 5', HinhAnh: '', MoTa: '', TienIch: '' });
  const handleSubmit = async () => { if(!newField.TenSan || !newField.DiaChi) return alert("Nhập đủ tên và địa chỉ!"); await onAddField(newField); setIsAdding(false); setNewField({ TenSan: '', DiaChi: '', GiaTheoGio: 200000, LoaiSan: 'Sân 5', HinhAnh: '', MoTa: '', TienIch: '' }); };
  return (
    <div className="min-h-screen bg-gray-100 py-8"><div className="max-w-7xl mx-auto px-4"><h1 className="text-3xl font-bold text-gray-800 mb-6">Trang Quản Lý Sân Bóng</h1><div className="mb-6"><button onClick={() => setIsAdding(!isAdding)} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold flex items-center">{isAdding ? <X className="w-5 h-5 mr-2"/> : <Plus className="w-5 h-5 mr-2"/>} {isAdding ? 'Hủy thêm mới' : 'Thêm sân bóng mới'}</button></div>{isAdding && (<div className="bg-white p-6 rounded-lg shadow-md mb-6 animate-fade-in"><h2 className="text-xl font-bold mb-4">Nhập thông tin sân</h2><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><input className="border p-2 rounded" placeholder="Tên sân" value={newField.TenSan} onChange={e => setNewField({...newField, TenSan: e.target.value})} /><input className="border p-2 rounded" placeholder="Địa chỉ" value={newField.DiaChi} onChange={e => setNewField({...newField, DiaChi: e.target.value})} /><input className="border p-2 rounded" type="number" placeholder="Giá/giờ" value={newField.GiaTheoGio} onChange={e => setNewField({...newField, GiaTheoGio: e.target.value})} /><select className="border p-2 rounded" value={newField.LoaiSan} onChange={e => setNewField({...newField, LoaiSan: e.target.value})}><option>Sân 5</option><option>Sân 7</option></select><input className="border p-2 rounded" placeholder="Link hình ảnh" value={newField.HinhAnh} onChange={e => setNewField({...newField, HinhAnh: e.target.value})} /><input className="border p-2 rounded" placeholder="Tiện ích" value={newField.TienIch} onChange={e => setNewField({...newField, TienIch: e.target.value})} /></div><textarea className="border p-2 rounded w-full mt-4" placeholder="Mô tả..." value={newField.MoTa} onChange={e => setNewField({...newField, MoTa: e.target.value})} /><button onClick={handleSubmit} className="mt-4 bg-green-600 text-white px-8 py-2 rounded font-bold">Lưu sân bóng</button></div>)}<div className="bg-white rounded-lg shadow-md overflow-hidden"><table className="min-w-full divide-y divide-gray-200"><thead className="bg-gray-50"><tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tên sân</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Địa chỉ</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Giá</th><th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Thao tác</th></tr></thead><tbody className="bg-white divide-y divide-gray-200">{fields.map(field => (<tr key={field.SanID}><td className="px-6 py-4 whitespace-nowrap font-medium">{field.TenSan}</td><td className="px-6 py-4">{field.DiaChi}</td><td className="px-6 py-4 text-green-600 font-bold">{new Intl.NumberFormat('vi-VN').format(field.GiaTheoGio)}đ</td><td className="px-6 py-4 text-right"><button onClick={() => onDeleteField(field.SanID)} className="text-red-600 hover:text-red-900 font-bold flex items-center justify-end ml-auto"><Trash2 className="w-4 h-4 mr-1"/> Xóa</button></td></tr>))}</tbody></table></div><AdminBookingsList currentUser={currentUser} /></div></div>
  );
};

const AdminBookingsList = ({ currentUser }) => {
    const [bookings, setBookings] = useState([]);
    const [loadingBookings, setLoadingBookings] = useState(true);
    const fetchBookings = async () => { try { const res = await fetch('http://localhost:5000/api/bookings-list'); if(res.ok) { const data = await res.json(); setBookings(data); } setLoadingBookings(false); } catch (e) { console.error("Lỗi tải lịch đặt:", e); setLoadingBookings(false); } };
    useEffect(() => { if (currentUser?.phone === 'admin') fetchBookings(); }, [currentUser]);
    if(currentUser?.phone !== 'admin') return null;
    if(loadingBookings) return <div className="p-4 text-center">Đang tải lịch đặt...</div>;
    if(bookings.length === 0) return <div className="p-4 text-center bg-white rounded-lg">Chưa có đơn đặt nào được lưu vào hệ thống.</div>;
    return (
        <div className="bg-white rounded-lg shadow-md overflow-hidden mt-4"><h2 className="text-2xl font-bold text-gray-800 mt-10 mb-4 px-4">Danh Sách Lịch Đặt</h2><table className="min-w-full divide-y divide-gray-200"><thead className="bg-gray-50"><tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sân</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ngày/Giờ</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Loại</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Khách</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SĐT</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">TT</th></tr></thead><tbody className="bg-white divide-y divide-gray-200">{bookings.map(booking => (<tr key={booking.LichDatID}><td className="px-6 py-4 font-medium">{booking.TenSan}</td><td className="px-6 py-4 text-sm">{new Date(booking.NgayDat).toLocaleDateString('vi-VN')} {booking.GioBatDau} - {booking.GioKetThuc}</td><td className="px-6 py-4 text-sm">{booking.LoaiSan}</td><td className="px-6 py-4 text-sm">{booking.KhachHangName}</td><td className="px-6 py-4 text-sm">{booking.KhachHangPhone}</td><td className="px-6 py-4 text-sm"><span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">{booking.TinhTrang}</span></td></tr>))}</tbody></table></div>
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
  
  const [searchFilters, setSearchFilters] = useState({ location: '', date: new Date().toISOString().split('T')[0], time: '', fieldType: '', priceRange: '', rating: '' });
  const [bookingInfo, setBookingInfo] = useState({ name: '', phone: '', startTime: '', endTime: '', fieldType: 'Sân 5', totalPrice: 0, selectedSlot: null });
  const [fields, setFields] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState('login'); 
  const [showQR, setShowQR] = useState(false);
  const [qrTimer, setQrTimer] = useState(60);
  const [busySlots, setBusySlots] = useState([]); 

  const fetchFields = async () => { try { const response = await fetch('http://localhost:5000/api/sanbong'); if (!response.ok) throw new Error('Err'); const data = await response.json(); setFields(data); setLoading(false); } catch (error) { console.error("Lỗi data:", error); setLoading(false); } };

  // Fetch Busy Slots
  useEffect(() => { if(selectedField && searchFilters.date) { const fetchBusy = async () => { try { const res = await fetch(`http://localhost:5000/api/check-trung-gio?sanId=${selectedField.SanID}&ngay=${searchFilters.date}&loaiSan=${bookingInfo.fieldType}`); if(res.ok) { const data = await res.json(); setBusySlots(data); } } catch (e) { console.error(e); } }; fetchBusy(); } }, [selectedField, searchFilters.date, bookingInfo.fieldType]); 

  // Load User from localStorage
  useEffect(() => { const savedUser = localStorage.getItem('currentUser'); if (savedUser) { const user = JSON.parse(savedUser); setCurrentUser(user); setIsLoggedIn(true); if(user.phone === 'admin') setCurrentView('admin'); const savedHistory = localStorage.getItem('bookingHistory_' + user.phone); if (savedHistory) setHistory(JSON.parse(savedHistory)); } fetchFields(); }, []);

  // HÀM ĐĂNG NHẬP / ĐĂNG KÝ (GỌI API THẬT)
  const handleLogin = async (phone, password, name = '', isRegister = false, email = '', address = '') => {
      const endpoint = isRegister ? 'register' : 'login';
      const body = isRegister ? { phone, password, fullName: name, email, address } : { phone, password };

      try {
          const res = await fetch(`http://localhost:5000/api/auth/${endpoint}`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
          });
          const result = await res.json();
          
          if (!res.ok) { alert(`Lỗi: ${result.message}`); return false; }

          if (isRegister) { alert('Đăng ký thành công! Vui lòng đăng nhập.'); setAuthMode('login'); return true; }

          const user = result.user;
          localStorage.setItem('currentUser', JSON.stringify(user));
          setCurrentUser(user);
          setIsLoggedIn(true);
          const savedHistory = localStorage.getItem('bookingHistory_' + user.phone);
          if (savedHistory) setHistory(JSON.parse(savedHistory));
          setCurrentView(user.role === 'admin' ? 'admin' : 'home');
          return true;
      } catch (e) { alert(`Lỗi kết nối server.`); console.error(e); return false; }
  };

  const handleLogout = () => {
      localStorage.removeItem('currentUser'); 
      setIsLoggedIn(false);
      setCurrentUser(null);
      setHistory([]); 
      setCurrentView('login');
      
      // THÊM DÒNG NÀY: Tự động tải lại trang để làm sạch dữ liệu
      window.location.reload(); 
  };

  const saveBooking = async () => {
      try {
          const res = await fetch('http://localhost:5000/api/dat-san', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ SanID: selectedField.SanID, NgayDat: searchFilters.date, GioBatDau: bookingInfo.startTime, GioKetThuc: bookingInfo.endTime, TenKhach: bookingInfo.name, SDT: bookingInfo.phone, LoaiSan: bookingInfo.fieldType })
          });
          if(!res.ok) alert("Có lỗi khi lưu vào Database.");
      } catch(e) { console.error("Lỗi lưu DB", e); }

      const newBooking = { san: selectedField.TenSan, sanType: bookingInfo.fieldType, ngay: searchFilters.date, gio: `${bookingInfo.startTime} - ${bookingInfo.endTime}`, gia: bookingInfo.totalPrice, nguoiDat: bookingInfo.name, sdt: bookingInfo.phone, timestamp: new Date().toISOString() };
      const updatedHistory = [...history, newBooking];
      setHistory(updatedHistory);
      localStorage.setItem('bookingHistory_' + currentUser.phone, JSON.stringify(updatedHistory)); 
      alert('Thanh toán thành công! Sân đã được lưu.'); setCurrentView('home'); setShowQR(false); 
      window.location.reload();
  };

  const clearHistory = () => { if(window.confirm("Xóa lịch sử?")) { setHistory([]); localStorage.removeItem('bookingHistory_' + currentUser.phone); } };
  const handleAddField = async (newFieldData) => { try { const res = await fetch('http://localhost:5000/api/sanbong', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newFieldData) }); if(res.ok) { alert('Thêm sân thành công!'); fetchFields(); } } catch (err) { alert('Lỗi thêm sân'); } };
  const handleDeleteField = async (id) => { if(!window.confirm("Xóa sân này?")) return; try { const res = await fetch(`http://localhost:5000/api/sanbong/${id}`, { method: 'DELETE' }); if(res.ok) { alert('Đã xóa sân!'); fetchFields(); } } catch (err) { alert('Lỗi xóa sân'); } };

  useEffect(() => { let interval; if (showQR && qrTimer > 0) interval = setInterval(() => setQrTimer(prev => prev - 1), 1000); else if (qrTimer === 0) { alert("Hết thời gian!"); setShowQR(false); setQrTimer(60); } return () => clearInterval(interval); }, [showQR, qrTimer]);
  useEffect(() => { if (bookingInfo.startTime && bookingInfo.endTime) { const price = calculateComplexPrice(searchFilters.date, bookingInfo.startTime, bookingInfo.endTime, bookingInfo.fieldType); setBookingInfo(prev => ({ ...prev, totalPrice: price })); } }, [bookingInfo.startTime, bookingInfo.endTime, searchFilters.date, bookingInfo.fieldType]);

  return (
    <div className="font-sans text-gray-900">
      {currentView !== 'login' && <Header currentView={currentView} setCurrentView={setCurrentView} isLoggedIn={isLoggedIn} handleLogout={handleLogout} showMobileMenu={showMobileMenu} setShowMobileMenu={setShowMobileMenu} currentUser={currentUser} />}
      <main>
        {currentView === 'home' && <HomePage setCurrentView={setCurrentView} searchFilters={searchFilters} setSearchFilters={setSearchFilters} fields={fields} loading={loading} setSelectedField={setSelectedField} />}
        {currentView === 'search' && <SearchPage fields={fields} loading={loading} setSelectedField={setSelectedField} setCurrentView={setCurrentView} />}
        {currentView === 'detail' && <FieldDetailPage selectedField={selectedField} setCurrentView={setCurrentView} isLoggedIn={isLoggedIn} searchFilters={searchFilters} setSearchFilters={setSearchFilters} bookingInfo={bookingInfo} setBookingInfo={setBookingInfo} busySlots={busySlots} />}
        {currentView === 'payment' && <PaymentPage bookingInfo={bookingInfo} setCurrentView={setCurrentView} showQR={showQR} setShowQR={setShowQR} qrTimer={qrTimer} setQrTimer={setQrTimer} selectedField={selectedField} searchFilters={searchFilters} saveBooking={saveBooking} />}
        {currentView === 'login' && <LoginPage authMode={authMode} setAuthMode={setAuthMode} handleLogin={handleLogin} setCurrentView={setCurrentView} />}
        {currentView === 'history' && <HistoryPage setCurrentView={setCurrentView} history={history} clearHistory={clearHistory} />}
        {currentView === 'admin' && <AdminPage fields={fields} onAddField={handleAddField} onDeleteField={handleDeleteField} currentUser={currentUser} />}
      </main>
      {currentView !== 'login' && <footer className="bg-gray-800 text-white py-8 mt-auto"><div className="max-w-7xl mx-auto px-4 text-center"><p className="mb-2 font-bold text-lg">@ 2025 FuFuField</p><p className="text-gray-400">Nền tảng đặt sân bóng đá hàng đầu.</p></div></footer>}
    </div>
  );
};

export default FootballBookingApp;