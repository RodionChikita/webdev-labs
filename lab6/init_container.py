#!/usr/bin/env python3
"""Скрипт инициализации контейнера."""

import os
import subprocess

def run_command(command, cwd=None):
    """Выполняет команду в оболочке."""
    try:
        result = subprocess.run(
            command, 
            shell=True, 
            cwd=cwd,
            check=True,
            capture_output=True,
            text=True
        )
        return result.stdout
    except subprocess.CalledProcessError:
        return None

def init_database():
    """Инициализирует базу данных с миграциями и тестовыми данными."""
    if os.path.exists("project.db"):
        return
    
    run_command("python create_migration.py")
    run_command("python init_db.py")
    run_command("python create_test_course.py")
    run_command("python create_test_reviews.py")

if __name__ == "__main__":
    os.environ["FLASK_APP"] = "app.py"
    init_database() 