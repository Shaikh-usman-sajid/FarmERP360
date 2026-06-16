from pydantic_settings import BaseSettings
from typing import List
import json


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://farmerp360_user:farmerp360_secret_2024@localhost:5432/farmerp360"
    REDIS_URL: str = "redis://:farmerp360_redis_2024@localhost:6379/0"
    SECRET_KEY: str = "farmerp360_jwt_super_secret_key_change_in_production_2024"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    ENVIRONMENT: str = "development"
    CORS_ORIGINS: str = '["http://localhost:3000","http://localhost","http://127.0.0.1:3000"]'
    UPLOAD_DIR: str = "./uploads"
    MAX_FILE_SIZE: int = 10485760
    APP_NAME: str = "FarmERP360"
    VERSION: str = "1.0.0"

    @property
    def cors_origins_list(self) -> List[str]:
        return json.loads(self.CORS_ORIGINS)

    class Config:
        env_file = ".env"


settings = Settings()
