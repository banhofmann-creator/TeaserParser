"""Application configuration from environment variables."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # PostgreSQL
    postgres_host: str = "localhost"
    postgres_port: int = 5432
    postgres_db: str = "teaserparser"
    postgres_user: str = "teaserparser"
    postgres_password: str = "teaserparser"

    # Auth
    session_secret: str = "change-me-to-a-random-string"

    # LLM
    openrouter_api_key: str = ""
    llm_mock: bool = False

    # PowerBI
    powerbi_embed_url: str = ""

    # File uploads
    upload_dir: str = "/app/uploads"

    @property
    def database_url(self) -> str:
        return (
            f"postgresql://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
