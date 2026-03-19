#!/usr/bin/env python3

import hashlib
import json
import os
import sys
import time
from http.cookies import SimpleCookie

from ytmusicapi import YTMusic

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
        error("Falta query.")

    query = sys.argv[1].strip()
    if not query:
        error("Query vacia.")

    limit = 12
    if len(sys.argv) > 2:
        try:
            limit = max(1, min(20, int(sys.argv[2])))
        except ValueError:
            limit = 12

    cookie = get_env("YTMUSIC_COOKIE")
    if not cookie:
        error("Falta YTMUSIC_COOKIE.")

    user_agent = get_env(
        "YTMUSIC_USER_AGENT",
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    )
    account_id = get_env("YTMUSIC_ACCOUNT_ID")

    ytm = YTMusic(auth=json.dumps(build_auth_headers(cookie, user_agent)), user=account_id or None)
    results = ytm.search(query, filter="songs", limit=limit, ignore_spelling=True)

    songs = []
    for item in results:
        video_id = item.get("videoId")
        title = item.get("title")
        if not video_id or not title:
            continue

        artists = []
        for artist in item.get("artists", []):
            if not isinstance(artist, dict):
                continue
            name = artist.get("name")
            if not name:
                continue
            artists.append(
                {
                    "name": name,
                    "id": artist.get("id"),
                }
            )

        album_name = None
        album = item.get("album")
        if isinstance(album, dict):
            album_name = album.get("name")

        thumbnails = item.get("thumbnails") or []
        thumbnail_url = None
        if thumbnails and isinstance(thumbnails, list):
            last_thumb = thumbnails[-1]
            if isinstance(last_thumb, dict):
                thumbnail_url = last_thumb.get("url")

        songs.append(
            {
                "videoId": video_id,
                "title": title,
                "artists": artists,
                "album": album_name,
                "duration": item.get("duration"),
                "thumbnailUrl": thumbnail_url,
            }
        )

    print(json.dumps({"ok": True, "songs": songs}))


if __name__ == "__main__":
    main()
