import secrets
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # AI Provider: auto (Ollama first), ollama, gemini, or anthropic
    ai_provider: str = "auto"
    ollama_base_url: str = "http://127.0.0.1:11434"
    ollama_model: str = "llama3:latest"
    anthropic_api_key: str = ""
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.5-flash"
    anthropic_model: str = "claude-3-5-sonnet-20241022"
    
    # JWT Settings - use secure random if not provided
    jwt_secret: str = ""
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 10080
    
    # Database
    database_url: str = "./iqt.db"
    
    # CORS
    cors_origins: str = "http://localhost:3000"
    
    # Interactive Brokers (IB Gateway / TWS)
    ibkr_host: str = "127.0.0.1"
    ibkr_port: int = 4002          # 4002 paper gateway, 4001 live gateway, 7497 TWS paper
    ibkr_client_id: int = 10
    ibkr_account: str = ""           # optional; defaults to first managed account

    # Legacy Alpaca (unused when IBKR is primary)
    alpaca_api_key: str = ""
    alpaca_secret_key: str = ""
    alpaca_base_url: str = "https://paper-api.alpaca.markets"
    alpaca_data_url: str = "https://data.alpaca.markets"
    
    # Logging
    log_level: str = "INFO"
    
    # Server
    server_host: str = "0.0.0.0"
    server_port: int = 8000

    # LEAN (QuantConnect local backtests on Mac via Docker)
    lean_workspace_dir: str = "./lean_workspace"
    lean_cli_path: str = ""
    lean_backtest_timeout_seconds: int = 900

    class Config:
        env_file = ".env"

    def __init__(self, **data):
        super().__init__(**data)
        # Generate secure JWT secret if not provided
        if not self.jwt_secret:
            self.jwt_secret = secrets.token_urlsafe(32)
        # Validate at least one AI provider is available
        provider = (self.ai_provider or "auto").strip().lower()
        if provider in ("gemini",) and not self.gemini_api_key:
            raise ValueError("AI_PROVIDER=gemini requires GEMINI_API_KEY")
        if provider in ("anthropic",) and not self.anthropic_api_key:
            raise ValueError("AI_PROVIDER=anthropic requires ANTHROPIC_API_KEY")
        if provider not in ("ollama", "auto", "gemini", "anthropic"):
            raise ValueError("AI_PROVIDER must be auto, ollama, gemini, or anthropic")
        if provider == "auto" and not self.gemini_api_key and not self.anthropic_api_key:
            pass  # Ollama is the default local provider


settings = Settings()
