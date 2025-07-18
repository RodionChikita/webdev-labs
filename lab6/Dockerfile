FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY app/ .

RUN mkdir -p media/images

ENV FLASK_APP=app.py
ENV FLASK_ENV=production

COPY init_container.py .
COPY create_migration.py .
COPY create_test_course.py .
COPY create_test_reviews.py .

EXPOSE 5001

CMD ["sh", "-c", "python init_container.py && flask run --host=0.0.0.0 --port=5001"] 