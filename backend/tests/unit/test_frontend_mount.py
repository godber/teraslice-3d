import importlib
import logging

import app.main as main_module


def _mounted_names(app):
    return {getattr(route, "name", None) for route in app.routes}


def test_frontend_not_mounted_when_dist_missing(tmp_path, monkeypatch, caplog):
    """Missing frontend/dist (dev mode) must not crash app import."""
    monkeypatch.chdir(tmp_path)  # ../frontend/dist is resolved relative to cwd
    with caplog.at_level(logging.WARNING):
        reloaded = importlib.reload(main_module)
    assert "frontend" not in _mounted_names(reloaded.app)
    assert "not serving the static frontend" in caplog.text


def test_frontend_mounted_when_dist_exists(tmp_path, monkeypatch):
    backend_dir = tmp_path / "backend"
    dist = tmp_path / "frontend" / "dist"
    backend_dir.mkdir()
    dist.mkdir(parents=True)
    (dist / "index.html").write_text("<html></html>")
    monkeypatch.chdir(backend_dir)
    reloaded = importlib.reload(main_module)
    assert "frontend" in _mounted_names(reloaded.app)


def teardown_module(module):
    # Restore the module to its normal state for other tests.
    importlib.reload(main_module)
