# NazovHybrid Investment Platform v6.5

🚀 **Hedge fund-style portfolio management and stock screening platform**

A full-stack investment platform built with Next.js, FastAPI, and PostgreSQL. Features include stock screening, portfolio optimization using Modern Portfolio Theory, historical backtesting, and multi-currency support.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-6.5.0-green.svg)

## ✨ Features

- **📊 Stock Screener** - Filter stocks by P/E, PEG, revenue growth, fair value upside, and more
- **⚡ Portfolio Optimizer** - Mean-Variance Optimization with Sharpe ratio maximization
- **📈 Backtest Engine** - Test strategies against historical data with benchmark comparison
- **💰 Multi-Currency** - Support for USD, EUR, GBP, TRY, and more
- **🎨 Premium Dark UI** - Glassmorphism design with interactive Plotly.js charts
- **🐳 Docker Ready** - One-command local development setup

## 🏗️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, React 18, TypeScript |
| Backend | FastAPI, Python 3.11 |
| Database | PostgreSQL 15 |
| Charts | Plotly.js |
| Stock Data | yfinance |
| Containerization | Docker & Docker Compose |

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 20+ (for local development)
- Python 3.11+ (for local development)

### Using Docker (Recommended)

```bash
# Clone the repository
git clone https://github.com/yourusername/nazovhybrid.git
cd nazovhybrid

# Copy environment file
cp .env.example .env

# Start all services
docker-compose up --build

# Access the app
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000/docs
```

### Local Development

```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload

# Frontend (in a new terminal)
cd frontend
npm install
npm run dev
```

## 📁 Project Structure

```
nazovhybrid/
├── backend/
│   ├── main.py              # FastAPI application
│   ├── database.py          # SQLAlchemy configuration
│   ├── models.py            # Database models
│   ├── routers/             # API endpoints
│   │   ├── screener.py
│   │   ├── optimizer.py
│   │   ├── backtest.py
│   │   ├── portfolio.py
│   │   └── currency.py
│   ├── services/            # Business logic
│   │   ├── stock_data.py    # yfinance integration
│   │   ├── screener.py      # Stock screening logic
│   │   ├── optimizer.py     # Portfolio optimization
│   │   ├── backtest.py      # Historical backtesting
│   │   └── currency.py      # FX rates & conversion
│   └── requirements.txt
├── frontend/
│   ├── app/
│   │   ├── page.tsx         # Dashboard
│   │   ├── screener/        # Stock Screener
│   │   ├── optimizer/       # Portfolio Optimizer
│   │   ├── backtest/        # Backtest
│   │   └── portfolio/       # Portfolio Management
│   ├── lib/api.ts           # API client
│   └── package.json
├── docker-compose.yml
└── .env.example
```

## 🔌 API Endpoints

### Screener
- `GET /api/screener` - Get screened stocks with filters
- `GET /api/screener/top-picks` - Get top N investment picks
- `GET /api/screener/value` - Get value stocks
- `GET /api/screener/growth` - Get growth stocks

### Optimizer
- `POST /api/optimizer/optimize` - Optimize portfolio allocation
- `GET /api/optimizer/efficient-frontier` - Get efficient frontier data
- `GET /api/optimizer/risk-profiles` - Get available risk profiles

### Backtest
- `POST /api/backtest/run` - Run historical backtest
- `POST /api/backtest/compare` - Compare multiple strategies
- `GET /api/backtest/quick` - Quick backtest with query params

### Portfolio
- `GET /api/portfolio` - Get all portfolios
- `POST /api/portfolio` - Create new portfolio
- `GET /api/portfolio/{id}/summary` - Get portfolio summary

### Currency
- `GET /api/currency/rates` - Get exchange rates
- `GET /api/currency/convert` - Convert amount between currencies

## 🎯 Screener Criteria

| Metric | Default | Description |
|--------|---------|-------------|
| Max P/E | 25 | Price-to-earnings ratio |
| Max PEG | 1.5 | Price/earnings to growth ratio |
| Min Revenue Growth | 10% | Year-over-year revenue growth |
| Min Upside | 15% | Fair value upside potential |
| Min Score | 60 | Investment score (0-100) |

## 🔧 Configuration

### Environment Variables

```env
# Database
POSTGRES_USER=nazov
POSTGRES_PASSWORD=nazov123
POSTGRES_DB=nazovhybrid

# Backend
DATABASE_URL=postgresql://nazov:nazov123@db:5432/nazovhybrid
CORS_ORIGINS=http://localhost:3000

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## 🚢 Deployment

### Vercel (Frontend)

1. Connect your GitHub repository to Vercel
2. Set environment variable: `NEXT_PUBLIC_API_URL=https://your-api-url.com`
3. Deploy!

### Render.com (Backend)

1. Create a new Web Service
2. Connect your GitHub repository
3. Set build command: `pip install -r requirements.txt`
4. Set start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Add PostgreSQL database

## 🗺️ Roadmap

- [ ] User authentication (JWT + OAuth)
- [ ] Premium API integration (Nasdaq Data Link)
- [ ] Mobile responsive optimization
- [ ] Email alerts for price targets
- [ ] AI-powered recommendations

## 📄 License

MIT License - see [LICENSE](LICENSE) for details

## 👨‍💻 Author

Built with ❤️ for smart investors

---

**⚠️ Disclaimer**: This platform is for educational and informational purposes only. Not financial advice. Past performance does not guarantee future results.
