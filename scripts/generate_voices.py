"""
One-off generator: produces the god-voice audio files under static/voices/.

Not run at request time — the site's dialogue is a fixed, enumerable set
(6 riddles x 3 presenters, 6 intro lines, 3 Olympus messages, 3 Underworld
messages), so every line is pre-rendered once here rather than calling a
TTS service on every visitor's page load.

Pipeline: gTTS (a real internet text-to-speech service, Google's) renders
the base speech using a different regional accent per character (real
voice variation from the source, not post-processing) — Zeus/Poseidon/
Athena/Hades each hit a different Google Translate TTS endpoint. Only a
very small amount of ffmpeg pitch adjustment is layered on top; the first
version of this script pitch-shifted aggressively (+18%/-25%) and it came
out sounding like chipmunks — formant-dragging pitch shift is only
convincing in small doses.

Requires: pip install gTTS, and ffmpeg on PATH (or set FFMPEG_PATH below).
"""

import os
import sys
import subprocess

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app import RIDDLES, PRESENTERS, OLYMPUS_MESSAGES, UNDERWORLD_MESSAGES  # noqa: E402

from gtts import gTTS  # noqa: E402

FFMPEG = os.environ.get(
    "FFMPEG_PATH",
    r"C:\Users\pc\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.1.2-full_build\bin\ffmpeg.exe",
)

OUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static", "voices")
TMP_DIR = os.path.join(os.environ.get("TEMP", "."), "voice_gen_tmp")
os.makedirs(OUT_DIR, exist_ok=True)
os.makedirs(TMP_DIR, exist_ok=True)

# tld picks a different Google Translate TTS regional voice/accent per
# character — real source variation. rate is now a *subtle* ffmpeg
# pitch nudge only (never above ~6%), just enough to add a little weight
# without crossing into artifact/chipmunk territory.
VOICE_PROFILES = {
    "zeus":     {"tld": "co.uk",  "rate": 0.96, "extra": ""},
    "poseidon": {"tld": "com.au", "rate": 0.94, "extra": ""},
    "athena":   {"tld": "co.in",  "rate": 1.0,  "extra": ""},
    "hades":    {"tld": "co.za",  "rate": 0.90, "extra": ",aecho=0.5:0.4:60:0.2"},
}


def gtts_base(text, tmp_path, tld):
    tts = gTTS(text=text, lang="en", tld=tld, slow=False)
    tts.save(tmp_path)


def pitch_shift(src_path, dst_path, profile):
    rate = profile["rate"]
    if rate == 1.0 and not profile["extra"]:
        # no processing requested — plain re-encode, zero risk of artifacts
        subprocess.run(
            [FFMPEG, "-y", "-i", src_path, "-codec:a", "libmp3lame", "-b:a", "96k", dst_path],
            check=True, capture_output=True,
        )
        return
    tempo = round(1.0 / rate, 4)
    # atempo must be within [0.5, 2.0] per ffmpeg's filter limits — fine here.
    filt = f"asetrate=44100*{rate},aresample=44100,atempo={tempo}{profile['extra']}"
    subprocess.run(
        [FFMPEG, "-y", "-i", src_path, "-af", filt, "-codec:a", "libmp3lame", "-b:a", "96k", dst_path],
        check=True, capture_output=True,
    )


def make(text, voice_key, out_name):
    out_path = os.path.join(OUT_DIR, out_name)
    profile = VOICE_PROFILES[voice_key]
    if os.path.exists(out_path):
        os.remove(out_path)  # always regenerate — profiles may have changed
    tmp_path = os.path.join(TMP_DIR, f"base_{voice_key}.mp3")
    print("generating:", out_name, "<-", text[:60])
    gtts_base(text, tmp_path, profile["tld"])
    pitch_shift(tmp_path, out_path, profile)


def main():
    # Riddles: each read by all three presenters
    for rid, riddle in enumerate(RIDDLES):
        for presenter in PRESENTERS:
            make(riddle["question"], presenter["key"], f"riddle_{rid}_{presenter['key']}.mp3")

    # Intro lines: one per presenter per intro index
    for presenter in PRESENTERS:
        for i, line in enumerate(presenter["intros"]):
            make(line, presenter["key"], f"intro_{presenter['key']}_{i}.mp3")

    # Olympus outcome messages (Zeus voice)
    for i, msg in enumerate(OLYMPUS_MESSAGES):
        make(msg, "zeus", f"olympus_{i}.mp3")

    # Underworld outcome messages (Hades voice)
    for i, msg in enumerate(UNDERWORLD_MESSAGES):
        make(msg, "hades", f"underworld_{i}.mp3")

    print("Done.")


if __name__ == "__main__":
    main()
