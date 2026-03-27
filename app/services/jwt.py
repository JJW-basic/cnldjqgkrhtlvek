from typing import Any, Literal, overload

from fastapi import HTTPException

from app.utils.jwt.exceptions import ExpiredTokenError, TokenError
from app.utils.jwt.tokens import AccessToken, RefreshToken


class JwtService:
    access_token_class = AccessToken
    refresh_token_class = RefreshToken

    def create_access_token(self, payload: dict[str, Any]) -> AccessToken:
        return self.access_token_class.for_payload(payload)

    def create_refresh_token(self, payload: dict[str, Any]) -> RefreshToken:
        return self.refresh_token_class.for_payload(payload)

    @overload
    def verify_jwt(self, token: str, token_type: Literal["access"]) -> AccessToken: ...

    @overload
    def verify_jwt(self, token: str, token_type: Literal["refresh"]) -> RefreshToken: ...

    def verify_jwt(self, token: str, token_type: Literal["access", "refresh"]) -> AccessToken | RefreshToken:
        token_class: type[AccessToken | RefreshToken] = (
            self.access_token_class if token_type == "access" else self.refresh_token_class
        )
        try:
            return token_class(token=token)
        except ExpiredTokenError as err:
            raise HTTPException(status_code=401, detail=f"{token_type} token has expired.") from err
        except TokenError as err:
            raise HTTPException(status_code=400, detail="Provided invalid token.") from err

    def refresh_jwt(self, refresh_token: str) -> AccessToken:
        return self.verify_jwt(token=refresh_token, token_type="refresh").access_token

    def issue_jwt_pair(self, payload: dict[str, Any]) -> dict[str, AccessToken | RefreshToken]:
        rt = self.create_refresh_token(payload)
        return {"access_token": rt.access_token, "refresh_token": rt}
