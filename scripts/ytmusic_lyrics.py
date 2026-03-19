#!/usr/bin/env python3

import hashlib
import json
import os
import sys
import time
from http.cookies import SimpleCookie

from ytmusicapi import YTMusic
from ytmusicapi.exceptions import YTMusicServerError

YTM_DOMAIN = "https://music.youtube.com"


def error(message: str) -> None:
    print(json.dumps({"ok": False, "error": message}))
    raise SystemExit(1)


def get_env(name: str, default: str = "") -> str:
    return (os.environ.get(name) or default).strip()


def extract_cookie_value(cookie_header: str, name: str) -> str | None:
    cookie = SimpleCookie()
    cookie.load(cookie_header.replace('"', ""))
    morsel = cookie.get(name)
    return morsel.value if morsel else None


def build_auth_headers(cookie_header: str, user_agent: str) -> dict[str, str]:
    sapisid = extract_cookie_value(cookie_header, "__Secure-3PAPISID") or extract_cookie_value(cookie_header, "SAPISID")
    if not sapisid:
        error("La cookie no contiene __Secure-3PAPISID ni SAPISID.")

    timestamp = str(int(time.time()))
    digest = hashlib.sha1(f"{timestamp} {sapisid} {YTM_DOMAIN}".encode("utf-8")).hexdigest()

    return {
        "authorization": f"SAPISIDHASH {timestamp}_{digest}",
        "cookie": cookie_header,
        "origin": YTM_DOMAIN,
        "x-origin": YTM_DOMAIN,
        "user-agent": user_agent,
    }


def main() -> None:
    if len(sys.argv) < 2:
        error("Falta videoId.")

    video_id = sys.argv[1].strip()
    if not video_id:
        error("videoId vacio.")

    cookie = get_env("YTMUSIC_COOKIE")
    if not cookie:
        error("Falta YTMUSIC_COOKIE.")

    user_agent = get_env(
        "YTMUSIC_USER_AGENT",
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    )
    account_id = get_env("YTMUSIC_ACCOUNT_ID")

    ytm = YTMusic(auth=json.dumps(build_auth_headers(cookie, user_agent)), user=account_id or None)
    watch = ytm.get_watch_playlist(videoId=video_id, limit=1)
    lyrics_browse_id = watch.get("lyrics")

    if not lyrics_browse_id:
        print(
            json.dumps(
                {
                    "ok": True,
                    "found": False,
                    "hasTimestamps": False,
                    "lyrics": None,
                    "source": None,
                }
            )
        )
        return

    lyrics_payload = None
    has_timestamps = False

    try:
        lyrics_payload = ytm.get_lyrics(lyrics_browse_id, timestamps=True)
        has_timestamps = bool(lyrics_payload and lyrics_payload.get("hasTimestamps"))
    except YTMusicServerError:
        lyrics_payload = None
        has_timestamps = False

    if not lyrics_payload or not has_timestamps:
        lyrics_payload = ytm.get_lyrics(lyrics_browse_id, timestamps=False)
        has_timestamps = False

    if not lyrics_payload:
        print(
            json.dumps(
                {
                    "ok": True,
                    "found": False,
                    "hasTimestamps": False,
                    "lyrics": None,
                    "source": None,
                    "browseId": lyrics_browse_id,
                }
            )
        )
        return

    raw_lyrics = lyrics_payload.get("lyrics")

    if has_timestamps and isinstance(raw_lyrics, list):
        lyrics = [
            {
                "text": line.text,
                "startTime": line.start_time,
                "endTime": line.end_time,
                "id": line.id,
            }
            for line in raw_lyrics
        ]
    else:
        lyrics = raw_lyrics if isinstance(raw_lyrics, str) else None

    print(
        json.dumps(
            {
                "ok": True,
                "found": bool(lyrics),
                "browseId": lyrics_browse_id,
                "hasTimestamps": has_timestamps,
                "lyrics": lyrics,
                "source": lyrics_payload.get("source"),
            }
        )
    )


if __name__ == "__main__":
    main()
