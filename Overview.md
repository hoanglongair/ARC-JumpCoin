# Blockchain Web Game – Pay To Play

Web game blockchain yêu cầu người chơi thanh toán bằng project token để tham gia mỗi game session.

## Core Concept

```text
1 Payment = 1 Game Session
```

Người dùng phải:

1. Connect wallet
2. Có đủ token
3. Approve token
4. Thanh toán token
5. Backend verify transaction
6. Unlock gameplay

---

# System Architecture

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

## Components

### Frontend

* Wallet integration
* Transaction handling
* Session management
* Gameplay UI

### Blockchain

* Project token
* Payment contract

### Backend

* Transaction verification
* Session validation
* Anti-cheat
* Logging

---

# Payment Flow

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

# Functional Requirements

## Wallet

* Connect blockchain wallet
* Detect network
* Display wallet status

## Payment

* Pay using project token
* Approve token spending
* Verify transaction success

## Session Control

* One payment creates one session
* Prevent transaction reuse
* Prevent payment bypass

## Treasury

* All tokens go directly to treasury wallet
* Frontend/backend never store user funds

---

# Backend Verification

Backend must verify:

* Valid txHash
* Successful transaction
* Correct contract
* Correct wallet
* Payment event emitted

---

# Security

* Server-side transaction verification
* Prevent fake txHash
* Prevent replay attack
* Prevent duplicate sessions
* Disable spam play requests

---

# UX Recommendations

* Show transaction loading states
* Show pending/success/fail status
* Support one-time unlimited approve for better UX

---

# Deployment Requirements

## Blockchain

* Token contract
* Payment contract
* Treasury wallet
* RPC endpoint

## Frontend

* Contract address
* Token address
* Chain ID
* RPC URL

## Backend

* RPC connection
* Verify service
* Database
* Session management

---

# Future Upgrades

* Subscription pass
* NFT access pass
* Dynamic fee system
* Reward & leaderboard system
