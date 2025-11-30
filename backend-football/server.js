// File: backend-football/server.js
const express = require('express');
const sql = require('mssql');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Cấu hình kết nối SQL
const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PWD,
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    options: { encrypt: false, trustServerCertificate: true }
};

// --- 1. ROUTE CHÀO MỪNG (Để hết lỗi Cannot GET /) ---
app.get('/', (req, res) => {
    res.send('<h1>⚽ Server Sân Bóng FuFu đang chạy ngon lành! 🚀</h1>');
});

// --- 2. CÁC API CHÍNH ---

// API: Lấy danh sách sân
app.get('/api/sanbong', async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().query('SELECT * FROM SanBong');
        res.json(result.recordset);
    } catch (err) { res.status(500).send(err.message); }
});

// API: Thêm sân mới (Admin)
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
            .query(`
                INSERT INTO SanBong (TenSan, DiaChi, GiaTheoGio, LoaiSan, HinhAnh, MoTa, TienIch, ChuSanID, DiemDanhGia, SoLuotReview)
                VALUES (@TenSan, @DiaChi, @GiaTheoGio, @LoaiSan, @HinhAnh, @MoTa, @TienIch, 1, 5, 0)
            `);
        res.json({ message: 'Thêm sân thành công!' });
    } catch (err) { res.status(500).send(err.message); }
});

// API: Xóa sân (Admin)
app.delete('/api/sanbong/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await sql.connect(dbConfig);
        // Lưu ý: Cần xóa ràng buộc khóa ngoại ở bảng con trước nếu có (LichDat, DanhGia)
        // Ở đây xóa tạm bảng cha để demo
        await pool.request().input('SanID', sql.Int, id).query('DELETE FROM SanBong WHERE SanID = @SanID');
        res.json({ message: 'Xóa sân thành công!' });
    } catch (err) { res.status(500).send(err.message); }
});

// API: Kiểm tra giờ bận (Fix lỗi múi giờ bằng LEFT CAST)
app.get('/api/check-trung-gio', async (req, res) => {
    try {
        const { sanId, ngay } = req.query;
        const pool = await sql.connect(dbConfig);
        
        // Lấy giờ phút chính xác từ SQL (cắt chuỗi HH:mm)
        const query = `
            SELECT 
                LEFT(CAST(GioBatDau AS VARCHAR), 5) as start, 
                LEFT(CAST(GioKetThuc AS VARCHAR), 5) as endTime
            FROM LichDat 
            WHERE SanID = @SanID 
            AND NgayDat = @Ngay 
            AND TinhTrang != N'Đã hủy'
        `;
        
        const result = await pool.request()
            .input('SanID', sql.Int, sanId)
            .input('Ngay', sql.Date, ngay)
            .query(query);

        const busySlots = result.recordset.map(item => ({
            start: item.start,
            end: item.endTime
        }));
        
        res.json(busySlots);
    } catch (err) { res.status(500).send(err.message); }
});

// API: Đặt sân (Fix lỗi cú pháp chữ N)
app.post('/api/dat-san', async (req, res) => {
    try {
        const { SanID, KhachHangID, NgayDat, GioBatDau, GioKetThuc, TenKhach, SDT } = req.body;
        const pool = await sql.connect(dbConfig);

        // 1. Xử lý khách hàng (Tìm hoặc Tạo mới)
        let khID = KhachHangID;
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

        // 2. Lưu lịch đặt (Đã bỏ chữ N trước biến biến)
        await pool.request()
            .input('KhachHangID', sql.Int, khID)
            .input('SanID', sql.Int, SanID)
            .input('NgayDat', sql.Date, NgayDat)
            .input('GioBatDau', sql.VarChar, GioBatDau)
            .input('GioKetThuc', sql.VarChar, GioKetThuc)
            .input('TinhTrang', sql.NVarChar, 'Đã thanh toán') // Sửa lỗi ở đây
            .query(`
                INSERT INTO LichDat (KhachHangID, SanID, NgayDat, GioBatDau, GioKetThuc, TinhTrang)
                VALUES (@KhachHangID, @SanID, @NgayDat, @GioBatDau, @GioKetThuc, @TinhTrang)
            `);

        res.json({ message: 'Đặt sân thành công!' });
    } catch (err) {
        console.error(err);
        res.status(500).send(err.message);
    }
});

// Chạy Server
app.listen(PORT, () => {
    console.log(`🚀 Server đang chạy tại: http://localhost:${PORT}`);
});