# Product Requirement Document (PRD)

# Blockchain Web Game – Pay To Play System

---

# 1. Tổng quan dự án

## 1.1 Mục tiêu

Xây dựng hệ thống thanh toán cho web game blockchain, trong đó người chơi phải sử dụng token của dự án để tham gia chơi game.

Mỗi lượt chơi sẽ yêu cầu người dùng thanh toán một khoản phí cố định bằng token của dự án trên blockchain riêng.

---

# 1.2 Mô hình hoạt động

- Người dùng truy cập web game
- Kết nối ví blockchain
- Hệ thống kiểm tra số dư token
- Khi người dùng bấm chơi:
  - Hệ thống yêu cầu thanh toán token
- Sau khi thanh toán thành công:
  - Người dùng được phép vào game

---

# 1.3 Quy tắc hệ thống

| Quy tắc | Mô tả |
|---|---|
| Mỗi lần chơi | Mỗi game session yêu cầu thanh toán |
| Free trial | Không hỗ trợ |
| Token thanh toán | Token của dự án |
| Blockchain | Chain riêng |
| Smart contract | Chỉ nhận token |
| Treasury | Toàn bộ token thu được chuyển về treasury |
| Unlock gameplay | Chỉ khi transaction thành công |

---

# 2. Kiến trúc hệ thống

## 2.1 Thành phần hệ thống

### Frontend
- Web game
- Wallet integration
- Transaction handling
- Session management

### Blockchain Layer
- Token contract
- Payment contract

### Backend
- Verify transaction
- Anti-cheat
- Session validation
- Logging

---

# 2.2 Kiến trúc tổng thể

```text
User
 ↓
Frontend Web Game
 ↓
Wallet
 ↓
Payment Contract
 ↓
Treasury Wallet
```

---

# 3. User Flow

# 3.1 Connect Wallet

## Mô tả
Người dùng kết nối ví blockchain với hệ thống.

## Kết quả
- Hệ thống nhận địa chỉ ví
- Kiểm tra đúng network blockchain

---

# 3.2 Kiểm tra token

## Mô tả
Hệ thống kiểm tra số dư token của người dùng.

## Điều kiện

### Thành công
- User có đủ token

### Thất bại
- Không đủ token
- Hiển thị thông báo lỗi

---

# 3.3 Thanh toán để chơi

## Mô tả
Khi người dùng bấm Play, hệ thống bắt đầu quy trình thanh toán.

## Các bước

### Bước 1
Approve token cho payment contract

### Bước 2
Gọi transaction thanh toán

### Bước 3
Chờ blockchain xác nhận transaction

### Bước 4
Verify transaction

### Bước 5
Unlock gameplay

---

# 3.4 Bắt đầu game

## Điều kiện bắt buộc

- Transaction thành công
- Backend verify thành công

## Kết quả
- Tạo game session
- Cho phép người chơi vào game

---

# 4. Functional Requirements

# 4.1 Wallet Integration

## Yêu cầu

- Hỗ trợ kết nối ví blockchain
- Tự động detect network
- Hiển thị địa chỉ ví
- Hiển thị trạng thái kết nối

---

# 4.2 Token Payment

## Yêu cầu

- Thanh toán bằng token của dự án
- Hỗ trợ approve token
- Hỗ trợ transfer token
- Verify transaction status

---

# 4.3 Payment Logic

## Quy tắc

| Điều kiện | Hành động |
|---|---|
| User đủ token | Cho phép thanh toán |
| User không đủ token | Từ chối |
| Transaction fail | Không unlock game |
| Transaction success | Unlock game |

---

# 4.4 Treasury System

## Yêu cầu

- Toàn bộ token được chuyển về treasury wallet
- Không giữ token trong frontend
- Không giữ token trong backend

---

# 4.5 Session Control

## Yêu cầu

- Mỗi payment chỉ tạo được một game session
- Không cho phép reuse transaction
- Không cho phép bypass payment

---

# 5. Backend Requirements

# 5.1 Verify Transaction

## Backend phải:

- Kiểm tra txHash tồn tại
- Kiểm tra transaction success
- Kiểm tra đúng contract
- Kiểm tra đúng user
- Kiểm tra event payment

---

# 5.2 Anti Cheat

## Yêu cầu

- Không cho phép fake txHash
- Không cho phép duplicate session
- Không unlock game nếu chưa verify

---

# 5.3 Logging

## Hệ thống cần lưu:

| Dữ liệu | Mục đích |
|---|---|
| Wallet address | Tracking |
| txHash | Verify |
| Timestamp | Audit |
| Session ID | Gameplay |

---

# 6. Smart Contract Requirements

# 6.1 Chức năng

## Contract phải:

- Nhận token từ user
- Chuyển token tới treasury
- Emit payment event

---

# 6.2 Không yêu cầu

## Contract không cần:

- Logic gameplay
- Matchmaking
- Reward system
- Inventory system

---

# 7. Non Functional Requirements

# 7.1 Security

## Yêu cầu

- Verify transaction server-side
- Chống fake payment
- Chống replay attack
- Chống spam request

---

# 7.2 Performance

## Yêu cầu

- Transaction processing nhanh
- Verify nhanh
- Không delay gameplay quá lâu

---

# 7.3 UX/UI

## Yêu cầu

- Hiển thị loading transaction
- Hiển thị trạng thái pending
- Hiển thị lỗi rõ ràng
- Hiển thị success state

---

# 8. Error Handling

# 8.1 Các trường hợp lỗi

| Tình huống | Xử lý |
|---|---|
| Reject approve | Stop flow |
| Reject payment | Stop flow |
| Không đủ token | Show error |
| Không đủ gas | Show warning |
| Pending lâu | Show loading |
| Network sai | Yêu cầu switch network |

---

# 9. Security Risks

# 9.1 Các rủi ro

## Fake transaction
Người dùng gửi txHash giả.

### Giải pháp
- Backend verify blockchain

---

## Replay session

Người dùng reuse transaction cũ.

### Giải pháp
- Session unique validation

---

## Spam play button

Người dùng spam request.

### Giải pháp
- Disable button khi pending

---

# 10. UX Recommendations

# 10.1 Approve tối ưu

## Đề xuất

Người dùng chỉ approve một lần với unlimited allowance.

## Lợi ích

- Giảm số lượng transaction
- UX tốt hơn
- Giảm tỷ lệ drop user

---

# 10.2 Loading State

## UI cần hiển thị:

- Waiting wallet confirmation
- Waiting blockchain confirmation
- Payment success
- Payment failed

---

# 11. Deployment Requirements

# 11.1 Blockchain

## Cần chuẩn bị

- Token contract
- Payment contract
- Treasury wallet
- RPC endpoint

---

# 11.2 Frontend

## Cần cấu hình

- Contract address
- Token address
- Chain ID
- RPC URL

---

# 11.3 Backend

## Cần cấu hình

- RPC connection
- Verify service
- Database
- Session management

---

# 12. Future Upgrade Suggestions

# 12.1 Subscription Pass

Cho phép:
- Trả phí theo ngày
- Trả phí theo tuần
- Unlimited play

---

# 12.2 NFT Pass

NFT holder:
- Miễn phí chơi
- Discount fee
- VIP access

---

# 12.3 Dynamic Fee

Phí thay đổi theo:
- Rank
- Game mode
- Event
- Season

---

# 12.4 Reward System

- Leaderboard
- Tournament
- Token reward
- NFT reward

---

# 13. Tóm tắt hệ thống

## Core Logic

```text
1 Payment
=
1 Game Session
=
1 User Access
```

---

## Flow hoàn chỉnh

```text
Connect Wallet
    ↓
Check Token Balance
    ↓
Approve Token
    ↓
Pay Token
    ↓
Verify Transaction
    ↓
Unlock Gameplay
```

---

# END DOCUMENT