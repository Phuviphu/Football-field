const express = require('express');
const sql = require('mssql');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const saltRounds = 10;

app.use(cors());
app.use(express.json());

// --- Cấu hình Database ---
const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PWD,
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

// --- Cấu hình Gửi Mail ---
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'phungvinhphuoc.050105@gmail.com',
        pass: 'atjs ixjz vsee oqif'
    }
});

app.get('/', (req, res) => {
    res.send('<h1>⚽ Server Sân Bóng FuFu đang chạy ngon lành! 🚀</h1>');
});

// --- PHẦN XÁC THỰC (AUTHENTICATION) ---
// API: Đăng kí
app.post('/api/auth/register', async (req, res) => {
    try {
        const { phone, password, fullName, email, address } = req.body;
        const pool = await sql.connect(dbConfig);

        // Kiểm tra SĐT
        const checkPhone = await pool.request()
            .input('Phone', sql.VarChar, phone)
            .query("SELECT KhachHangID FROM KhachHang WHERE Phone = @Phone");

        if (checkPhone.recordset.length > 0) {
            return res.status(400).json({ message: 'Số điện thoại này đã được đăng ký!' });
        }

        // Kiểm tra Email
        const checkEmail = await pool.request()
            .input('Email', sql.VarChar, email)
            .query("SELECT KhachHangID FROM KhachHang WHERE Email = @Email");

        if (checkEmail.recordset.length > 0) {
            return res.status(400).json({ message: 'Email này đã được đăng ký!' });
        }

        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const result = await pool.request()
            .input('Phone', sql.VarChar, phone)
            .input('PasswordHash', sql.VarChar, hashedPassword)
            .input('FullName', sql.NVarChar, fullName)
            .input('Email', sql.VarChar, email)
            .input('DiaChi', sql.NVarChar, address)
            .query(`
                INSERT INTO KhachHang (Phone, PasswordHash, FullName, Email, DiaChi) 
                OUTPUT INSERTED.KhachHangID, INSERTED.FullName, INSERTED.Phone, INSERTED.Email, INSERTED.DiaChi 
                VALUES (@Phone, @PasswordHash, @FullName, @Email, @DiaChi)
            `);

        res.status(201).json({
            message: 'Đăng ký thành công!',
            user: result.recordset[0]
        });
    } catch (err) {
        res.status(500).json({ message: 'Lỗi server.' });
    }
});

// API: Đăng nhập (SĐT hoặc Email)
app.post('/api/auth/login', async (req, res) => {
    try {
        const { phone, password } = req.body;

        // Check Admin cứng
        if (phone === 'admin' && password === '123') {
            return res.json({
                message: 'Chào Admin!',
                user: { id: 0, name: 'Quản Trị Viên', phone: 'admin', role: 'admin' }
            });
        }

        const pool = await sql.connect(dbConfig);
        
        // Tìm user bằng SĐT HOẶC Email
        // Lưu ý: Biến `phone` ở đây chứa input (có thể là SĐT hoặc Email)
        const result = await pool.request()
            .input('Input', sql.VarChar, phone)
            .query("SELECT * FROM KhachHang WHERE Phone = @Input OR Email = @Input");
        
        const user = result.recordset[0];

        if (!user) {
            return res.status(401).json({ message: 'Sai thông tin đăng nhập.' });
        }

        const isMatch = await bcrypt.compare(password, user.PasswordHash);
        if (!isMatch) {
            return res.status(401).json({ message: 'Sai thông tin đăng nhập.' });
        }

        res.json({
            message: 'Đăng nhập thành công!',
            user: {
                id: user.KhachHangID,
                name: user.FullName,
                phone: user.Phone,
                email: user.Email,
                address: user.DiaChi,
                role: 'user'
            }
        });
    } catch (err) {
        res.status(500).json({ message: 'Lỗi server.' });
    }
});

// API: Quên mật khẩu
app.post('/api/auth/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const pool = await sql.connect(dbConfig);

        const userCheck = await pool.request()
            .input('Email', sql.VarChar, email)
            .query("SELECT * FROM KhachHang WHERE Email = @Email");

        if (userCheck.recordset.length === 0) {
            return res.status(404).json({ message: 'Email này chưa được đăng ký!' });
        }

        const newPassword = Math.floor(100000 + Math.random() * 900000).toString();
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

        await pool.request()
            .input('Email', sql.VarChar, email)
            .input('PasswordHash', sql.VarChar, hashedPassword)
            .query("UPDATE KhachHang SET PasswordHash = @PasswordHash WHERE Email = @Email");

        const mailOptions = {
            from: 'Sân Bóng FuFu Support',
            to: email,
            subject: 'Cấp lại mật khẩu - Sân Bóng FuFu',
            text: `Mật khẩu mới của bạn là: ${newPassword}\nVui lòng đăng nhập và đổi lại mật khẩu ngay.`
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                return res.status(500).json({ message: 'Lỗi gửi mail.' });
            } else {
                return res.json({ message: 'Mật khẩu mới đã được gửi vào email của bạn!' });
            }
        });

    } catch (err) {
        res.status(500).json({ message: 'Lỗi server.' });
    }
});

// --- PHẦN QUẢN LÝ TÀI KHOẢN (PROFILE) ---
// API: Cập nhật thông tin cá nhân
app.put('/api/user/update-info', async (req, res) => {
    try {
        const { id, fullName, email, address } = req.body;
        const pool = await sql.connect(dbConfig);

        await pool.request()
            .input('ID', sql.Int, id)
            .input('FullName', sql.NVarChar, fullName)
            .input('Email', sql.VarChar, email)
            .input('DiaChi', sql.NVarChar, address)
            .query("UPDATE KhachHang SET FullName = @FullName, Email = @Email, DiaChi = @DiaChi WHERE KhachHangID = @ID");

        res.json({ message: 'Cập nhật thông tin thành công!' });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// API: Đổi mật khẩu
app.put('/api/user/change-password', async (req, res) => {
    try {
        const { id, oldPassword, newPassword } = req.body;
        const pool = await sql.connect(dbConfig);

        // Lấy mật khẩu cũ để so sánh
        const userRes = await pool.request()
            .input('ID', sql.Int, id)
            .query("SELECT PasswordHash FROM KhachHang WHERE KhachHangID = @ID");
        
        const user = userRes.recordset[0];
        if (!user) return res.status(404).json({ message: 'Người dùng không tồn tại' });

        // Kiểm tra mật khẩu cũ
        const isMatch = await bcrypt.compare(oldPassword, user.PasswordHash);
        if (!isMatch) {
            return res.status(400).json({ message: 'Mật khẩu cũ không đúng!' });
        }

        // Hash mật khẩu mới và lưu
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
        await pool.request()
            .input('ID', sql.Int, id)
            .input('PasswordHash', sql.VarChar, hashedPassword)
            .query("UPDATE KhachHang SET PasswordHash = @PasswordHash WHERE KhachHangID = @ID");

        res.json({ message: 'Đổi mật khẩu thành công!' });
    } catch (err) {
        res.status(500).send(err.message);
    }
});


// --- PHẦN QUẢN TRỊ (ADMIN) & THỐNG KÊ ---
app.get('/api/admin/stats', async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const query = `
            SELECT 
                (SELECT COUNT(*) FROM LichDat) as TotalBookings,
                (SELECT COUNT(*) FROM KhachHang) as TotalUsers,
                (SELECT COUNT(*) FROM SanBong) as TotalFields
        `;
        const result = await pool.request().query(query);
        res.json(result.recordset[0]);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

app.get('/api/admin/users', async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().query("SELECT KhachHangID, FullName, Phone, Email, DiaChi FROM KhachHang");
        res.json(result.recordset);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

app.get('/api/admin/reviews', async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().query(`
            SELECT dg.*, sb.TenSan 
            FROM DanhGia dg 
            JOIN SanBong sb ON dg.SanID = sb.SanID 
            ORDER BY dg.NgayDanhGia DESC
        `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).send(err.message);
    }
});


// --- PHẦN CHAT (TIN NHẮN) ---
app.get('/api/messages', async (req, res) => {
    try {
        const { userId } = req.query;
        const pool = await sql.connect(dbConfig);
        
        if (userId && userId !== '0') {
            const result = await pool.request()
                .input('UserID', sql.Int, userId)
                .query(`SELECT * FROM TinNhan WHERE KhachHangID = @UserID ORDER BY ThoiGian ASC`);
            return res.json(result.recordset);
        }
        
        const result = await pool.request().query(`
            SELECT 
                kh.KhachHangID, 
                kh.FullName, 
                (SELECT COUNT(*) FROM TinNhan WHERE KhachHangID = kh.KhachHangID AND IsRead = 0 AND IsAdminSender = 0) as UnreadCount
            FROM KhachHang kh
            WHERE EXISTS (SELECT 1 FROM TinNhan WHERE KhachHangID = kh.KhachHangID)
        `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

app.post('/api/messages', async (req, res) => {
    try {
        const { userId, content, isAdmin } = req.body;
        const pool = await sql.connect(dbConfig);
        await pool.request()
            .input('KhachHangID', sql.Int, userId)
            .input('NoiDung', sql.NVarChar, content)
            .input('IsAdminSender', sql.Bit, isAdmin ? 1 : 0)
            .query("INSERT INTO TinNhan (KhachHangID, NoiDung, IsAdminSender, IsRead) VALUES (@KhachHangID, @NoiDung, @IsAdminSender, 0)");
        res.json({ message: 'Sent' });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

app.put('/api/messages/read', async (req, res) => {
    try {
        const { userId, isAdminViewer } = req.body;
        const pool = await sql.connect(dbConfig);
        const targetSender = isAdminViewer ? 0 : 1; 
        
        await pool.request()
            .input('KhachHangID', sql.Int, userId)
            .input('TargetSender', sql.Bit, targetSender)
            .query("UPDATE TinNhan SET IsRead = 1 WHERE KhachHangID = @KhachHangID AND IsAdminSender = @TargetSender");
            
        res.json({ message: 'Marked as read' });
    } catch (err) {
        res.status(500).send(err.message);
    }
});


// --- PHẦN SÂN BÓNG & ĐẶT LỊCH ---
app.get('/api/sanbong', async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().query('SELECT * FROM SanBong');
        res.json(result.recordset);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

app.get('/api/bookings-list', async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const query = `
            SELECT ld.*, sb.TenSan, kh.FullName AS KhachHangName, kh.Phone AS KhachHangPhone 
            FROM LichDat ld 
            JOIN SanBong sb ON ld.SanID = sb.SanID 
            JOIN KhachHang kh ON ld.KhachHangID = kh.KhachHangID 
            ORDER BY ld.NgayDat DESC, ld.GioBatDau DESC
        `;
        const result = await pool.request().query(query);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

app.get('/api/check-trung-gio', async (req, res) => {
    try {
        const { sanId, ngay, loaiSan } = req.query;
        const pool = await sql.connect(dbConfig);
        const query = `
            SELECT LEFT(CAST(GioBatDau AS VARCHAR), 5) as start, LEFT(CAST(GioKetThuc AS VARCHAR), 5) as endTime 
            FROM LichDat 
            WHERE SanID = @SanID AND NgayDat = @Ngay AND LoaiSan = @LoaiSan AND TinhTrang != N'Đã hủy'
        `;
        const result = await pool.request()
            .input('SanID', sql.Int, sanId)
            .input('Ngay', sql.Date, ngay)
            .input('LoaiSan', sql.NVarChar, loaiSan)
            .query(query);
        
        const busySlots = result.recordset.map(i => ({ start: i.start, end: i.endTime }));
        res.json(busySlots);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

app.post('/api/dat-san', async (req, res) => {
    try {
        const { SanID, NgayDat, GioBatDau, GioKetThuc, TenKhach, SDT, LoaiSan } = req.body;
        const pool = await sql.connect(dbConfig);

        let khID;
        const khCheck = await pool.request().input('Phone', sql.VarChar, SDT).query("SELECT KhachHangID FROM KhachHang WHERE Phone = @Phone");
        
        if (khCheck.recordset.length > 0) {
            khID = khCheck.recordset[0].KhachHangID;
        } else {
            const newKh = await pool.request()
                .input('Fullname', sql.NVarChar, TenKhach)
                .input('Phone', sql.VarChar, SDT)
                .query("INSERT INTO KhachHang (FullName, Phone) OUTPUT INSERTED.KhachHangID VALUES (@Fullname, @Phone)");
            khID = newKh.recordset[0].KhachHangID;
        }

        await pool.request()
            .input('KhachHangID', sql.Int, khID)
            .input('SanID', sql.Int, SanID)
            .input('NgayDat', sql.Date, NgayDat)
            .input('GioBatDau', sql.VarChar, GioBatDau)
            .input('GioKetThuc', sql.VarChar, GioKetThuc)
            .input('TinhTrang', sql.NVarChar, 'Đã thanh toán')
            .input('LoaiSan', sql.NVarChar, LoaiSan)
            .query(`
                INSERT INTO LichDat (KhachHangID, SanID, NgayDat, GioBatDau, GioKetThuc, TinhTrang, LoaiSan) 
                VALUES (@KhachHangID, @SanID, @NgayDat, @GioBatDau, @GioKetThuc, @TinhTrang, @LoaiSan)
            `);

        res.json({ message: 'Đặt sân thành công!' });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

app.post('/api/sanbong', async (req, res) => {
    try {
        const { TenSan, DiaChi, GiaTheoGio, LoaiSan, HinhAnh, MoTa, TienIch } = req.body;
        const pool = await sql.connect(dbConfig);
        await pool.request()
            .input('TenSan', sql.NVarChar, TenSan)
            .input('DiaChi', sql.NVarChar, DiaChi)
            .input('GiaTheoGio', sql.Decimal, GiaTheoGio)
            .input('LoaiSan', sql.NVarChar, LoaiSan)
            .input('HinhAnh', sql.NVarChar, HinhAnh)
            .input('MoTa', sql.NVarChar, MoTa)
            .input('TienIch', sql.NVarChar, TienIch)
            .query(`INSERT INTO SanBong (TenSan, DiaChi, GiaTheoGio, LoaiSan, HinhAnh, MoTa, TienIch, ChuSanID, DiemDanhGia, SoLuotReview) VALUES (@TenSan, @DiaChi, @GiaTheoGio, @LoaiSan, @HinhAnh, @MoTa, @TienIch, 1, 5, 0)`);
        res.json({ message: 'Thêm sân thành công!' });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

app.put('/api/sanbong/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { TenSan, DiaChi, GiaTheoGio, LoaiSan, HinhAnh, MoTa, TienIch } = req.body;
        const pool = await sql.connect(dbConfig);
        await pool.request()
            .input('SanID', sql.Int, id)
            .input('TenSan', sql.NVarChar, TenSan)
            .input('DiaChi', sql.NVarChar, DiaChi)
            .input('GiaTheoGio', sql.Decimal, GiaTheoGio)
            .input('LoaiSan', sql.NVarChar, LoaiSan)
            .input('HinhAnh', sql.NVarChar, HinhAnh)
            .input('MoTa', sql.NVarChar, MoTa)
            .input('TienIch', sql.NVarChar, TienIch)
            .query(`UPDATE SanBong SET TenSan=@TenSan, DiaChi=@DiaChi, GiaTheoGio=@GiaTheoGio, LoaiSan=@LoaiSan, HinhAnh=@HinhAnh, MoTa=@MoTa, TienIch=@TienIch WHERE SanID=@SanID`);
        res.json({ message: 'Cập nhật thành công!' });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

app.delete('/api/sanbong/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await sql.connect(dbConfig);
        await pool.request()
            .input('SanID', sql.Int, id)
            .query('DELETE FROM SanBong WHERE SanID = @SanID');
        res.json({ message: 'Xóa sân thành công!' });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// API: Review
app.get('/api/reviews', async (req, res) => {
    try {
        const { sanId } = req.query;
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('SanID', sql.Int, sanId)
            .query('SELECT NguoiDung, NoiDung, SoSao, NgayDanhGia FROM DanhGia WHERE SanID = @SanID ORDER BY NgayDanhGia DESC');
        res.json(result.recordset);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

app.post('/api/reviews', async (req, res) => {
    try {
        const { SanID, NguoiDung, NoiDung, SoSao } = req.body;
        const pool = await sql.connect(dbConfig);
        const transaction = new sql.Transaction(pool);
        await transaction.begin();
        try {
            await transaction.request()
                .input('SanID', sql.Int, SanID)
                .input('NguoiDung', sql.NVarChar, NguoiDung)
                .input('NoiDung', sql.NVarChar, NoiDung)
                .input('SoSao', sql.Int, SoSao)
                .query(`INSERT INTO DanhGia (SanID, NguoiDung, NoiDung, SoSao) VALUES (@SanID, @NguoiDung, @NoiDung, @SoSao)`);
            
            await transaction.request()
                .input('SanID', sql.Int, SanID)
                .query(`UPDATE SanBong SET DiemDanhGia = (SELECT AVG(CAST(SoSao AS FLOAT)) FROM DanhGia WHERE SanID = @SanID), SoLuotReview = (SELECT COUNT(ReviewID) FROM DanhGia WHERE SanID = @SanID) WHERE SanID = @SanID`);
            
            await transaction.commit();
            res.json({ message: 'Đánh giá thành công!' });
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    } catch (err) {
        res.status(500).send(err.message);
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server đang chạy tại: http://localhost:${PORT}`);
});