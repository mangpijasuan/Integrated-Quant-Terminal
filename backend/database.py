import logging
import aiosqlite
from config import settings

logger = logging.getLogger(__name__)
DB = settings.database_url


async def get_db():
    async with aiosqlite.connect(DB) as db:
        db.row_factory = aiosqlite.Row
        yield db


async def init_db():
    async with aiosqlite.connect(DB) as db:
        await db.executescript("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                hashed_password TEXT NOT NULL,
                plan TEXT DEFAULT 'free',
                analyses_today INTEGER DEFAULT 0,
                analyses_reset_date TEXT DEFAULT (date('now')),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS watchlist (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                symbol TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id),
                UNIQUE(user_id, symbol)
            );

            CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
            CREATE INDEX IF NOT EXISTS idx_watchlist_user_id ON watchlist(user_id);
            CREATE INDEX IF NOT EXISTS idx_watchlist_symbol ON watchlist(symbol);

            CREATE TABLE IF NOT EXISTS journal_settings (
                user_id INTEGER PRIMARY KEY,
                starting_capital REAL NOT NULL DEFAULT 25000,
                currency TEXT NOT NULL DEFAULT 'USD',
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            );

            CREATE TABLE IF NOT EXISTS journal_trades (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                symbol TEXT NOT NULL,
                side TEXT NOT NULL CHECK(side IN ('long', 'short')),
                qty REAL NOT NULL,
                entry_price REAL NOT NULL,
                exit_price REAL,
                entry_date TEXT NOT NULL,
                exit_date TEXT,
                fees REAL NOT NULL DEFAULT 0,
                strategy TEXT,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            );

            CREATE INDEX IF NOT EXISTS idx_journal_trades_user_id ON journal_trades(user_id);
            CREATE INDEX IF NOT EXISTS idx_journal_trades_entry_date ON journal_trades(entry_date);
        """)
        await db.commit()
        logger.info("✅ Database schema initialized")
