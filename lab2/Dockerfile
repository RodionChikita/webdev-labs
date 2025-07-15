FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY app/ ./app/

ENV PYTHONPATH=/app
ENV FLASK_APP=app.py
ENV FLASK_ENV=production

EXPOSE 8000

WORKDIR /app/app

CMD ["python", "app.py"] 