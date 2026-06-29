from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
APP_DIR = BACKEND_DIR / "app"
DATA_DIR = BACKEND_DIR / "data"
MODELS_DIR = BACKEND_DIR / "models"
SKILLS_DIR = BACKEND_DIR / "skills"
PROTECTED_SKILLS_DIR = SKILLS_DIR / "_protected"
USER_SKILLS_DIR = SKILLS_DIR / "user"
I18N_DIR = BACKEND_DIR / "i18n"
AUDIT_LOG = DATA_DIR / "agent_audit.jsonl"

DATA_DIR.mkdir(exist_ok=True)
MODELS_DIR.mkdir(exist_ok=True)
USER_SKILLS_DIR.mkdir(parents=True, exist_ok=True)

DB_PATH = DATA_DIR / "openchat.db"