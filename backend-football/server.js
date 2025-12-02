const express = require('express');
const sql = require('mssql');
const cors = require('cors');
const bcrypt = require('bcryptjs'); 
const nodemailer = require('nodemailer'); // Thư viện gửi mail
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const saltRounds = 10; 

app.use(cors());
app.use(express.json());

// Cấu hình Database
const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PWD,
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    options: { encrypt: false, trustServerCertificate: true }
};

// --- CẤU HÌNH GỬI MAIL ---
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'phungvinhphuoc.050105@gmail.com', 
        pass: 'atjs ixjz vsee oqif'   
    }
});

app.get('/', (req, res) => res.send('<h1>⚽ Server Sân Bóng FuFu đang chạy ngon lành! 🚀</h1>'));

// --- AUTHENTICATION ---

app.post('/api/auth/register', async (req, res) => {
    try {
        const { phone, password, fullName, email, address } = req.body;
        const pool = await sql.connect(dbConfig);

        const checkUser = await pool.request().input('Phone', sql.VarChar, phone).query("SELECT KhachHangID FROM KhachHang WHERE Phone = @Phone");
        if (checkUser.recordset.length > 0) return res.status(400).json({ message: 'Số điện thoại này đã được đăng ký!' });

        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const result = await pool.request()
            .input('Phone', sql.VarChar, phone)
            .input('PasswordHash', sql.VarChar, hashedPassword)
            .input('FullName', sql.NVarChar, fullName)
            .input('Email', sql.VarChar, email)
            .input('DiaChi', sql.NVarChar, address)
            .query("INSERT INTO KhachHang (Phone, PasswordHash, FullName, Email, DiaChi) OUTPUT INSERTED.KhachHangID, INSERTED.FullName, INSERTED.Phone VALUES (@Phone, @PasswordHash, @FullName, @Email, @DiaChi)");

        res.status(201).json({ message: 'Đăng ký thành công!', user: result.recordset[0] });
    } catch (err) { res.status(500).json({ message: 'Lỗi server.' }); }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { phone, password } = req.body;
        
        if (phone === 'admin' && password === '123') {
            return res.json({ message: 'Chào Admin!', user: { id: 0, name: 'Quản Trị Viên', phone: 'admin', role: 'admin' } });
        }

        const pool = await sql.connect(dbConfig);
        const result = await pool.request().input('Phone', sql.VarChar, phone).query("SELECT * FROM KhachHang WHERE Phone = @Phone");
        const user = result.recordset[0];

        if (!user) return res.status(401).json({ message: 'Sai thông tin đăng nhập.' });

        const isMatch = await bcrypt.compare(password, user.PasswordHash);
        if (!isMatch) return res.status(401).json({ message: 'Sai thông tin đăng nhập.' });
        
        res.json({ 
            message: 'Đăng nhập thành công!',
            user: { id: user.KhachHangID, name: user.FullName, phone: user.Phone, role: 'user' } 
        });
    } catch (err) { res.status(500).json({ message: 'Lỗi server.' }); }
});

// --- API QUÊN MẬT KHẨU (GỬI MAIL THẬT) ---
app.post('/api/auth/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const pool = await sql.connect(dbConfig);

        // 1. Tìm tài khoản
        const userCheck = await pool.request().input('Email', sql.VarChar, email).query("SELECT * FROM KhachHang WHERE Email = @Email");
        if (userCheck.recordset.length === 0) {
            return res.status(404).json({ message: 'Email này chưa được đăng ký!' });
        }

        // 2. Tạo mật khẩu mới (6 số ngẫu nhiên)
        const newPassword = Math.floor(100000 + Math.random() * 900000).toString();
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

        // 3. Cập nhật vào Database
        await pool.request()
            .input('Email', sql.VarChar, email)
            .input('PasswordHash', sql.VarChar, hashedPassword)
            .query("UPDATE KhachHang SET PasswordHash = @PasswordHash WHERE Email = @Email");

        // 4. Gửi email thật
        const mailOptions = {
            from: 'Sân Bóng FuFu Support',
            to: email,
            subject: 'Cấp lại mật khẩu - Sân Bóng FuFu',
            text: `Mật khẩu mới của bạn là: ${newPassword}\nVui lòng đăng nhập và đổi lại mật khẩu ngay.`
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.log(error);
                return res.status(500).json({ message: 'Lỗi gửi mail (Kiểm tra lại cấu hình Gmail).' });
            } else {
                console.log('Email sent: ' + info.response);
                return res.json({ message: 'Mật khẩu mới đã được gửi vào email của bạn!' });
            }
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Lỗi server.' });
    }
});

// --- BOOKING APIs ---
app.get('/api/sanbong', async (req, res) => { try { const pool = await sql.connect(dbConfig); const result = await pool.request().query('SELECT * FROM SanBong'); res.json(result.recordset); } catch (err) { res.status(500).send(err.message); } });
app.get('/api/bookings-list', async (req, res) => { try { const pool = await sql.connect(dbConfig); const q = `SELECT ld.*, sb.TenSan, kh.FullName AS KhachHangName, kh.Phone AS KhachHangPhone FROM LichDat ld JOIN SanBong sb ON ld.SanID = sb.SanID JOIN KhachHang kh ON ld.KhachHangID = kh.KhachHangID ORDER BY ld.NgayDat DESC, ld.GioBatDau DESC`; const r = await pool.request().query(q); res.json(r.recordset); } catch (err) { res.status(500).send(err.message); } });
app.get('/api/check-trung-gio', async (req, res) => { try { const { sanId, ngay, loaiSan } = req.query; const pool = await sql.connect(dbConfig); const q = `SELECT LEFT(CAST(GioBatDau AS VARCHAR), 5) as start, LEFT(CAST(GioKetThuc AS VARCHAR), 5) as endTime FROM LichDat WHERE SanID = @SanID AND NgayDat = @Ngay AND LoaiSan = @LoaiSan AND TinhTrang != N'Đã hủy'`; const r = await pool.request().input('SanID', sql.Int, sanId).input('Ngay', sql.Date, ngay).input('LoaiSan', sql.NVarChar, loaiSan).query(q); const busy = r.recordset.map(i => ({ start: i.start, end: i.endTime })); res.json(busy); } catch (err) { res.status(500).send(err.message); } });
app.post('/api/dat-san', async (req, res) => { try { const { SanID, NgayDat, GioBatDau, GioKetThuc, TenKhach, SDT, LoaiSan } = req.body; const pool = await sql.connect(dbConfig); let khID; const khCheck = await pool.request().input('Phone', sql.VarChar, SDT).query("SELECT KhachHangID FROM KhachHang WHERE Phone = @Phone"); if (khCheck.recordset.length > 0) { khID = khCheck.recordset[0].KhachHangID; } else { const newKh = await pool.request().input('Fullname', sql.NVarChar, TenKhach).input('Phone', sql.VarChar, SDT).query("INSERT INTO KhachHang (FullName, Phone) OUTPUT INSERTED.KhachHangID VALUES (@Fullname, @Phone)"); khID = newKh.recordset[0].KhachHangID; } await pool.request().input('KhachHangID', sql.Int, khID).input('SanID', sql.Int, SanID).input('NgayDat', sql.Date, NgayDat).input('GioBatDau', sql.VarChar, GioBatDau).input('GioKetThuc', sql.VarChar, GioKetThuc).input('TinhTrang', sql.NVarChar, 'Đã thanh toán').input('LoaiSan', sql.NVarChar, LoaiSan).query(`INSERT INTO LichDat (KhachHangID, SanID, NgayDat, GioBatDau, GioKetThuc, TinhTrang, LoaiSan) VALUES (@KhachHangID, @SanID, @NgayDat, @GioBatDau, @GioKetThuc, @TinhTrang, @LoaiSan)`); res.json({ message: 'Đặt sân thành công!' }); } catch (err) { res.status(500).send(err.message); } });
app.post('/api/sanbong', async (req, res) => { try { const { TenSan, DiaChi, GiaTheoGio, LoaiSan, HinhAnh, MoTa, TienIch } = req.body; const pool = await sql.connect(dbConfig); await pool.request().input('TenSan', sql.NVarChar, TenSan).input('DiaChi', sql.NVarChar, DiaChi).input('GiaTheoGio', sql.Decimal, GiaTheoGio).input('LoaiSan', sql.NVarChar, LoaiSan).input('HinhAnh', sql.NVarChar, HinhAnh).input('MoTa', sql.NVarChar, MoTa).input('TienIch', sql.NVarChar, TienIch).query(`INSERT INTO SanBong (TenSan, DiaChi, GiaTheoGio, LoaiSan, HinhAnh, MoTa, TienIch, ChuSanID, DiemDanhGia, SoLuotReview) VALUES (@TenSan, @DiaChi, @GiaTheoGio, @LoaiSan, @HinhAnh, @MoTa, @TienIch, 1, 5, 0)`); res.json({ message: 'Thêm sân thành công!' }); } catch (err) { res.status(500).send(err.message); } });
app.delete('/api/sanbong/:id', async (req, res) => { try { const { id } = req.params; const pool = await sql.connect(dbConfig); await pool.request().input('SanID', sql.Int, id).query('DELETE FROM SanBong WHERE SanID = @SanID'); res.json({ message: 'Xóa sân thành công!' }); } catch (err) { res.status(500).send(err.message); } });

app.listen(PORT, () => {
    console.log(`🚀 Server đang chạy tại: http://localhost:${PORT}`);
});