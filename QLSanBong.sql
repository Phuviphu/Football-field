USE master;
GO

-- 1. XÓA DATABASE CŨ (NẾU CÓ) ĐỂ LÀM SẠCH
IF EXISTS (SELECT * FROM sys.databases WHERE name = 'QLSanBong')
BEGIN
    ALTER DATABASE QLSanBong SET SINGLE_USER WITH ROLLBACK IMMEDIATE; -- Đá tất cả kết nối ra
    DROP DATABASE QLSanBong;
END
GO

-- 2. TẠO DATABASE MỚI
CREATE DATABASE QLSanBong;
GO
USE QLSanBong;
GO

-- =============================================
-- PHẦN 1: TẠO BẢNG (TABLES)
-- =============================================

-- Bảng Quản trị viên
CREATE TABLE Admin (
    AdminID INT IDENTITY(1,1) PRIMARY KEY,
    Username VARCHAR(50) NOT NULL UNIQUE,
    PasswordHash VARCHAR(255) NOT NULL,
    FullName NVARCHAR(100)
);

-- Bảng Khách Hàng
CREATE TABLE KhachHang (
    KhachHangID INT IDENTITY(1,1) PRIMARY KEY,
    FullName NVARCHAR(100) NOT NULL,
    Phone VARCHAR(20) NOT NULL UNIQUE, -- Để Varchar 20 cho thoải mái
    Email VARCHAR(100),
    PasswordHash VARCHAR(255),
    DiaChi NVARCHAR(200)
);

-- Bảng Chủ Sân
CREATE TABLE ChuSan (
    ChuSanID INT IDENTITY(1,1) PRIMARY KEY,
    FullName NVARCHAR(100) NOT NULL,
    Phone VARCHAR(20) NOT NULL UNIQUE,
    Email VARCHAR(100),
    PasswordHash VARCHAR(255),
    DiaChi NVARCHAR(200)
);

-- Bảng Sân Bóng (Đầy đủ cột cho Frontend)
CREATE TABLE SanBong (
    SanID INT IDENTITY(1,1) PRIMARY KEY,
    TenSan NVARCHAR(100) NOT NULL,
    DiaChi NVARCHAR(200),
    GiaTheoGio DECIMAL(18,0) NOT NULL, -- Giá tiền để số nguyên cho đẹp
    LoaiSan NVARCHAR(50),      -- VD: 'Sân 5', 'Sân 7'
    HinhAnh NVARCHAR(MAX),     -- Link ảnh
    MoTa NVARCHAR(MAX),        -- Mô tả sân
    TienIch NVARCHAR(MAX),     -- VD: 'Wifi, Giữ xe'
    DiemDanhGia FLOAT DEFAULT 5, 
    SoLuotReview INT DEFAULT 0,
    ChuSanID INT NOT NULL,
    FOREIGN KEY (ChuSanID) REFERENCES ChuSan(ChuSanID)
);

-- Bảng Đánh Giá (Reviews)
CREATE TABLE DanhGia (
    ReviewID INT IDENTITY(1,1) PRIMARY KEY,
    SanID INT,
    NguoiDung NVARCHAR(50),
    NoiDung NVARCHAR(MAX),
    SoSao INT,
    NgayDanhGia DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (SanID) REFERENCES SanBong(SanID) ON DELETE CASCADE
);

-- Bảng Lịch Đặt (Booking)
CREATE TABLE LichDat (
    LichDatID INT IDENTITY(1,1) PRIMARY KEY,
    KhachHangID INT NOT NULL,
    SanID INT NOT NULL,
    NgayDat DATE NOT NULL,
    GioBatDau VARCHAR(5) NOT NULL, -- Lưu dạng '09:00'
    GioKetThuc VARCHAR(5) NOT NULL, -- Lưu dạng '10:30'
    TinhTrang NVARCHAR(50) DEFAULT N'Chưa thanh toán', 
    NgayTao DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (KhachHangID) REFERENCES KhachHang(KhachHangID),
    FOREIGN KEY (SanID) REFERENCES SanBong(SanID) ON DELETE CASCADE
);

-- =============================================
-- PHẦN 2: THÊM DỮ LIỆU MẪU (SEED DATA)
-- =============================================

-- 1. Thêm Chủ Sân (Phùng Vĩnh Phước)
INSERT INTO ChuSan (FullName, Phone, Email, PasswordHash, DiaChi) 
VALUES (N'Phùng Vĩnh Phước', '0328665619', 'phuoc.pv@fufu.com', '123456', N'TP.HCM');

-- Lấy ID chủ sân vừa tạo
DECLARE @ChuSanID INT = (SELECT TOP 1 ChuSanID FROM ChuSan WHERE Phone = '0328665619');

-- 2. Thêm 2 Chi nhánh Sân bóng FuFu
-- CN Quận 6
INSERT INTO SanBong (TenSan, DiaChi, GiaTheoGio, LoaiSan, HinhAnh, ChuSanID, DiemDanhGia, SoLuotReview, MoTa, TienIch) 
VALUES (N'Sân bóng FuFu - CN Quận 6', N'123 Đường Hậu Giang, Quận 6, TP.HCM', 180000, N'Sân 5, Sân 7', 
'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=800', @ChuSanID, 4.8, 15, 
N'Sân cỏ nhân tạo mới 100%, đạt chuẩn FIFA. Hệ thống đèn LED chiếu sáng hiện đại.', N'Wifi, Canteen, Giữ xe miễn phí, Trà đá');

-- CN Tân Phú
INSERT INTO SanBong (TenSan, DiaChi, GiaTheoGio, LoaiSan, HinhAnh, ChuSanID, DiemDanhGia, SoLuotReview, MoTa, TienIch) 
VALUES (N'Sân bóng FuFu - CN Tân Phú', N'456 Đường Tân Kỳ Tân Quý, Quận Tân Phú, TP.HCM', 200000, N'Sân 5, Sân 7', 
'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800', @ChuSanID, 4.5, 28, 
N'Không gian thoáng mát, mặt sân êm, chống trơn trượt. Phù hợp đá giải.', N'Wifi, Phòng thay đồ, Cho thuê giày, Trọng tài');

-- 3. Thêm Đánh giá mẫu
INSERT INTO DanhGia (SanID, NguoiDung, NoiDung, SoSao)
SELECT SanID, N'Nguyễn Văn A', N'Sân đẹp, giá hợp lý, chủ sân nhiệt tình!', 5 FROM SanBong WHERE TenSan LIKE '%Quận 6%';

INSERT INTO DanhGia (SanID, NguoiDung, NoiDung, SoSao)
SELECT SanID, N'Trần Thị B', N'Cỏ hơi cũ nhưng đá vẫn ổn. Giá rẻ so với mặt bằng chung.', 4 FROM SanBong WHERE TenSan LIKE '%Quận 6%';

INSERT INTO DanhGia (SanID, NguoiDung, NoiDung, SoSao)
SELECT SanID, N'Lê Văn C', N'Sân Tân Phú rộng rãi, đèn sáng trưng.', 5 FROM SanBong WHERE TenSan LIKE '%Tân Phú%';

-- 4. Thêm Khách hàng Test
INSERT INTO KhachHang (FullName, Phone, Email, PasswordHash, DiaChi)
VALUES (N'Khách Hàng Test', '0999999999', 'test@fufu.com', '123', N'TP.HCM');

-- 5. Thêm Lịch đặt Mẫu (Để test chức năng chặn giờ)
-- Đặt Sân Quận 6 (ID 1) vào ngày 03/12/2025 lúc 09:00 - 10:30
DECLARE @KhachID INT = (SELECT TOP 1 KhachHangID FROM KhachHang WHERE Phone = '0999999999');
DECLARE @SanQ6ID INT = (SELECT TOP 1 SanID FROM SanBong WHERE TenSan LIKE '%Quận 6%');

INSERT INTO LichDat (KhachHangID, SanID, NgayDat, GioBatDau, GioKetThuc, TinhTrang)
VALUES (@KhachID, @SanQ6ID, '2025-12-03', '09:00', '10:30', N'Đã thanh toán');

-- =============================================
-- KIỂM TRA KẾT QUẢ
-- =============================================
SELECT 'San Bong' as Bang, * FROM SanBong;
SELECT 'Lich Dat' as Bang, * FROM LichDat;

USE QLSanBong;
GO

-- 1. Đảm bảo Khách Hàng đã tồn tại
IF NOT EXISTS (SELECT * FROM KhachHang WHERE Phone = '0999999999')
BEGIN
    INSERT INTO KhachHang (FullName, Phone, Email, PasswordHash, DiaChi)
    VALUES (N'Khách Hàng Test', '0999999999', 'test@fufu.com', '123', N'TP.HCM');
END

-- 2. Xóa lịch đặt cũ (nếu có) để tránh lỗi trùng
DELETE FROM LichDat WHERE NgayDat = '2025-12-03';

-- 3. CHÈN LỊCH ĐẶT (Cách mới: Tìm ID trực tiếp trong câu lệnh)
INSERT INTO LichDat (KhachHangID, SanID, NgayDat, GioBatDau, GioKetThuc, TinhTrang)
VALUES (
    -- Tìm ID Khách trực tiếp (Không cần khai báo biến)
    (SELECT TOP 1 KhachHangID FROM KhachHang WHERE Phone = '0999999999'),
    
    -- Tìm ID Sân trực tiếp
    (SELECT TOP 1 SanID FROM SanBong WHERE TenSan LIKE N'%Quận 6%'),
    
    '2025-12-03', -- Ngày đặt
    '09:00',      -- Bắt đầu
    '10:30',      -- Kết thúc
    N'Đã thanh toán'
);

-- 4. Kiểm tra lại xem dữ liệu đã vào chưa
SELECT * FROM LichDat;