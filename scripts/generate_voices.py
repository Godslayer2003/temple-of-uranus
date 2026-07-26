"""
One-off generator: produces the god-voice audio files under static/voices/.

Not run at request time — the site's dialogue is a fixed, enumerable set
(6 riddles x 3 presenters, 6 intro lines, 3 Olympus messages, 3 Underworld
messages), so every line is pre-rendered once here rather than calling a
TTS service on every visitor's page load.

Pipeline: gTTS (a real internet text-to-speech service, Google's) renders
the base speech, then ffmpeg pitch-shifts it per character so Zeus,
Poseidon, Athena, and Hades don't all sound identical.

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

# (asetrate multiplier, extra ffmpeg audio filter chain suffix)
VOICE_PROFILES = {
    "zeus": {"rate": 0.88, "extra": ""},
    "poseidon": {"rate": 0.80, "extra": ""},
    "athena": {"rate": 1.18, "extra": ""},
    "hades": {"rate": 0.75, "extra": ",aecho=0.6:0.5:60:0.25"},
}


def gtts_base(text, tmp_path):
    tts = gTTS(text=text, lang="en", tld="co.uk", slow=False)
    tts.save(tmp_path)


def pitch_shift(src_path, dst_path, profile):
    rate = profile["rate"]
    tempo = round(1.0 / rate, 4)
    # atempo must be within [0.5, 2.0] per ffmpeg's filter limits — fine here.
    filt = f"asetrate=44100*{rate},aresample=44100,atempo={tempo}{profile['extra']}"
    subprocess.run(
        [FFMPEG, "-y", "-i", src_path, "-af", filt, "-codec:a", "libmp3lame", "-b:a", "96k", dst_path],
        check=True, capture_output=True,
    )


def make(text, voice_key, out_name):
    out_path = os.path.join(OUT_DIR, out_name)
    if os.path.exists(out_path):
        print("skip (exists):", out_name)
        return
    tmp_path = os.path.join(TMP_DIR, "base.mp3")
    print("generating:", out_name, "<-", text[:60])
    gtts_base(text, tmp_path)
    pitch_shift(tmp_path, out_path, VOICE_PROFILES[voice_key])


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
