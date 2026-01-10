# 🎰 Casino Royale - Play Money Casino

A full-featured casino simulation platform built with Next.js, featuring multiple games, user accounts, wallet management, and an admin panel. **This is a play-money only platform - no real gambling involved.**

## ⚠️ Important Disclaimer

- This platform uses **virtual play-money tokens only**
- Tokens have **no monetary value** and cannot be exchanged for real currency
- No real money deposits or withdrawals are supported
- This is for **entertainment and educational purposes only**
- Practice responsible gaming habits

## 🚀 Features

### Games (8 total)
- **Roulette** - European single-zero roulette with all standard bets
- **Blackjack** - Classic 21 with hit, stand, double, and split
- **Slots** - 5-reel, 3-row video slots with paylines and scatters
- **Dice** - Hi/Lo dice prediction game
- **Mines** - Minesweeper-style risk game
- **Plinko** - Ball-drop game with multiple risk levels
- **Wheel of Fortune** - Spin the wheel for prizes
- **Video Poker** - Jacks or Better with optimal play hints

### Platform Features
- 🔐 Secure authentication with bcrypt password hashing
- 💰 Wallet system with transaction history
- ✅ Provably fair system - verify all game outcomes
- 👑 Admin panel for user and token management
- 📊 Audit logs for all admin actions
- 🎯 Rate limiting to prevent abuse
- 📱 Responsive design with modern UI

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL + Prisma ORM
- **Styling**: TailwindCSS + shadcn/ui
- **Auth**: Custom JWT sessions with bcrypt
- **RNG**: Node.js crypto (cryptographically secure)

## 📦 Installation

### Prerequisites
- Node.js 18+
- PostgreSQL database
- npm or yarn

### Setup

1. **Clone the repository**
```bash
git clone <repository-url>
cd casino1
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment**
```bash
cp .env.example .env
```

Edit `.env` with your settings:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/casino"
JWT_SECRET="your-secure-secret-key-min-32-chars"
SESSION_COOKIE_NAME="casino_session"
ADMIN_DEFAULT_PASSWORD="YourSecureAdminPassword123"
```

4. **Set up database**
```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Seed the database (creates admin user and game configs)
npx prisma db seed
```

5. **Start development server**
```bash
npm run dev
```

Visit `http://localhost:3000` to access the app.

## 👤 Default Admin Account

After seeding, an admin account is created:
- **Email**: admin@local
- **Password**: Set via `ADMIN_DEFAULT_PASSWORD` env var (default: `Prishtina123` in dev)
- ⚠️ Admin must change password on first login

## 📁 Project Structure

```
casino1/
├── app/                    # Next.js App Router pages
│   ├── admin/             # Admin panel pages
│   ├── api/               # API routes
│   ├── auth/              # Auth pages (login, register)
│   ├── games/             # Game pages
│   └── lobby/             # Game lobby
├── components/ui/         # UI components (shadcn/ui style)
├── hooks/                 # React hooks
├── lib/                   # Core libraries
│   ├── games/            # Game logic modules
│   ├── auth.ts           # Authentication
│   ├── wallet.ts         # Wallet management
│   ├── fairness.ts       # Provably fair system
│   ├── rng.ts            # Random number generation
│   └── validations.ts    # Zod schemas
└── prisma/               # Database schema and migrations
```

## 🎲 Provably Fair System

All games use a provably fair system that allows verification of outcomes:

1. **Server Seed**: Generated per user session, hashed and shown before play
2. **Client Seed**: User-provided or random, can be changed anytime
3. **Nonce**: Increments with each bet
4. **Outcome**: Generated via HMAC-SHA256(serverSeed, clientSeed:nonce)

After revealing the server seed, users can verify all past outcomes.

## 🔒 Security Features

- Password hashing with bcrypt (12 rounds)
- JWT sessions with HTTP-only cookies
- Rate limiting on auth and betting endpoints
- Input validation with Zod schemas
- SQL injection prevention via Prisma
- XSS prevention via React/Next.js
- Audit logging for admin actions

## 📊 Game RTPs (Return to Player)

| Game | RTP | House Edge |
|------|-----|------------|
| Roulette | 97.3% | 2.7% |
| Blackjack | 99.5% | 0.5% |
| Slots | 96% | 4% |
| Dice | 99% | 1% |
| Mines | 99% | 1% |
| Plinko | 99% | 1% |
| Wheel | 98% | 2% |
| Video Poker | 99.54% | 0.46% |

## 🧪 Development Commands

```bash
# Development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint

# Prisma commands
npx prisma studio      # Open database GUI
npx prisma db push     # Push schema changes
npx prisma db seed     # Seed database
```

## 📝 License

This project is for educational purposes only. Not for commercial use with real money.

## 🙏 Responsible Gaming

While this is a play-money platform, we encourage healthy gaming habits:
- Set time limits for gaming sessions
- Take regular breaks
- Remember: the house always has an edge
- If gaming stops being fun, stop playing

For gambling concerns, visit:
- National Council on Problem Gambling: 1-800-522-4700
- Gamblers Anonymous: www.gamblersanonymous.org
