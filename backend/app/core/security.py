import hashlib
import secrets

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError

# argon2-cffi defaults follow RFC 9106 recommendations and use Argon2id.
_hasher = PasswordHasher()

# Used to spend the same time verifying a password when the e-mail does not exist,
# so response timing does not reveal which e-mails have an account.
_DUMMY_HASH = _hasher.hash("campushub-timing-equalizer")


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password: str, password_hash: str | None) -> bool:
    try:
        return _hasher.verify(password_hash or _DUMMY_HASH, password) and password_hash is not None
    except (VerificationError, InvalidHashError):
        return False


def password_needs_rehash(password_hash: str) -> bool:
    return _hasher.check_needs_rehash(password_hash)


def generate_session_token() -> str:
    """256 bits of randomness, URL-safe. This is what the cookie carries."""
    return secrets.token_urlsafe(32)


def hash_session_token(token: str) -> str:
    """Only this hash is stored: a database leak does not leak usable sessions."""
    return hashlib.sha256(token.encode()).hexdigest()
