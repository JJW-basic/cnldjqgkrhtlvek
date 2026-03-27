from pydantic import BaseModel


class OAuthCallbackRequest(BaseModel):
    code: str
    state: str | None = None


class OAuthLoginResponse(BaseModel):
    access_token: str


class TokenRefreshResponse(OAuthLoginResponse): ...
