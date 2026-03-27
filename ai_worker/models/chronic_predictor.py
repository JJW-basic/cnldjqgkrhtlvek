import json
import os
import sys
from typing import Any

import joblib
import numpy as np
import pandas as pd
import torch
import torch.nn as nn

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))


# ==========================================
# 모델 아키텍처
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
# ChronicDiseasePredictor
# ==========================================
class ChronicDiseasePredictor:
    def __init__(self):
        self.model_save_path = os.path.join(os.path.dirname(__file__), "checkpoints")
        self.input_dim = 127
        self.n_splits = 7
        self.disease_codes = ["DJ8_pre", "DI1_pre", "DE1_pre", "DI2_pre"]

        self.feature_order = [
            "sex",
            "age",
            "cfam",
            "genertn",
            "house",
            "live_t",
            "marri_1",
            "fam_rela",
            "tins",
            "npins",
            "D_1_1",
            "D_2_1",
            "M_2_yr",
            "BH9_11",
            "BH1",
            "BH2_61",
            "LQ4_00",
            "LQ1_sb",
            "LQ2_ab",
            "AC1_yr",
            "MH1_yr",
            "MO1_wk",
            "educ",
            "EC1_1",
            "EC_lgw_2",
            "BO1",
            "BO1_1",
            "BO2_1",
            "BD1_11",
            "BD2_1",
            "BD2_31",
            "BD7_4",
            "BD7_5",
            "BA2_12",
            "BA2_13",
            "BA2_14",
            "BP1",
            "BP7",
            "BS1_1",
            "BS12_37",
            "BS12_1",
            "BS8_2",
            "BS9_2",
            "BS13",
            "BE3_71",
            "BE3_81",
            "BE3_91",
            "BE3_75",
            "BE3_85",
            "BE8_1",
            "BE3_31",
            "BE5_1",
            "HE_fh",
            "HE_ht",
            "HE_wt",
            "HE_wc",
            "OR1",
            "O_pain",
            "O_ortho",
            "BM1_0",
            "BM7",
            "BM8",
            "OR1_2",
            "MO4_00",
            "BM14",
            "E_Q_EX",
            "L_BR_FQ",
            "L_LN_FQ",
            "L_DN_FQ",
            "L_OUT_FQ",
            "LS_VEG1",
            "LS_VEG2",
            "LS_FRUIT",
            "LS_1YR",
            "LK_EDU",
            "LK_LB_CO",
            "N_DIET",
            "N_DUSUAL",
            "N_WAT_C",
            "LF_SAFE",
        ]

        try:
            self.scaler, self.encoder, self.feature_cols, self.encoding_cols = self._load_preprocessing_artifacts()
        except Exception as e:
            print(f"Warning: Could not load preprocessing artifacts: {e}")
            self.scaler = None
            self.encoder = None
            self.feature_cols = []
            self.encoding_cols = []

    def _load_preprocessing_artifacts(self):
        scaler = joblib.load(os.path.join(self.model_save_path, "scaler.pkl"))
        encoder = joblib.load(os.path.join(self.model_save_path, "encoder.joblib"))

        with open(os.path.join(self.model_save_path, "feature_columns.json"), encoding="utf-8") as f:
            feature_cols = json.load(f)

        with open(os.path.join(self.model_save_path, "encoding_cols.json"), encoding="utf-8") as f:
            encoding_cols = json.load(f)

        return scaler, encoder, feature_cols, encoding_cols

    def _convert_survey_to_dataframe(self, survey_data: dict[str, Any]) -> pd.DataFrame:
        df_data = {}
        # 80개 피처 + encoding_cols에 있는 추가 컬럼(LF_SAFE 등)
        all_needed_cols = set(self.feature_order)
        if self.encoding_cols:
            all_needed_cols.update(self.encoding_cols)
        for feature in all_needed_cols:
            df_data[feature] = [survey_data.get(feature, 0)]
        return pd.DataFrame(df_data)

    def _preprocess_input(self, raw_df):
        if self.scaler is None:
            return np.random.randn(1, self.input_dim).astype(np.float32)

        # encoding_cols 순서대로 인코더에 전달
        ohe_target_cols = self.encoding_cols
        if ohe_target_cols:
            for col in ohe_target_cols:
                if col not in raw_df.columns:
                    raw_df[col] = 0
            raw_df[ohe_target_cols] = raw_df[ohe_target_cols].astype(str)
            encoded_array = self.encoder.transform(raw_df[ohe_target_cols])
            encoded_col_names = self.encoder.get_feature_names_out(ohe_target_cols)
            encoded_df = pd.DataFrame(encoded_array, columns=encoded_col_names, index=raw_df.index)
            raw_df = pd.concat([raw_df.drop(columns=ohe_target_cols), encoded_df], axis=1)

        # feature_cols에 있지만 DataFrame에 없는 컬럼을 0으로 채움
        for col in self.feature_cols:
            if col not in raw_df.columns:
                raw_df[col] = 0

        x = raw_df[self.feature_cols]
        return self.scaler.transform(x).astype(np.float32)

    def _inference(self, x_scaled, temperature=0.44):
        if not os.path.exists(self.model_save_path):
            return {
                "predictions": np.array([[0, 1, 0, 0]]),
                "probabilities": np.array([[0.2, 0.7, 0.3, 0.4]]),
            }

        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        x_tensor = torch.from_numpy(x_scaled).float()
        if x_tensor.ndim == 1:
            x_tensor = x_tensor.unsqueeze(0)
        x_tensor = x_tensor.to(device)

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
                "predictions": np.array([[0, 1, 0, 0]]),
                "probabilities": np.array([[0.2, 0.7, 0.3, 0.4]]),
            }

        f2_tensor = torch.tensor(f2_scores)
        weights = torch.nn.functional.softmax(f2_tensor / temperature, dim=0).numpy()

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
                collected_thresholds.append(np.array(checkpoint["thresholds"]) * weights[idx])
                del checkpoint

        final_thresholds = np.sum(collected_thresholds, axis=0)
        final_preds = (total_probs >= final_thresholds).astype(int)

        return {
            "predictions": final_preds,
            "probabilities": total_probs,
        }

    async def predict(self, survey_data: dict[str, Any]) -> dict[str, Any]:
        """만성질환 예측 - 프론트엔드 기대 형식(0/1)으로 반환"""
        try:
            df = self._convert_survey_to_dataframe(survey_data)
            x_scaled = self._preprocess_input(df)
            result = self._inference(x_scaled)

            predictions = result["predictions"][0]

            return {
                "DJ8_pre": int(predictions[0]),
                "DI1_pre": int(predictions[1]),
                "DE1_pre": int(predictions[2]),
                "DI2_pre": int(predictions[3]),
            }

        except Exception as e:
            raise Exception(f"만성질환 예측 중 오류 발생: {e!s}") from e
