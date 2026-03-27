from pydantic import BaseModel


class PredictionTask(BaseModel):
    task_id: str
    survey_data: dict


class PredictionResult(BaseModel):
    task_id: str
    DJ8_pre: int
    DI1_pre: int
    DE1_pre: int
    DI2_pre: int
