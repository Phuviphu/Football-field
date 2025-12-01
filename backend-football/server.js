const express = require('express');
const sql = require('mssql');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Database Configuration
const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PWD,
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    options: { encrypt: false, trustServerCertificate: true }
};

app.get('/', (req, res) => res.send('<h1>⚽ Server Sân Bóng FuFu đang chạy ngon lành! 🚀</h1>'));

// --- 1. GET ALL FIELDS ---
app.get('/api/sanbong', async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().query('SELECT * FROM SanBong');
        res.json(result.recordset);
    } catch (err) { res.status(500).send(err.message); }
});

// --- 2. GET BOOKING LIST FOR ADMIN (MỚI) ---
app.get('/api/bookings-list', async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const query = `
            SELECT 
                ld.*, 
                sb.TenSan, 
                kh.FullName AS KhachHangName,
                kh.Phone AS KhachHangPhone
            FROM LichDat ld
            JOIN SanBong sb ON ld.SanID = sb.SanID
            JOIN KhachHang kh ON ld.KhachHangID = kh.KhachHangID
            ORDER BY ld.NgayDat DESC, ld.GioBatDau DESC
        `;
        const result = await pool.request().query(query);
        res.json(result.recordset);
    } catch (err) { res.status(500).send(err.message); }
});


// --- 3. CHECK AVAILABILITY ---
app.get('/api/check-trung-gio', async (req, res) => {
    try {
        const { sanId, ngay, loaiSan } = req.query;
        const pool = await sql.connect(dbConfig);
        
        const query = `
            SELECT 
                LEFT(CAST(GioBatDau AS VARCHAR), 5) as start, 
                LEFT(CAST(GioKetThuc AS VARCHAR), 5) as endTime
            FROM LichDat 
            WHERE SanID = @SanID 
            AND NgayDat = @Ngay 
            AND LoaiSan = @LoaiSan 
            AND TinhTrang != N'Đã hủy'
        `;
        
        const result = await pool.request()
            .input('SanID', sql.Int, sanId)
            .input('Ngay', sql.Date, ngay)
            .input('LoaiSan', sql.NVarChar, loaiSan)
            .query(query);

        const busySlots = result.recordset.map(item => ({
            start: item.start,
            end: item.endTime
        }));
        
        res.json(busySlots);
    } catch (err) { res.status(500).send(err.message); }
});

// --- 4. CREATE BOOKING (FIXED) ---
app.post('/api/dat-san', async (req, res) => {
    try {
        const { SanID, NgayDat, GioBatDau, GioKetThuc, TenKhach, SDT, LoaiSan } = req.body;
        const pool = await sql.connect(dbConfig);

        // Find or Create Customer
        let khID;
        const khCheck = await pool.request().input('Phone', sql.VarChar, SDT).query("SELECT KhachHangID FROM KhachHang WHERE Phone = @Phone");
        
        if (khCheck.recordset.length > 0) {
            khID = khCheck.recordset[0].KhachHangID;
        } else {
            const newKh = await pool.request().input('Fullname', sql.NVarChar, TenKhach).input('Phone', sql.VarChar, SDT)
                .query("INSERT INTO KhachHang (FullName, Phone) OUTPUT INSERTED.KhachHangID VALUES (@Fullname, @Phone)");
            khID = newKh.recordset[0].KhachHangID;
        }

        // Insert Booking
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
        console.error("SQL Error in POST /dat-san:", err);
        res.status(500).send(err.message);
    }
});

// --- 5. ADMIN CRUD (Khôi phục code Admin) ---
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

app.delete('/api/sanbong/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await sql.connect(dbConfig);
        // Lưu ý: Cần xóa ràng buộc khóa ngoại ở bảng con (LichDat, DanhGia) nếu cần, nhưng do dùng ON DELETE CASCADE nên xóa trực tiếp được
        await pool.request().input('SanID', sql.Int, id).query('DELETE FROM SanBong WHERE SanID = @SanID');
        res.json({ message: 'Xóa sân thành công!' });
    } catch (err) { res.status(500).send(err.message); }
});

app.listen(PORT, () => {
    console.log(`🚀 Server đang chạy tại: http://localhost:${PORT}`);
});