import json
import os
import sys
from typing import Any

import joblib
import numpy as np
import pandas as pd
import torch
import torch.nn as nn

# 프로젝트 루트를 Python 경로에 추가
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))


# ==========================================
# 모델 아키텍처 (기존 코드 유지)
# ==========================================
class SEBlock(nn.Module):
    def __init__(self, dim, reduction=4):
        super().__init__()
        bottleneck_dim = max(16, dim // reduction)
        self.fc = nn.Sequential(
            nn.Linear(dim, bottleneck_dim, bias=False),
            nn.SiLU(),
            nn.Linear(bottleneck_dim, dim, bias=False),
            nn.Sigmoid(),
        )

    def forward(self, x):
        return x * self.fc(x)


class AdvancedResidualBlock(nn.Module):
    def __init__(self, dim, dropout_rate):
        super().__init__()
        self.norm1 = nn.BatchNorm1d(dim)
        self.activation = nn.SiLU()
        self.linear1 = nn.Linear(dim, dim)
        self.norm2 = nn.BatchNorm1d(dim)
        self.linear2 = nn.Linear(dim, dim)
        self.se = SEBlock(dim)
        self.dropout = nn.Dropout(dropout_rate)

    def forward(self, x):
        residual = x
        out = self.norm1(x)
        out = self.activation(out)
        out = self.linear1(out)
        out = self.dropout(out)
        out = self.norm2(out)
        out = self.activation(out)
        out = self.linear2(out)
        out = self.se(out)
        return residual + out


class Predictor(nn.Module):
    def __init__(self, input_dim, fixed_feat=7, num_blocks=3, dropout_rate=0.4, feature_drop_rate=0.04):
        super().__init__()
        self.fixed_cols = fixed_feat
        self.feature_dropout = nn.Dropout1d(p=feature_drop_rate)
        self.input_norm = nn.BatchNorm1d(input_dim)

        hidden_dim = input_dim * 2
        self.stem = nn.Sequential(nn.Linear(input_dim, hidden_dim), nn.SiLU())

        self.stage1 = nn.ModuleList([AdvancedResidualBlock(hidden_dim, dropout_rate) for _ in range(num_blocks)])

        mid_dim = max(hidden_dim // 6, 64)
        self.transition = nn.Sequential(nn.Linear(hidden_dim, mid_dim), nn.BatchNorm1d(mid_dim), nn.SiLU())

        self.stage2 = nn.ModuleList([AdvancedResidualBlock(mid_dim, dropout_rate / 2) for _ in range(num_blocks - 1)])

        self.classifier = nn.Sequential(
            nn.Linear(mid_dim, mid_dim // 2), nn.SiLU(), nn.Dropout(dropout_rate / 4), nn.Linear(mid_dim // 2, 4)
        )

        self._init_weights()

    def _init_weights(self):
        for m in self.modules():
            if isinstance(m, nn.Linear):
                nn.init.kaiming_normal_(m.weight, mode="fan_out", nonlinearity="relu")
            elif isinstance(m, nn.BatchNorm1d):
                nn.init.constant_(m.weight, 1)
                nn.init.constant_(m.bias, 0)

    def forward(self, x):
        x = self.input_norm(x)
        x = self.stem(x)
        for block in self.stage1:
            x = block(x)
        x = self.transition(x)
        for block in self.stage2:
            x = block(x)
        return self.classifier(x)


# ==========================================
# HealthPredictor 클래스
# ==========================================
class HealthPredictor:
    def __init__(self):
        self.model_save_path = os.path.join(os.path.dirname(__file__), "checkpoints")
        self.input_dim = 127
        self.n_splits = 7
        self.disease_names = ["당뇨병", "고혈압", "심혈관질환", "뇌졸중"]

        # 전처리 객체들 로드
        try:
            self.scaler, self.encoder, self.feature_cols, self.encoding_cols = self._load_preprocessing_artifacts()
        except Exception as e:
            print(f"Warning: Could not load preprocessing artifacts: {e}")
            self.scaler = None
            self.encoder = None
            self.feature_cols = []
            self.encoding_cols = []

    def _load_preprocessing_artifacts(self):
        """학습 시 저장한 전처리 객체들을 로드"""
        scaler = joblib.load(os.path.join(self.model_save_path, "scaler.pkl"))
        encoder = joblib.load(os.path.join(self.model_save_path, "encoder.joblib"))

        with open(os.path.join(self.model_save_path, "feature_columns.json"), encoding="utf-8") as f:
            feature_cols = json.load(f)

        with open(os.path.join(self.model_save_path, "encoding_cols.json"), encoding="utf-8") as f:
            encoding_cols = json.load(f)

        return scaler, encoder, feature_cols, encoding_cols

    def _convert_survey_to_dataframe(self, survey_data: dict[str, Any]) -> pd.DataFrame:
        """설문 데이터를 모델 입력 형태로 변환"""
        df_data = {
            "age": [survey_data["age"]],
            "gender": [1 if survey_data["gender"] == "male" else 2],
            "height": [survey_data["height"]],
            "weight": [survey_data["weight"]],
            "systolic_bp": [survey_data["systolic_bp"]],
            "diastolic_bp": [survey_data["diastolic_bp"]],
            "cholesterol": [survey_data["cholesterol"]],
            "glucose": [survey_data["glucose"]],
            "smoking": [2 if survey_data["smoking"] else 1],
            "alcohol": [2 if survey_data["alcohol"] else 1],
            "exercise": [survey_data["exercise"]],
        }

        # BMI 계산
        height_m = survey_data["height"] / 100
        bmi = survey_data["weight"] / (height_m**2)
        df_data["bmi"] = [bmi]

        return pd.DataFrame(df_data)

    def _preprocess_input(self, raw_df):
        """원본 DataFrame을 모델 입력 형태로 전처리"""
        if self.scaler is None:
            # 테스트용 더미 데이터 반환
            return np.random.randn(1, self.input_dim).astype(np.float32)

        # 이진 컬럼 변환 (1→0, 2→1)
        binary_cols = [col for col in raw_df.columns if set(raw_df[col].dropna().unique()) <= {1, 2}]
        for col in binary_cols:
            raw_df[col] = raw_df[col].replace({1: 0, 2: 1})

        # 원핫 인코딩 (학습된 encoder 사용)
        ohe_target_cols = self.encoding_cols
        if ohe_target_cols:
            raw_df[ohe_target_cols] = raw_df[ohe_target_cols].astype(str)
            encoded_array = self.encoder.transform(raw_df[ohe_target_cols])
            encoded_col_names = self.encoder.get_feature_names_out(ohe_target_cols)
            encoded_df = pd.DataFrame(encoded_array, columns=encoded_col_names, index=raw_df.index)
            raw_df = pd.concat([raw_df.drop(columns=ohe_target_cols), encoded_df], axis=1)

        # 피처 순서 정렬 (누락된 컬럼은 0으로 채움)
        for col in self.feature_cols:
            if col not in raw_df.columns:
                raw_df[col] = 0

        x = raw_df[self.feature_cols]

        # 스케일링
        x_scaled = self.scaler.transform(x).astype(np.float32)

        return x_scaled

    def _inference(self, x_scaled, temperature=0.44):
        """가중 앙상블 추론 (테스트용 더미 구현)"""
        # 실제 모델 파일이 없을 때 더미 결과 반환
        if not os.path.exists(self.model_save_path):
            return {
                "predictions": np.array([[0, 0, 0, 0]]),
                "probabilities": np.array([[0.2, 0.3, 0.1, 0.15]]),
                "thresholds_used": np.array([0.5, 0.5, 0.5, 0.5]),
                "weights_applied": np.array([1.0]),
            }

        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

        x_tensor = torch.from_numpy(x_scaled).float()
        if x_tensor.ndim == 1:
            x_tensor = x_tensor.unsqueeze(0)
        x_tensor = x_tensor.to(device)

        # 아티팩트 로드
        valid_folds, f2_scores = [], []
        for fold in range(1, self.n_splits + 1):
            path = os.path.join(self.model_save_path, f"fold{fold}_artifact.pth")
            if not os.path.exists(path):
                continue
            cp_meta = torch.load(path, map_location=device, weights_only=False)
            f2_scores.append(cp_meta["val_f2"])
            valid_folds.append(fold)
            del cp_meta

        if not f2_scores:
            return {
                "predictions": np.array([[0, 0, 0, 0]]),
                "probabilities": np.array([[0.2, 0.3, 0.1, 0.15]]),
                "thresholds_used": np.array([0.5, 0.5, 0.5, 0.5]),
                "weights_applied": np.array([1.0]),
            }

        # 가중치 계산
        f2_tensor = torch.tensor(f2_scores)
        weights = torch.nn.functional.softmax(f2_tensor / temperature, dim=0).numpy()

        # 앙상블 추론
        total_probs = np.zeros((x_tensor.size(0), 4))
        collected_thresholds = []

        model = Predictor(self.input_dim).to(device)
        model.eval()

        with torch.no_grad():
            for idx, fold_num in enumerate(valid_folds):
                path = os.path.join(self.model_save_path, f"fold{fold_num}_artifact.pth")
                checkpoint = torch.load(path, map_location=device, weights_only=False)
                model.load_state_dict(checkpoint["state_dict"])

                probs = torch.sigmoid(model(x_tensor)).cpu().numpy()
                total_probs += probs * weights[idx]

                current_thresholds = np.array(checkpoint["thresholds"])
                collected_thresholds.append(current_thresholds * weights[idx])
                del checkpoint

        final_thresholds = np.sum(collected_thresholds, axis=0)
        final_preds = (total_probs >= final_thresholds).astype(int)

        return {
            "predictions": final_preds,
            "probabilities": total_probs,
            "thresholds_used": final_thresholds,
            "weights_applied": weights,
        }

    def _generate_recommendations(self, predictions, probabilities, survey_data):
        """예측 결과 기반 건강 권장사항 생성"""
        recommendations = []

        # 기본 건강 관리 권장사항
        recommendations.append("규칙적인 운동과 균형 잡힌 식단을 유지하세요.")

        # 위험 요인별 권장사항
        if survey_data.get("smoking", False):
            recommendations.append("금연을 강력히 권장합니다.")

        if survey_data.get("exercise", 0) < 3:
            recommendations.append("주 3회 이상 규칙적인 운동을 시작하세요.")

        if survey_data.get("systolic_bp", 0) > 140 or survey_data.get("diastolic_bp", 0) > 90:
            recommendations.append("혈압 관리를 위해 염분 섭취를 줄이고 정기 검진을 받으세요.")

        if survey_data.get("cholesterol", 0) > 240:
            recommendations.append("콜레스테롤 수치 관리를 위해 포화지방 섭취를 줄이세요.")

        if survey_data.get("glucose", 0) > 126:
            recommendations.append("혈당 관리를 위해 당분 섭취를 조절하고 정기 검진을 받으세요.")

        # 예측된 위험 질환별 권장사항
        for _i, (disease, pred) in enumerate(zip(self.disease_names, predictions[0], strict=False)):
            if pred == 1:
                recommendations.append(f"{disease} 위험이 높으니 전문의 상담을 받으시기 바랍니다.")

        return recommendations

    async def predict(self, survey_data: dict[str, Any]) -> HealthPredictionResult:
        """건강 위험도 예측 메인 함수"""
        try:
            # 1. 설문 데이터를 DataFrame으로 변환
            df = self._convert_survey_to_dataframe(survey_data)

            # 2. 전처리
            x_scaled = self._preprocess_input(df)

            # 3. 추론
            result = self._inference(x_scaled)

            # 4. 결과 해석
            predictions = result["predictions"]
            probabilities = result["probabilities"]

            # 전체 위험도 점수 계산 (평균 확률)
            risk_score = float(np.mean(probabilities[0]))

            # 위험도 등급 결정
            if risk_score < 0.3:
                risk_level = "낮음"
            elif risk_score < 0.6:
                risk_level = "보통"
            else:
                risk_level = "높음"

            # 권장사항 생성
            recommendations = self._generate_recommendations(predictions, probabilities, survey_data)

            # 신뢰도 계산 (가중치 기반)
            confidence = float(np.mean(result["weights_applied"]))

            return HealthPredictionResult(
                risk_score=risk_score,
                risk_level=risk_level,
                recommendations=recommendations,
                confidence=confidence,
            )

        except Exception as e:
            raise Exception(f"건강 예측 중 오류 발생: {e!s}") from e
