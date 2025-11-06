# settings.py
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # Database
    DATABASE_URL: str

    # API
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    DEBUG: bool = False

    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FILE: str = "logs/app.log"

    # Detection
    DETECTION_THRESHOLD: float = 0.3
    SMOOTHING_FRAMES: int = 3
    DETECTION_INTERVAL: int = 5  # Process every N frames
    MIN_PROCESS_INTERVAL: float = 0.5  # Min seconds between processing

    # Config 
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False
    )

settings = Settings()
