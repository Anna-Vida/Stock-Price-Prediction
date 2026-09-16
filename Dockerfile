FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 HOST=0.0.0.0 PORT=5500
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt && useradd --create-home appuser
COPY server.py analytics.py crypto_api.py index.html crypto.html app.js styles.css supabase-config.js ./
COPY public/crypto/dashboard.js ./public/crypto/dashboard.js
USER appuser
EXPOSE 5500
CMD ["python", "server.py"]
