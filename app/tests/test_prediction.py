from fastapi.testclient import TestClient

from app.dependencies.security import get_request_user
from app.main import app
from app.services.prediction import PredictionService


# Mock user for overriding dependency
def mock_get_request_user():
    return {"sub": "test_user_id"}

class MockPredictionService:
    def enqueue(self, survey_data: dict) -> str:
        return "mock_task_id"

    def get_result(self, task_id: str) -> dict | None:
        if task_id == "mock_task_id":
            return {"DJ8_pre": 1, "DI1_pre": 0, "DE1_pre": 0, "DI2_pre": 0}
        elif task_id == "error_task_id":
            return {"error": "Some internal error"}
        return None

app.dependency_overrides[get_request_user] = mock_get_request_user
app.dependency_overrides[PredictionService] = MockPredictionService

client = TestClient(app)

def test_submit_prediction():
    payload = {
        "survey_data": {
            "age": 45,
            "sex": 1,
            "height": 170.5,
            "weight": 70.0,
            "BMI": 24.1,
            "HE_HP": 1
        }
    }
    response = client.post("/api/v1/prediction/", json=payload)
    assert response.status_code == 202
    assert "task_id" in response.json()
    assert response.json()["task_id"] == "mock_task_id"

def test_get_prediction_result_pending():
    response = client.get("/api/v1/prediction/unknown_task_id")
    assert response.status_code == 200
    assert response.json() == {
        "task_id": "unknown_task_id",
        "status": "pending",
        "result": None
    }

def test_get_prediction_result_completed():
    response = client.get("/api/v1/prediction/mock_task_id")
    assert response.status_code == 200
    assert response.json() == {
        "task_id": "mock_task_id",
        "status": "completed",
        "result": {
            "DJ8_pre": 1,
            "DI1_pre": 0,
            "DE1_pre": 0,
            "DI2_pre": 0
        }
    }

def test_get_prediction_result_error():
    response = client.get("/api/v1/prediction/error_task_id")
    assert response.status_code == 500
    assert response.json() == {"detail": "Some internal error"}
