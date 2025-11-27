FROM python:3.10-slim

WORKDIR /app

# Install system dependencies required for building some python packages
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
# We install torch CPU version explicitly to save space if sentence-transformers pulls in heavy cuda version by default
RUN pip install --no-cache-dir \
    opensearch-py \
    sentence-transformers \
    scikit-learn \
    numpy \
    tqdm \
    python-dotenv

# Copy the module code
COPY . /app

# Set environment variables to ensure python output is unbuffered
ENV PYTHONUNBUFFERED=1

# Run the initialization script
CMD ["python", "initialize_opensearch.py"]
