CREATE DATABASE QLSanBong;
GO
USE QLSanBong;
GO

CREATE TABLE Admin (
    AdminID INT IDENTITY(1,1) PRIMARY KEY,
    Username VARCHAR(50) NOT NULL UNIQUE,
    PasswordHash VARCHAR(255) NOT NULL,
    FullName NVARCHAR(100)
);

CREATE TABLE KhachHang (
    KhachHangID INT IDENTITY(1,1) PRIMARY KEY,
    FullName NVARCHAR(100) NOT NULL,
    Phone VARCHAR(20) NOT NULL UNIQUE,
    Email VARCHAR(100),
    PasswordHash VARCHAR(255),
    DiaChi NVARCHAR(200)
);

CREATE TABLE ChuSan (
    ChuSanID INT IDENTITY(1,1) PRIMARY KEY,
    FullName NVARCHAR(100) NOT NULL,
    Phone VARCHAR(20) NOT NULL UNIQUE,
    Email VARCHAR(100),
    PasswordHash VARCHAR(255),
    DiaChi NVARCHAR(200)
);

CREATE TABLE SanBong (
    SanID INT IDENTITY(1,1) PRIMARY KEY,
    TenSan NVARCHAR(100) NOT NULL,
    DiaChi NVARCHAR(200),
    GiaTheoGio DECIMAL(18,0) NOT NULL,
    LoaiSan NVARCHAR(50),
    HinhAnh NVARCHAR(MAX),
    MoTa NVARCHAR(MAX),
    TienIch NVARCHAR(MAX),
    DiemDanhGia FLOAT DEFAULT 5, 
    SoLuotReview INT DEFAULT 0,
    ChuSanID INT NOT NULL,
    FOREIGN KEY (ChuSanID) REFERENCES ChuSan(ChuSanID)
);

CREATE TABLE DanhGia (
    ReviewID INT IDENTITY(1,1) PRIMARY KEY,
    SanID INT,
    NguoiDung NVARCHAR(50),
    NoiDung NVARCHAR(MAX),
    SoSao INT,
    NgayDanhGia DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (SanID) REFERENCES SanBong(SanID) ON DELETE CASCADE
);

CREATE TABLE LichDat (
    LichDatID INT IDENTITY(1,1) PRIMARY KEY,
    KhachHangID INT NOT NULL,
    SanID INT NOT NULL,
    NgayDat DATE NOT NULL,
    GioBatDau VARCHAR(5) NOT NULL,
    GioKetThuc VARCHAR(5) NOT NULL,
    LoaiSan NVARCHAR(50), 
    TinhTrang NVARCHAR(50) DEFAULT N'Chưa thanh toán',
    NgayTao DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (KhachHangID) REFERENCES KhachHang(KhachHangID),
    FOREIGN KEY (SanID) REFERENCES SanBong(SanID) ON DELETE CASCADE
);

-- Bảng Tin Nhắn (Chat System) - Cập nhật mới nhất
CREATE TABLE TinNhan (
    MessageID INT IDENTITY(1,1) PRIMARY KEY,
    KhachHangID INT,
    NoiDung NVARCHAR(MAX),
    IsAdminSender BIT DEFAULT 0, -- 0: Khách gửi, 1: Admin gửi
    IsRead BIT DEFAULT 0,        -- 0: Chưa xem, 1: Đã xem
    ThoiGian DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (KhachHangID) REFERENCES KhachHang(KhachHangID) ON DELETE CASCADE
);


-- 1. Thêm Chủ Sân
INSERT INTO ChuSan (FullName, Phone, Email, PasswordHash, DiaChi) 
VALUES (N'Phùng Vĩnh Phước', '0328665619', 'phuoc.pv@fufu.com', '123456', N'TP.HCM');

DECLARE @ChuSanID INT = (SELECT TOP 1 ChuSanID FROM ChuSan WHERE Phone = '0328665619');

-- 2. Thêm Sân bóng
INSERT INTO SanBong (TenSan, DiaChi, GiaTheoGio, LoaiSan, HinhAnh, ChuSanID, DiemDanhGia, SoLuotReview, MoTa, TienIch) 
VALUES 
(N'Sân bóng FuFu - CN Quận 6', N'123 Đường Hậu Giang, Quận 6, TP.HCM', 180000, N'Sân 5, Sân 7', 
'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=800', @ChuSanID, 4.8, 15, 
N'Sân cỏ nhân tạo mới 100%, đạt chuẩn FIFA. Hệ thống đèn LED chiếu sáng hiện đại.', N'Wifi, Canteen, Giữ xe miễn phí, Trà đá'),

(N'Sân bóng FuFu - CN Tân Phú', N'456 Đường Tân Kỳ Tân Quý, Quận Tân Phú, TP.HCM', 200000, N'Sân 5, Sân 7', 
'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800', @ChuSanID, 4.5, 28, 
N'Không gian thoáng mát, mặt sân êm, chống trơn trượt. Phù hợp đá giải.', N'Wifi, Phòng thay đồ, Cho thuê giày, Trọng tài');

-- 3. Thêm Đánh giá 
INSERT INTO DanhGia (SanID, NguoiDung, NoiDung, SoSao)
SELECT SanID, N'Nguyễn Văn A', N'Sân đẹp, giá hợp lý!', 5 FROM SanBong WHERE TenSan LIKE N'%Quận 6%';

INSERT INTO DanhGia (SanID, NguoiDung, NoiDung, SoSao)
SELECT SanID, N'Trần Thị B', N'Chủ sân nhiệt tình.', 4 FROM SanBong WHERE TenSan LIKE N'%Quận 6%';

SELECT * FROM KhachHang;
SELECT * FROM LichDat;