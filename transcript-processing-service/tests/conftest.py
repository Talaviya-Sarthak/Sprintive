import os
import pytest
from app.core.config import settings

@pytest.fixture(autouse=True)
def test_environment(monkeypatch):
    """Ensure test environment defaults to local storage."""
    monkeypatch.setattr(settings, "STORAGE_TYPE", "local")
