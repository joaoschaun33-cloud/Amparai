# Use Python 3.11 slim image
FROM python:3.11-slim

# Force stdout/stderr streams to be unbuffered to allow immediate logging
ENV PYTHONUNBUFFERED True

ENV APP_HOME /app
WORKDIR $APP_HOME

# Copy files and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source code
COPY . .

# Run the API server with uvicorn on container startup
CMD exec uvicorn server:app --host 0.0.0.0 --port $PORT
