FROM python:3.13-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

COPY pyproject.toml uv.lock ./

# base 의존성(redis 등) + ai 그룹 함께 설치
RUN uv sync --group ai --no-dev --frozen

COPY ./ai_worker ./ai_worker

ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

CMD ["/app/.venv/bin/python", "-m", "ai_worker.main"]
