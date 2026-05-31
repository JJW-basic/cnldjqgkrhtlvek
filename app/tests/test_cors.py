import pytest
from app.core.config import Config, Env

def test_allowed_origins_format():
    config = Config()
    origins = config.ALLOWED_ORIGINS
    
    # 1. ALLOWED_ORIGINS must be a list
    assert isinstance(origins, list), "CORS ALLOWED_ORIGINS must be a list of strings"
    assert len(origins) > 0, "CORS ALLOWED_ORIGINS must not be empty"

    for origin in origins:
        assert isinstance(origin, str), f"Origin '{origin}' must be a string"
        # 2. Must start with http:// or https:// (or match "*" exactly)
        if origin != "*":
            assert origin.startswith("http://") or origin.startswith("https://"), \
                f"CORS origin '{origin}' must start with http:// or https://"
            
            # 3. Must not end with a trailing slash (FastAPI CORS matching requirement)
            assert not origin.endswith("/"), \
                f"CORS origin '{origin}' must not end with a trailing slash '/' as it breaks FastAPI CORS matching"

def test_prod_allowed_origins_matches_cookie_domain():
    config = Config()
    
    # 4. If in production environment, check if COOKIE_DOMAIN matches ALLOWED_ORIGINS
    if config.ENV == Env.PROD:
        cookie_domain = config.COOKIE_DOMAIN
        
        # Strip leading dot if any (.duckdns.org -> duckdns.org)
        clean_cookie_domain = cookie_domain.lstrip(".")
        
        # At least one origin in ALLOWED_ORIGINS should match the cookie domain
        domain_matched = False
        for origin in config.ALLOWED_ORIGINS:
            if clean_cookie_domain in origin:
                domain_matched = True
                break
                
        assert domain_matched, \
            f"Production COOKIE_DOMAIN '{cookie_domain}' must be included in ALLOWED_ORIGINS: {config.ALLOWED_ORIGINS}"
