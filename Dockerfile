FROM python:3.10-slim

ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Set working directory to /app
WORKDIR /app

# Copy requirements from root (where it actually is)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the entire backend folder
COPY ./backend .

# Set the default command to run the server
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]