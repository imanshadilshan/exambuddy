"""
Google OAuth Token Verification
Uses Google's userinfo endpoint to verify access tokens and retrieve user info.
This works with the implicit flow (`flow: 'implicit'`) from @react-oauth/google.
"""
import urllib.request
import urllib.error
import json
from typing import Optional


def verify_google_token(access_token: str) -> Optional[dict]:
    """
    Verify a Google access token by calling Google's userinfo endpoint.
    
    Returns dict with keys: google_id, email, full_name, picture, email_verified
    Returns None if the token is invalid or the request fails.
    """
    try:
        req = urllib.request.Request(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        with urllib.request.urlopen(req, timeout=5) as response:
            data = json.loads(response.read().decode())

        email = data.get("email")
        if not email:
            return None

        return {
            "google_id": data.get("sub", ""),
            "email": email,
            "full_name": data.get("name", ""),
            "picture": data.get("picture", ""),
            "email_verified": data.get("email_verified", False),
        }
    except (urllib.error.HTTPError, urllib.error.URLError, Exception):
        return None
