from pydantic import BaseModel


class PredictionRequest(BaseModel):
    survey_data: dict


class PredictionStatusResponse(BaseModel):
    task_id: str
    status: str  # "pending" | "completed" | "error"
    result: dict | None = None
