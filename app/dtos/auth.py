from pydantic import BaseModel


class OAuthLoginResponse(BaseModel):
    access_token: str
    provider: str
    sub: str


class TokenRefreshResponse(BaseModel):
    access_token: str
