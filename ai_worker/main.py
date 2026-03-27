import asyncio
import json
import os

import redis

from ai_worker.models.chronic_predictor import ChronicDiseasePredictor
from ai_worker.schemas import PredictionResult, PredictionTask

REDIS_HOST = os.getenv("REDIS_HOST", "redis")
REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))
TASK_QUEUE = "prediction_queue"
RESULT_TTL = int(os.getenv("TASK_RESULT_TTL", "3600"))

predictor = ChronicDiseasePredictor()


async def process_task(task: PredictionTask) -> None:
    r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)
    result_key = f"result:{task.task_id}"
    try:
        prediction = await predictor.predict(task.survey_data)
        result = PredictionResult(task_id=task.task_id, **prediction)
        r.setex(result_key, RESULT_TTL, result.model_dump_json())
        print(f"[Worker] Task {task.task_id} 완료: {prediction}")
    except Exception as e:
        error_payload = json.dumps({"error": str(e)})
        r.setex(result_key, RESULT_TTL, error_payload)
        print(f"[Worker] Task {task.task_id} 오류: {e}")


def run_worker() -> None:
    r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)
    print(f"[Worker] Redis {REDIS_HOST}:{REDIS_PORT} 연결 완료. 큐 대기 중...")
    while True:
        try:
            item = r.brpop(TASK_QUEUE, timeout=5)
            if item is None:
                continue
            _, raw = item
            task = PredictionTask.model_validate_json(raw)
            asyncio.run(process_task(task))
        except Exception as e:
            print(f"[Worker] 루프 오류: {e}")


if __name__ == "__main__":
    run_worker()
