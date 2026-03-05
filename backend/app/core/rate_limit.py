from slowapi import Limiter
from slowapi.util import get_remote_address

# Initialize Rate Limiter
# 100/minute is a sensible global default to prevent basic flooding
limiter = Limiter(key_func=get_remote_address, default_limits=["100/minute"])
