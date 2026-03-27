import json
import uuid

import redis

from app.core.config import Config

config = Config()

TASK_QUEUE = "prediction_queue"


class PredictionService:
    def __init__(self) -> None:
        self._redis = redis.Redis(
            host=config.REDIS_HOST,
            port=config.REDIS_PORT,
            decode_responses=True,
        )

    def enqueue(self, survey_data: dict) -> str:
        task_id = str(uuid.uuid4())
        payload = json.dumps({"task_id": task_id, "survey_data": survey_data})
        self._redis.lpush(TASK_QUEUE, payload)
        return task_id

    def get_result(self, task_id: str) -> dict | None:
        raw = self._redis.get(f"result:{task_id}")
        if raw is None:
            return None
        return json.loads(raw)
