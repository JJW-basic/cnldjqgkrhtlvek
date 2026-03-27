from pydantic import BaseModel


class OAuthLoginResponse(BaseModel):
    access_token: str
    provider: str
    sub: str
    expires_in: int  # access_token 유효 시간 (초 단위)


class TokenRefreshResponse(BaseModel):
    access_token: str
    expires_in: int  # access_token 유효 시간 (초 단위)
