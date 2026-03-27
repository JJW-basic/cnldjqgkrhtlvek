from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import ORJSONResponse as Response

from app.dtos.prediction import PredictionRequest, PredictionStatusResponse
from app.services.prediction import PredictionService

prediction_router = APIRouter(prefix="/prediction", tags=["prediction"])


@prediction_router.post("/", status_code=status.HTTP_202_ACCEPTED)
async def submit_prediction(
    request: PredictionRequest,
    service: Annotated[PredictionService, Depends(PredictionService)],
) -> Response:
    task_id = service.enqueue(request.survey_data)
    return Response(content={"task_id": task_id}, status_code=status.HTTP_202_ACCEPTED)


@prediction_router.get("/{task_id}", response_model=PredictionStatusResponse)
async def get_prediction_result(
    task_id: str,
    service: Annotated[PredictionService, Depends(PredictionService)],
) -> Response:
    result = service.get_result(task_id)
    if result is None:
        return Response(
            content=PredictionStatusResponse(task_id=task_id, status="pending").model_dump(),
        )
    if "error" in result:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=result["error"])
    return Response(
        content=PredictionStatusResponse(task_id=task_id, status="completed", result=result).model_dump(),
    )
